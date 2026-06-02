import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  createInitialGameState,
  normalizeState
} from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import type { Prisma } from "@/lib/generated/prisma/client";

const GUEST_COOKIE = "pixel_relic_guest";
const SAVE_SLOT = 1;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type GuestRecord = {
  id: string;
  guestKey: string;
  displayName: string;
};

type SaveMeta = {
  id: string;
  version: number;
  updatedAt: Date;
};

export async function loadGameStateForPage(): Promise<GameState> {
  const fallback = createInitialGameState();

  try {
    const guest = await getCurrentGuest();
    if (!guest) {
      return withDbState(fallback, {
        connected: false,
        message: "ゲストログインでDB自動保存を開始できます。"
      });
    }

    const prisma = getPrismaClient();
    const save = await prisma.gameSave.findUnique({
      where: {
        guestUserId_slot: {
          guestUserId: guest.id,
          slot: SAVE_SLOT
        }
      },
      select: {
        id: true,
        version: true,
        updatedAt: true,
        state: true
      }
    });

    if (!save) {
      return withDbState(fallback, {
        connected: true,
        guestUserId: guest.id,
        displayName: guest.displayName,
        message: "ゲストログイン済み。最初の行動でDBセーブを作成します。"
      });
    }

    return withDbState(stateFromJson(save.state, fallback), {
      connected: true,
      guestUserId: guest.id,
      displayName: guest.displayName,
      saveId: save.id,
      saveVersion: save.version,
      lastSavedAt: save.updatedAt.toISOString(),
      message: "DBセーブを読み込みました。"
    });
  } catch (error) {
    return withDbState(fallback, {
      connected: false,
      message: `DB読込失敗: ${errorMessage(error)}`
    });
  }
}

export async function guestLogin(previousState: GameState): Promise<GameState> {
  const state = normalizeState(structuredClone(previousState));

  try {
    const cookieStore = await cookies();
    const prisma = getPrismaClient();
    const currentKey = cookieStore.get(GUEST_COOKIE)?.value;
    let guest = currentKey
      ? await prisma.guestUser.findUnique({
          where: { guestKey: currentKey },
          select: { id: true, guestKey: true, displayName: true }
        })
      : null;

    if (!guest) {
      const guestKey = randomUUID();
      guest = await prisma.guestUser.create({
        data: {
          guestKey,
          displayName: `ゲスト-${guestKey.slice(0, 4).toUpperCase()}`
        },
        select: { id: true, guestKey: true, displayName: true }
      });
    } else {
      await prisma.guestUser.update({
        where: { id: guest.id },
        data: { displayName: guest.displayName }
      });
    }

    cookieStore.set(GUEST_COOKIE, guest.guestKey, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    const existingSave = await prisma.gameSave.findUnique({
      where: {
        guestUserId_slot: {
          guestUserId: guest.id,
          slot: SAVE_SLOT
        }
      },
      select: {
        id: true,
        version: true,
        updatedAt: true,
        state: true
      }
    });

    if (existingSave) {
      return withDbState(stateFromJson(existingSave.state, state), {
        connected: true,
        guestUserId: guest.id,
        displayName: guest.displayName,
        saveId: existingSave.id,
        saveVersion: existingSave.version,
        lastSavedAt: existingSave.updatedAt.toISOString(),
        message: "ゲストログイン完了。DBセーブを読み込みました。"
      });
    }

    const save = await persistForGuest(guest, state);
    await recordEvent(guest.id, "guestLogin", state);

    return withDbState(state, {
      connected: true,
      guestUserId: guest.id,
      displayName: guest.displayName,
      saveId: save.id,
      saveVersion: save.version,
      lastSavedAt: save.updatedAt.toISOString(),
      message: "ゲストログイン完了。DB自動保存を開始しました。"
    });
  } catch (error) {
    return withDbState(state, {
      connected: false,
      message: `ゲストログイン失敗: ${errorMessage(error)}`
    });
  }
}

export async function persistGameStateForCurrentGuest(
  nextState: GameState,
  eventType: string
): Promise<GameState> {
  const state = normalizeState(structuredClone(nextState));

  try {
    const guest = await getCurrentGuest();
    if (!guest) {
      return withDbState(state, {
        connected: false,
        message: "ゲストログインでDB自動保存を開始できます。"
      });
    }

    const save = await persistForGuest(guest, state);
    await recordEvent(guest.id, eventType, state);

    return withDbState(state, {
      connected: true,
      guestUserId: guest.id,
      displayName: guest.displayName,
      saveId: save.id,
      saveVersion: save.version,
      lastSavedAt: save.updatedAt.toISOString(),
      message: "DBへ自動保存しました。"
    });
  } catch (error) {
    return withDbState(state, {
      connected: false,
      message: `DB保存失敗: ${errorMessage(error)}`
    });
  }
}

async function getCurrentGuest(): Promise<GuestRecord | null> {
  const cookieStore = await cookies();
  const guestKey = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestKey) {
    return null;
  }

  const prisma = getPrismaClient();
  return prisma.guestUser.findUnique({
    where: { guestKey },
    select: { id: true, guestKey: true, displayName: true }
  });
}

async function persistForGuest(
  guest: GuestRecord,
  state: GameState
): Promise<SaveMeta> {
  const prisma = getPrismaClient();
  const existing = await prisma.gameSave.findUnique({
    where: {
      guestUserId_slot: {
        guestUserId: guest.id,
        slot: SAVE_SLOT
      }
    },
    select: { version: true }
  });
  const version = (existing?.version ?? 0) + 1;
  const saveData = savePayload(state, version);

  return prisma.gameSave.upsert({
    where: {
      guestUserId_slot: {
        guestUserId: guest.id,
        slot: SAVE_SLOT
      }
    },
    create: {
      guestUserId: guest.id,
      slot: SAVE_SLOT,
      ...saveData
    },
    update: saveData,
    select: {
      id: true,
      version: true,
      updatedAt: true
    }
  });
}

async function recordEvent(
  guestUserId: string,
  type: string,
  state: GameState
): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.gameEvent.create({
    data: {
      guestUserId,
      type,
      message: state.lastAction.message || type,
      payload: toJson(summaryPayload(state))
    }
  });
}

function savePayload(state: GameState, version: number) {
  return {
    version,
    state: toJson(state),
    summary: toJson(summaryPayload(state)),
    playerName: state.player.name,
    level: state.player.level,
    gold: state.player.gold,
    location: state.location,
    view: state.view
  };
}

function summaryPayload(state: GameState) {
  return {
    phase: state.phase,
    view: state.view,
    location: state.location,
    floor: state.floor,
    day: state.day,
    turn: state.turn,
    player: {
      name: state.player.name,
      className: state.player.className,
      level: state.player.level,
      exp: state.player.exp,
      gold: state.player.gold,
      hp: state.player.hp,
      mp: state.player.mp
    },
    guild: state.guild,
    achievements: state.achievements.length,
    inventoryKinds: Object.keys(state.player.inventory).length,
    lastAction: state.lastAction
  };
}

function stateFromJson(value: unknown, fallback: GameState): GameState {
  try {
    return normalizeState(JSON.parse(JSON.stringify(value)) as GameState);
  } catch {
    return normalizeState(structuredClone(fallback));
  }
}

function withDbState(
  state: GameState,
  db: GameState["db"]
): GameState {
  const normalized = normalizeState(structuredClone(state));
  return {
    ...normalized,
    db: {
      ...normalized.db,
      ...db
    }
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

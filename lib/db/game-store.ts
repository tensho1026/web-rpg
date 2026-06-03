import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  createInitialGameState,
  normalizeState
} from "@/lib/game/engine";
import type { GameState, GameView } from "@/lib/game/types";
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

type SaveRecord = SaveMeta & {
  state: unknown;
};

type LoadedState = {
  state: GameState;
  save?: SaveMeta;
  message: string;
};

export async function loadGameStateForPage(view?: GameView): Promise<GameState> {
  const fallback = createInitialGameState();

  try {
    const guest = await getCurrentGuest();
    if (!guest) {
      return withRouteView(withDbState(fallback, {
        connected: false,
        message: "ゲストログインでDB自動保存を開始できます。"
      }), view);
    }

    const loaded = await loadStateForGuest(guest, fallback);

    if (!loaded) {
      return withRouteView(withDbState(fallback, {
        connected: true,
        guestUserId: guest.id,
        displayName: guest.displayName,
        message: "ゲストログイン済み。最初の行動でDBセーブを作成します。"
      }), view);
    }

    return withRouteView(withDbState(loaded.state, {
      connected: true,
      guestUserId: guest.id,
      displayName: guest.displayName,
      saveId: loaded.save?.id,
      saveVersion: loaded.save?.version,
      lastSavedAt: loaded.save?.updatedAt.toISOString(),
      message: loaded.message
    }), view);
  } catch (error) {
    return withRouteView(withDbState(fallback, {
      connected: false,
      message: `DB読込失敗: ${errorMessage(error)}`
    }), view);
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

    const loaded = await loadStateForGuest(guest, state);

    if (loaded) {
      return withDbState(loaded.state, {
        connected: true,
        guestUserId: guest.id,
        displayName: guest.displayName,
        saveId: loaded.save?.id,
        saveVersion: loaded.save?.version,
        lastSavedAt: loaded.save?.updatedAt.toISOString(),
        message: `ゲストログイン完了。${loaded.message}`
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

async function loadStateForGuest(
  guest: GuestRecord,
  fallback: GameState
): Promise<LoadedState | null> {
  const prisma = getPrismaClient();
  const [
    save,
    runtime,
    profile,
    inventory,
    equipmentSlots,
    equipmentMeta,
    skills,
    quests,
    discoveries,
    collections,
    storyFlags
  ] = await Promise.all([
    prisma.gameSave.findUnique({
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
    }),
    prisma.playerRuntime.findUnique({ where: { guestUserId: guest.id } }),
    prisma.playerProfile.findUnique({ where: { guestUserId: guest.id } }),
    prisma.playerInventory.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerEquipmentSlot.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerEquipmentMeta.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerSkill.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerQuest.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerDiscovery.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerCollection.findMany({ where: { guestUserId: guest.id } }),
    prisma.playerStoryFlag.findMany({ where: { guestUserId: guest.id } })
  ]);

  if (runtime && profile) {
    return {
      state: stateFromNormalized(fallback, {
        runtime,
        profile,
        inventory,
        equipmentSlots,
        equipmentMeta,
        skills,
        quests,
        discoveries,
        collections,
        storyFlags
      }),
      save: saveMeta(save),
      message: "DBテーブルから読み込みました。"
    };
  }

  if (save) {
    return {
      state: stateFromJson(save.state, fallback),
      save: saveMeta(save),
      message: "DBスナップショットから読み込みました。"
    };
  }

  return null;
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
  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.gameSave.upsert({
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
    }),
    ...normalizedStateWriteOperations(prisma, guest.id, state)
  ];

  const [save] = await prisma.$transaction(operations);
  return save as SaveMeta;
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

function normalizedStateWriteOperations(
  prisma: ReturnType<typeof getPrismaClient>,
  guestUserId: string,
  state: GameState
): Prisma.PrismaPromise<unknown>[] {
  const player = state.player;
  const inventory = Object.entries(player.inventory)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => ({ guestUserId, itemId, qty }));
  const equipmentSlots = Object.entries(player.equipment)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([slot, itemId]) => ({ guestUserId, slot, itemId }));
  const equipmentMeta = Object.entries(player.equipmentMeta).map(([itemId, meta]) => ({
    guestUserId,
    itemId,
    refinement: meta.refinement,
    durability: meta.durability,
    meta: toJson(meta)
  }));
  const skills = Object.entries(player.skills).map(([skillId, level]) => ({
    guestUserId,
    skillId,
    level
  }));
  const quests = state.quests.map((quest) => ({
    guestUserId,
    questId: quest.id,
    type: quest.type,
    title: quest.title,
    description: quest.description,
    progress: quest.progress,
    target: quest.target,
    rewardGold: quest.rewardGold,
    rewardItemId: quest.rewardItemId,
    rewardExp: quest.rewardExp,
    completed: quest.completed
  }));
  const discoveries = [
    ...uniqueRows("enemy", state.discoveredEnemies),
    ...uniqueRows("item", state.discoveredItems)
  ].map((entry) => ({ guestUserId, ...entry }));
  const collections = [
    ...uniqueRows("achievement", state.achievements),
    ...uniqueRows("title", state.titles),
    ...uniqueRows("pet", state.pets),
    ...uniqueRows("mount", state.mounts)
  ].map((entry) => ({ guestUserId, ...entry }));
  const storyFlags = Object.entries(state.storyFlags).map(([flag, value]) => ({
    guestUserId,
    flag,
    value
  }));

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.playerRuntime.upsert({
      where: { guestUserId },
      create: {
        guestUserId,
        ...runtimePayload(state)
      },
      update: runtimePayload(state)
    }),
    prisma.playerProfile.upsert({
      where: { guestUserId },
      create: {
        guestUserId,
        ...profilePayload(state)
      },
      update: profilePayload(state)
    }),
    prisma.playerInventory.deleteMany({ where: { guestUserId } }),
    prisma.playerEquipmentSlot.deleteMany({ where: { guestUserId } }),
    prisma.playerEquipmentMeta.deleteMany({ where: { guestUserId } }),
    prisma.playerSkill.deleteMany({ where: { guestUserId } }),
    prisma.playerQuest.deleteMany({ where: { guestUserId } }),
    prisma.playerDiscovery.deleteMany({ where: { guestUserId } }),
    prisma.playerCollection.deleteMany({ where: { guestUserId } }),
    prisma.playerStoryFlag.deleteMany({ where: { guestUserId } })
  ];

  if (inventory.length > 0) {
    operations.push(prisma.playerInventory.createMany({ data: inventory }));
  }
  if (equipmentSlots.length > 0) {
    operations.push(prisma.playerEquipmentSlot.createMany({ data: equipmentSlots }));
  }
  if (equipmentMeta.length > 0) {
    operations.push(prisma.playerEquipmentMeta.createMany({ data: equipmentMeta }));
  }
  if (skills.length > 0) {
    operations.push(prisma.playerSkill.createMany({ data: skills }));
  }
  if (quests.length > 0) {
    operations.push(prisma.playerQuest.createMany({ data: quests }));
  }
  if (discoveries.length > 0) {
    operations.push(prisma.playerDiscovery.createMany({ data: discoveries }));
  }
  if (collections.length > 0) {
    operations.push(prisma.playerCollection.createMany({ data: collections }));
  }
  if (storyFlags.length > 0) {
    operations.push(prisma.playerStoryFlag.createMany({ data: storyFlags }));
  }

  return operations;
}

function runtimePayload(state: GameState) {
  return {
    phase: state.phase,
    view: state.view,
    location: state.location,
    floor: state.floor,
    day: state.day,
    turn: state.turn,
    forgeRank: state.forgeRank,
    alchemyRank: state.alchemyRank,
    battleSpeed: state.battleSpeed,
    autoBattle: state.autoBattle,
    loginBonusClaimedDay: state.loginBonusClaimedDay,
    gachaPity: state.gachaPity,
    guildName: state.guild.name,
    guildLevel: state.guild.level,
    guildContribution: state.guild.contribution,
    enemy: toJson(state.enemy),
    lastDrops: toJson(state.lastDrops),
    log: toJson(state.log),
    playHistory: toJson(state.playHistory),
    lastAction: toJson(state.lastAction)
  };
}

function profilePayload(state: GameState) {
  const player = state.player;
  return {
    name: player.name,
    classId: player.classId,
    className: player.className,
    level: player.level,
    exp: player.exp,
    expToNext: player.expToNext,
    hp: player.hp,
    mp: player.mp,
    base: toJson(player.base),
    gold: player.gold,
    stamina: player.stamina,
    maxStamina: player.maxStamina,
    rank: player.rank,
    awakening: player.awakening,
    evolution: player.evolution,
    limitBreak: player.limitBreak,
    skillPoints: player.skillPoints,
    title: player.title,
    activePet: player.activePet ?? null,
    activeMount: player.activeMount ?? null,
    statusEffects: toJson(player.statusEffects),
    passiveSkills: toJson(player.passiveSkills),
    skillTree: toJson(player.skillTree)
  };
}

function stateFromNormalized(
  fallback: GameState,
  records: {
    runtime: NonNullable<Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerRuntime"]["findUnique"]>>>;
    profile: NonNullable<Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerProfile"]["findUnique"]>>>;
    inventory: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerInventory"]["findMany"]>>;
    equipmentSlots: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerEquipmentSlot"]["findMany"]>>;
    equipmentMeta: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerEquipmentMeta"]["findMany"]>>;
    skills: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerSkill"]["findMany"]>>;
    quests: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerQuest"]["findMany"]>>;
    discoveries: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerDiscovery"]["findMany"]>>;
    collections: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerCollection"]["findMany"]>>;
    storyFlags: Awaited<ReturnType<ReturnType<typeof getPrismaClient>["playerStoryFlag"]["findMany"]>>;
  }
): GameState {
  const state = normalizeState(structuredClone(fallback));
  const { runtime, profile } = records;

  state.phase = runtime.phase as GameState["phase"];
  state.view = runtime.view as GameState["view"];
  state.location = runtime.location;
  state.floor = runtime.floor;
  state.day = runtime.day;
  state.turn = runtime.turn;
  state.forgeRank = runtime.forgeRank;
  state.alchemyRank = runtime.alchemyRank;
  state.battleSpeed = runtime.battleSpeed === 4 ? 4 : runtime.battleSpeed === 2 ? 2 : 1;
  state.autoBattle = runtime.autoBattle;
  state.loginBonusClaimedDay = runtime.loginBonusClaimedDay;
  state.gachaPity = runtime.gachaPity;
  state.guild = {
    name: runtime.guildName,
    level: runtime.guildLevel,
    contribution: runtime.guildContribution
  };
  state.enemy = fromJson(runtime.enemy, state.enemy);
  state.lastDrops = fromJson(runtime.lastDrops, []);
  state.log = fromJson(runtime.log, []);
  state.playHistory = fromJson(runtime.playHistory, []);
  state.lastAction = fromJson(runtime.lastAction, state.lastAction);

  state.player = {
    ...state.player,
    name: profile.name,
    classId: profile.classId,
    className: profile.className,
    level: profile.level,
    exp: profile.exp,
    expToNext: profile.expToNext,
    hp: profile.hp,
    mp: profile.mp,
    base: fromJson(profile.base, state.player.base),
    gold: profile.gold,
    stamina: profile.stamina,
    maxStamina: profile.maxStamina,
    rank: profile.rank,
    awakening: profile.awakening,
    evolution: profile.evolution,
    limitBreak: profile.limitBreak,
    skillPoints: profile.skillPoints,
    title: profile.title,
    activePet: profile.activePet ?? undefined,
    activeMount: profile.activeMount ?? undefined,
    statusEffects: fromJson(profile.statusEffects, []),
    passiveSkills: fromJson(profile.passiveSkills, []),
    skillTree: fromJson(profile.skillTree, {}),
    inventory: Object.fromEntries(
      records.inventory.map((entry) => [entry.itemId, entry.qty])
    ),
    equipment: Object.fromEntries(
      records.equipmentSlots.map((entry) => [entry.slot, entry.itemId])
    ) as GameState["player"]["equipment"],
    equipmentMeta: Object.fromEntries(
      records.equipmentMeta.map((entry) => [
        entry.itemId,
        fromJson(entry.meta, {
          refinement: entry.refinement,
          durability: entry.durability,
          sockets: [],
          randomOptions: []
        })
      ])
    ),
    skills: Object.fromEntries(
      records.skills.map((entry) => [entry.skillId, entry.level])
    )
  };
  state.quests = records.quests.map((quest) => ({
    id: quest.questId,
    type: quest.type as GameState["quests"][number]["type"],
    title: quest.title,
    description: quest.description,
    progress: quest.progress,
    target: quest.target,
    rewardGold: quest.rewardGold,
    rewardItemId: quest.rewardItemId,
    rewardExp: quest.rewardExp,
    completed: quest.completed
  }));
  state.discoveredEnemies = records.discoveries
    .filter((entry) => entry.kind === "enemy")
    .map((entry) => entry.refId);
  state.discoveredItems = records.discoveries
    .filter((entry) => entry.kind === "item")
    .map((entry) => entry.refId);
  state.achievements = collectionByKind(records.collections, "achievement");
  state.titles = collectionByKind(records.collections, "title");
  state.pets = collectionByKind(records.collections, "pet");
  state.mounts = collectionByKind(records.collections, "mount");
  state.storyFlags = Object.fromEntries(
    records.storyFlags.map((entry) => [entry.flag, entry.value])
  );

  return normalizeState(state);
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

function saveMeta(save: SaveRecord | null): SaveMeta | undefined {
  if (!save) {
    return undefined;
  }
  return {
    id: save.id,
    version: save.version,
    updatedAt: save.updatedAt
  };
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

function withRouteView(state: GameState, view?: GameView): GameState {
  if (!view) {
    return state;
  }
  const routed = normalizeState(structuredClone(state));
  routed.view = view;
  return routed;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function fromJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}

function uniqueRows(kind: string, values: string[]) {
  return [...new Set(values)].filter(Boolean).map((refId) => ({ kind, refId }));
}

function collectionByKind(
  entries: Array<{ kind: string; refId: string }>,
  kind: string
): string[] {
  return entries.filter((entry) => entry.kind === kind).map((entry) => entry.refId);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

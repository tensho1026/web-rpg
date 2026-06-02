"use server";

import {
  guestLogin,
  persistGameStateForCurrentGuest
} from "@/lib/db/game-store";
import { resolveGameCommand } from "@/lib/game/engine";
import type { GameState, GameView } from "@/lib/game/types";

export async function runGameCommand(
  previousState: GameState,
  formData: FormData
): Promise<GameState> {
  const type = String(formData.get("command") ?? "explore");

  if (type === "guestLogin") {
    return guestLogin(previousState);
  }

  const nextState = resolveGameCommand(previousState, {
    type,
    itemId: String(formData.get("itemId") ?? ""),
    recipeId: String(formData.get("recipeId") ?? ""),
    skillId: String(formData.get("skillId") ?? ""),
    targetView: String(formData.get("targetView") ?? "") as GameView,
    areaId: String(formData.get("areaId") ?? ""),
    value: String(formData.get("value") ?? ""),
    stateJson: String(formData.get("stateJson") ?? "")
  });

  return persistGameStateForCurrentGuest(nextState, type);
}

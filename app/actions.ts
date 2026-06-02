"use server";

import { resolveGameCommand } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

export async function runGameCommand(
  previousState: GameState,
  formData: FormData
): Promise<GameState> {
  return resolveGameCommand(previousState, {
    type: String(formData.get("command") ?? "explore"),
    itemId: String(formData.get("itemId") ?? ""),
    recipeId: String(formData.get("recipeId") ?? "")
  });
}

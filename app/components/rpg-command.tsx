"use client";

import type { ReactNode } from "react";
import type { GameState, GameView } from "@/lib/game/types";

export type CommandButtonProps = {
  action: (payload: FormData) => void;
  command: string;
  label: string;
  detail?: string;
  itemId?: string;
  recipeId?: string;
  skillId?: string;
  targetView?: GameView;
  areaId?: string;
  value?: string;
  disabled?: boolean;
  icon: ReactNode;
  compact?: boolean;
  onCommand?: () => void;
};

export function CommandButton({
  action,
  command,
  label,
  detail,
  itemId,
  recipeId,
  skillId,
  targetView,
  areaId,
  value,
  disabled,
  icon,
  compact,
  onCommand
}: CommandButtonProps) {
  return (
    <form action={action} className="command-form">
      <input type="hidden" name="command" value={command} />
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      {recipeId && <input type="hidden" name="recipeId" value={recipeId} />}
      {skillId && <input type="hidden" name="skillId" value={skillId} />}
      {targetView && <input type="hidden" name="targetView" value={targetView} />}
      {areaId && <input type="hidden" name="areaId" value={areaId} />}
      {value && <input type="hidden" name="value" value={value} />}
      <button
        type="submit"
        className={compact ? "command-button compact" : "command-button"}
        disabled={disabled}
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("rpg-command-sound", { detail: soundKind(command) })
          );
          onCommand?.();
        }}
      >
        <span className="button-icon">{icon}</span>
        <span className="button-copy">
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
    </form>
  );
}

function soundKind(command: string): GameState["lastAction"]["kind"] {
  if (command === "attack" || command === "autoBattle") {
    return "attack";
  }
  if (command === "skill") {
    return "skill";
  }
  if (command === "magic") {
    return "magic";
  }
  if (command === "item") {
    return "item";
  }
  if (command === "gacha" || command === "craft" || command === "alchemy" || command === "reroll") {
    return "loot";
  }
  return "town";
}

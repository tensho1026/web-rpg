import { notFound } from "next/navigation";
import { GamePage } from "@/app/game-page";
import type { GameView } from "@/lib/game/types";

const routeViews: GameView[] = [
  "adventure",
  "character",
  "inventory",
  "equipment",
  "craft",
  "shop",
  "quests",
  "codex",
  "guild",
  "gacha",
  "data"
];

export async function ViewRoutePage({
  params
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!routeViews.includes(view as GameView)) {
    notFound();
  }

  return <GamePage view={view as GameView} />;
}

import { RpgShell } from "@/app/components/rpg-shell";
import { loadGameStateForPage } from "@/lib/db/game-store";
import { loadMasterCatalog } from "@/lib/db/master-data";
import type { GameView } from "@/lib/game/types";

export async function GamePage({ view }: { view: GameView }) {
  const [initialState, catalog] = await Promise.all([
    loadGameStateForPage(view),
    loadMasterCatalog()
  ]);

  return <RpgShell initialState={initialState} catalog={catalog} />;
}

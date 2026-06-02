import { RpgShell } from "@/app/components/rpg-shell";
import { createInitialGameState } from "@/lib/game/engine";

export default function Home() {
  return <RpgShell initialState={createInitialGameState()} />;
}

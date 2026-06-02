import { RpgShell } from "@/app/components/rpg-shell";
import { loadGameStateForPage } from "@/lib/db/game-store";

export default async function Home() {
  const initialState = await loadGameStateForPage();
  return <RpgShell initialState={initialState} />;
}

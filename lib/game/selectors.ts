import { CLASSES, ITEM_BY_ID, ITEMS, RECIPES } from "@/lib/game/data";
import type { Item, PlayerState, Recipe, Stats } from "@/lib/game/types";

export function getItem(itemId: string): Item | undefined {
  return ITEM_BY_ID[itemId];
}

export function getPlayerStats(player: PlayerState): Stats {
  const stats: Stats = { ...player.base };
  const currentClass = CLASSES.find((entry) => entry.id === player.classId);
  if (currentClass?.stats) {
    applyStats(stats, currentClass.stats);
  }

  Object.values(player.equipment).forEach((itemId) => {
    if (!itemId) {
      return;
    }
    const item = ITEM_BY_ID[itemId];
    if (!item?.stats) {
      return;
    }
    applyStats(stats, item.stats);

    const meta = player.equipmentMeta?.[itemId];
    if (meta) {
      const refineStat = item.slot === "weapon" ? "atk" : "def";
      stats[refineStat] += meta.refinement * 2;
      stats.luck += Math.max(0, meta.refinement - 2);
      if (meta.enchant) {
        stats[meta.enchant.stat] += meta.enchant.value;
      }
      meta.randomOptions.forEach((option) => {
        stats[option.stat] += option.value;
      });
      meta.sockets.forEach((gemId) => {
        const gem = ITEM_BY_ID[gemId];
        if (gem?.gemStats) {
          applyStats(stats, gem.gemStats);
        }
      });
    }
  });

  if (Object.values(player.equipment).filter((itemId) => ITEM_BY_ID[itemId ?? ""]?.setId === "starfall").length >= 2) {
    stats.atk += 6;
    stats.luck += 6;
  }

  if (player.activePet) {
    applyStats(stats, ITEM_BY_ID[player.activePet]?.stats ?? {});
  }
  if (player.activeMount) {
    applyStats(stats, ITEM_BY_ID[player.activeMount]?.stats ?? {});
  }
  if (player.title === "lucky") {
    stats.luck += 2;
  }
  if (player.title === "star-seeker") {
    stats.atk += 2;
    stats.luck += 2;
  }
  if (player.passiveSkills?.includes("treasure-sense")) {
    stats.luck += 3;
  }
  stats.maxHp += player.awakening * 8 + player.limitBreak * 12 + player.rank * 2;
  stats.maxMp += player.awakening * 3;
  stats.atk += player.evolution * 2 + player.rank;
  stats.def += player.evolution + player.rank;

  stats.maxHp = Math.max(1, stats.maxHp);
  stats.maxMp = Math.max(0, stats.maxMp);
  stats.atk = Math.max(1, stats.atk);
  stats.def = Math.max(0, stats.def);
  stats.agi = Math.max(1, stats.agi);
  stats.luck = Math.max(0, stats.luck);
  return stats;
}

export function inventoryCount(player: PlayerState, itemId: string): number {
  return player.inventory[itemId] ?? 0;
}

export function canCraft(player: PlayerState, recipe: Recipe): boolean {
  return recipe.requires.every(
    (stack) => inventoryCount(player, stack.itemId) >= stack.qty
  );
}

export function visibleRecipes(level: number): Recipe[] {
  return RECIPES.filter((recipe) => recipe.unlockLevel <= level);
}

export function inventoryItems(player: PlayerState): Array<Item & { qty: number }> {
  return ITEMS.map((item) => ({ ...item, qty: inventoryCount(player, item.id) }))
    .filter((item) => item.qty > 0)
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category));
}

function applyStats(stats: Stats, patch: Partial<Stats>): void {
  Object.entries(patch).forEach(([key, value]) => {
    const statKey = key as keyof Stats;
    stats[statKey] += value ?? 0;
  });
}

function categoryOrder(category: Item["category"]): number {
  return {
    consumable: 1,
    weapon: 2,
    armor: 3,
    accessory: 4,
    material: 5,
    gem: 6,
    relic: 7,
    quest: 8,
    pet: 9,
    mount: 10
  }[category];
}

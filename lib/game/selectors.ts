import { ITEM_BY_ID, ITEMS, RECIPES } from "@/lib/game/data";
import type { Item, PlayerState, Recipe, Stats } from "@/lib/game/types";

export function getItem(itemId: string): Item | undefined {
  return ITEM_BY_ID[itemId];
}

export function getPlayerStats(player: PlayerState): Stats {
  const stats: Stats = { ...player.base };
  Object.values(player.equipment).forEach((itemId) => {
    if (!itemId) {
      return;
    }
    const item = ITEM_BY_ID[itemId];
    if (!item?.stats) {
      return;
    }
    Object.entries(item.stats).forEach(([key, value]) => {
      const statKey = key as keyof Stats;
      stats[statKey] += value ?? 0;
    });
  });
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

function categoryOrder(category: Item["category"]): number {
  return {
    consumable: 1,
    weapon: 2,
    armor: 3,
    accessory: 4,
    material: 5,
    relic: 6
  }[category];
}

import "server-only";

import { cache } from "react";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  ACHIEVEMENTS,
  CLASSES,
  ENEMIES,
  GACHA_POOL,
  ITEMS,
  MAP_AREAS,
  RECIPES,
  SHOP_ITEMS,
  STARTING_QUESTS,
  SKILLS,
  TITLES,
  WARP_POINTS
} from "@/lib/game/data";
import type { GameCatalog } from "@/lib/game/catalog";
import type {
  CharacterClass,
  EnemyTemplate,
  Item,
  MapArea,
  Quest,
  Recipe,
  Skill,
  WarpPoint
} from "@/lib/game/types";

export const loadMasterCatalog = cache(async (): Promise<GameCatalog> => {
  try {
    const prisma = getPrismaClient();
    const [
      items,
      enemies,
      recipes,
      skills,
      classes,
      shopItems,
      mapAreas,
      warpPoints,
      startingQuests,
      achievements,
      titles,
      gachaPool
    ] = await Promise.all([
      prisma.itemMaster.findMany({ orderBy: { id: "asc" } }),
      prisma.enemyMaster.findMany({ orderBy: [{ minFloor: "asc" }, { level: "asc" }] }),
      prisma.recipeMaster.findMany({ orderBy: [{ unlockLevel: "asc" }, { id: "asc" }] }),
      prisma.skillMaster.findMany({ orderBy: [{ unlockLevel: "asc" }, { id: "asc" }] }),
      prisma.classMaster.findMany({ orderBy: [{ unlockLevel: "asc" }, { id: "asc" }] }),
      prisma.shopItemMaster.findMany({ orderBy: { itemId: "asc" } }),
      prisma.mapAreaMaster.findMany({ orderBy: [{ floor: "asc" }, { id: "asc" }] }),
      prisma.warpPointMaster.findMany({ orderBy: [{ unlockFloor: "asc" }, { id: "asc" }] }),
      prisma.questTemplateMaster.findMany({ orderBy: { id: "asc" } }),
      prisma.achievementMaster.findMany({ orderBy: { id: "asc" } }),
      prisma.titleMaster.findMany({ orderBy: { id: "asc" } }),
      prisma.gachaPoolMaster.findMany({ orderBy: { itemId: "asc" } })
    ]);

    if (items.length === 0) {
      return fallbackCatalog();
    }

    return buildCatalog({
      items: items.map((entry) => entry.raw as unknown as Item),
      enemies: enemies.map((entry) => entry.raw as unknown as EnemyTemplate),
      recipes: recipes.map((entry) => entry.raw as unknown as Recipe),
      skills: skills.map((entry) => entry.raw as unknown as Skill),
      classes: classes.map((entry) => entry.raw as unknown as CharacterClass),
      shopItems: shopItems.map((entry) => ({ itemId: entry.itemId, price: entry.price })),
      mapAreas: mapAreas.map((entry) => entry.raw as unknown as MapArea),
      warpPoints: warpPoints.map((entry) => entry.raw as unknown as WarpPoint),
      startingQuests: startingQuests.map((entry) => entry.raw as unknown as Quest),
      achievements: achievements.map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description
      })),
      titles: titles.map((entry) => ({
        id: entry.id,
        name: entry.name,
        bonus: entry.bonus
      })),
      gachaPool: gachaPool.map((entry) => ({ itemId: entry.itemId, weight: entry.weight }))
    });
  } catch {
    return fallbackCatalog();
  }
});

function fallbackCatalog(): GameCatalog {
  return buildCatalog({
    items: ITEMS,
    enemies: ENEMIES,
    recipes: RECIPES,
    skills: SKILLS,
    classes: CLASSES,
    shopItems: SHOP_ITEMS,
    mapAreas: MAP_AREAS,
    warpPoints: WARP_POINTS,
    startingQuests: STARTING_QUESTS,
    achievements: ACHIEVEMENTS,
    titles: TITLES,
    gachaPool: GACHA_POOL
  });
}

function buildCatalog(catalog: Omit<GameCatalog, "itemById">): GameCatalog {
  return {
    ...catalog,
    itemById: Object.fromEntries(
      catalog.items.map((item) => [item.id, item])
    ) as GameCatalog["itemById"]
  };
}

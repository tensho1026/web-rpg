import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "../lib/db/database-url";
import {
  Prisma,
  PrismaClient
} from "../lib/generated/prisma/client";
import {
  ACHIEVEMENTS,
  CLASSES,
  ENEMIES,
  GACHA_POOL,
  ITEMS,
  MAP_AREAS,
  RECIPES,
  SHOP_ITEMS,
  SKILLS,
  STARTING_QUESTS,
  TITLES,
  WARP_POINTS
} from "../lib/game/data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: normalizeDatabaseUrl(connectionString) })
});

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value ? toJson(value) : Prisma.JsonNull;
}

async function main() {
  const operations: Prisma.PrismaPromise<unknown>[] = [
    ...ITEMS.map((item) =>
      prisma.itemMaster.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          category: item.category,
          rarity: item.rarity,
          icon: item.icon,
          value: item.value,
          description: item.description,
          slot: item.slot ?? null,
          setId: item.setId ?? null,
          socketable: item.socketable ?? false,
          stats: nullableJson(item.stats),
          gemStats: nullableJson(item.gemStats),
          heal: nullableJson(item.heal),
          damage: item.damage ?? null,
          raw: toJson(item)
        },
        update: {
          name: item.name,
          category: item.category,
          rarity: item.rarity,
          icon: item.icon,
          value: item.value,
          description: item.description,
          slot: item.slot ?? null,
          setId: item.setId ?? null,
          socketable: item.socketable ?? false,
          stats: nullableJson(item.stats),
          gemStats: nullableJson(item.gemStats),
          heal: nullableJson(item.heal),
          damage: item.damage ?? null,
          raw: toJson(item)
        }
      })
    ),
    ...ENEMIES.map((enemy) =>
      prisma.enemyMaster.upsert({
        where: { id: enemy.id },
        create: {
          id: enemy.id,
          name: enemy.name,
          sprite: enemy.sprite,
          biome: enemy.biome,
          level: enemy.level,
          minFloor: enemy.minFloor,
          maxHp: enemy.maxHp,
          atk: enemy.atk,
          def: enemy.def,
          agi: enemy.agi,
          exp: enemy.exp,
          gold: enemy.gold,
          drops: toJson(enemy.drops),
          description: enemy.description,
          raw: toJson(enemy)
        },
        update: {
          name: enemy.name,
          sprite: enemy.sprite,
          biome: enemy.biome,
          level: enemy.level,
          minFloor: enemy.minFloor,
          maxHp: enemy.maxHp,
          atk: enemy.atk,
          def: enemy.def,
          agi: enemy.agi,
          exp: enemy.exp,
          gold: enemy.gold,
          drops: toJson(enemy.drops),
          description: enemy.description,
          raw: toJson(enemy)
        }
      })
    ),
    ...RECIPES.map((recipe) =>
      prisma.recipeMaster.upsert({
        where: { id: recipe.id },
        create: {
          id: recipe.id,
          name: recipe.name,
          station: recipe.station,
          icon: recipe.icon,
          description: recipe.description,
          unlockLevel: recipe.unlockLevel,
          requires: toJson(recipe.requires),
          output: toJson(recipe.output),
          raw: toJson(recipe)
        },
        update: {
          name: recipe.name,
          station: recipe.station,
          icon: recipe.icon,
          description: recipe.description,
          unlockLevel: recipe.unlockLevel,
          requires: toJson(recipe.requires),
          output: toJson(recipe.output),
          raw: toJson(recipe)
        }
      })
    ),
    ...SKILLS.map((skill) =>
      prisma.skillMaster.upsert({
        where: { id: skill.id },
        create: {
          id: skill.id,
          name: skill.name,
          kind: skill.kind,
          icon: skill.icon,
          mpCost: skill.mpCost,
          unlockLevel: skill.unlockLevel,
          description: skill.description,
          raw: toJson(skill)
        },
        update: {
          name: skill.name,
          kind: skill.kind,
          icon: skill.icon,
          mpCost: skill.mpCost,
          unlockLevel: skill.unlockLevel,
          description: skill.description,
          raw: toJson(skill)
        }
      })
    ),
    ...CLASSES.map((characterClass) =>
      prisma.classMaster.upsert({
        where: { id: characterClass.id },
        create: {
          id: characterClass.id,
          name: characterClass.name,
          unlockLevel: characterClass.unlockLevel,
          cost: characterClass.cost,
          stats: toJson(characterClass.stats),
          skillId: characterClass.skillId,
          raw: toJson(characterClass)
        },
        update: {
          name: characterClass.name,
          unlockLevel: characterClass.unlockLevel,
          cost: characterClass.cost,
          stats: toJson(characterClass.stats),
          skillId: characterClass.skillId,
          raw: toJson(characterClass)
        }
      })
    ),
    ...MAP_AREAS.map((area) =>
      prisma.mapAreaMaster.upsert({
        where: { id: area.id },
        create: {
          id: area.id,
          name: area.name,
          kind: area.kind,
          stamina: area.stamina,
          floor: area.floor,
          description: area.description,
          raw: toJson(area)
        },
        update: {
          name: area.name,
          kind: area.kind,
          stamina: area.stamina,
          floor: area.floor,
          description: area.description,
          raw: toJson(area)
        }
      })
    ),
    ...WARP_POINTS.map((warp) =>
      prisma.warpPointMaster.upsert({
        where: { id: warp.id },
        create: {
          id: warp.id,
          name: warp.name,
          areaId: warp.areaId,
          unlockFloor: warp.unlockFloor,
          cost: warp.cost,
          description: warp.description,
          raw: toJson(warp)
        },
        update: {
          name: warp.name,
          areaId: warp.areaId,
          unlockFloor: warp.unlockFloor,
          cost: warp.cost,
          description: warp.description,
          raw: toJson(warp)
        }
      })
    ),
    ...SHOP_ITEMS.map((shopItem) =>
      prisma.shopItemMaster.upsert({
        where: { itemId: shopItem.itemId },
        create: {
          itemId: shopItem.itemId,
          price: shopItem.price,
          raw: toJson(shopItem)
        },
        update: {
          price: shopItem.price,
          raw: toJson(shopItem)
        }
      })
    ),
    ...STARTING_QUESTS.map((quest) =>
      prisma.questTemplateMaster.upsert({
        where: { id: quest.id },
        create: {
          id: quest.id,
          type: quest.type,
          title: quest.title,
          description: quest.description,
          target: quest.target,
          rewardGold: quest.rewardGold,
          rewardItemId: quest.rewardItemId,
          rewardExp: quest.rewardExp,
          raw: toJson(quest)
        },
        update: {
          type: quest.type,
          title: quest.title,
          description: quest.description,
          target: quest.target,
          rewardGold: quest.rewardGold,
          rewardItemId: quest.rewardItemId,
          rewardExp: quest.rewardExp,
          raw: toJson(quest)
        }
      })
    ),
    ...ACHIEVEMENTS.map((achievement) =>
      prisma.achievementMaster.upsert({
        where: { id: achievement.id },
        create: {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          raw: toJson(achievement)
        },
        update: {
          title: achievement.title,
          description: achievement.description,
          raw: toJson(achievement)
        }
      })
    ),
    ...TITLES.map((title) =>
      prisma.titleMaster.upsert({
        where: { id: title.id },
        create: {
          id: title.id,
          name: title.name,
          bonus: title.bonus,
          raw: toJson(title)
        },
        update: {
          name: title.name,
          bonus: title.bonus,
          raw: toJson(title)
        }
      })
    ),
    ...GACHA_POOL.map((entry) =>
      prisma.gachaPoolMaster.upsert({
        where: { itemId: entry.itemId },
        create: {
          itemId: entry.itemId,
          weight: entry.weight,
          raw: toJson(entry)
        },
        update: {
          weight: entry.weight,
          raw: toJson(entry)
        }
      })
    )
  ];

  for (const batch of chunk(operations, 12)) {
    await Promise.all(batch);
  }
  console.log(
    `Seeded master data: ${ITEMS.length} items, ${ENEMIES.length} enemies, ${RECIPES.length} recipes.`
  );
}

function chunk<T>(entries: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks;
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

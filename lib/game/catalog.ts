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

export type ShopItem = {
  itemId: string;
  price: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
};

export type Title = {
  id: string;
  name: string;
  bonus: string;
};

export type GachaPoolEntry = {
  itemId: string;
  weight: number;
};

export type GameCatalog = {
  items: Item[];
  itemById: Record<string, Item>;
  recipes: Recipe[];
  enemies: EnemyTemplate[];
  startingQuests: Quest[];
  skills: Skill[];
  classes: CharacterClass[];
  shopItems: ShopItem[];
  mapAreas: MapArea[];
  warpPoints: WarpPoint[];
  achievements: Achievement[];
  titles: Title[];
  gachaPool: GachaPoolEntry[];
};

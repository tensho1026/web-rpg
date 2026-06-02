export type Rarity = "common" | "uncommon" | "rare" | "epic";

export type ItemCategory =
  | "consumable"
  | "material"
  | "weapon"
  | "armor"
  | "accessory"
  | "relic";

export type EquipmentSlot = "weapon" | "armor" | "accessory";

export type Station = "synthesis" | "forge" | "alchemy";

export type Phase = "battle" | "explore" | "victory" | "defeat";

export type Stats = {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  agi: number;
  luck: number;
};

export type InventoryStack = {
  itemId: string;
  qty: number;
};

export type Item = {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  icon: string;
  value: number;
  description: string;
  slot?: EquipmentSlot;
  stats?: Partial<Stats>;
  heal?: {
    hp?: number;
    mp?: number;
  };
  damage?: number;
};

export type Recipe = {
  id: string;
  name: string;
  station: Station;
  icon: string;
  description: string;
  requires: InventoryStack[];
  output: InventoryStack;
  unlockLevel: number;
};

export type Drop = {
  itemId: string;
  min: number;
  max: number;
  chance: number;
};

export type EnemyTemplate = {
  id: string;
  name: string;
  sprite: string;
  biome: string;
  level: number;
  minFloor: number;
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
  exp: number;
  gold: number;
  drops: Drop[];
  description: string;
};

export type EnemyState = EnemyTemplate & {
  hp: number;
};

export type PlayerState = {
  name: string;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  mp: number;
  base: Stats;
  gold: number;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipmentSlot, string>>;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardGold: number;
  rewardItemId: string;
  completed: boolean;
};

export type GameState = {
  phase: Phase;
  floor: number;
  day: number;
  turn: number;
  forgeRank: number;
  alchemyRank: number;
  player: PlayerState;
  enemy: EnemyState;
  log: string[];
  quests: Quest[];
  lastDrops: InventoryStack[];
  discoveredEnemies: string[];
};

export type GameCommand = {
  type: string;
  itemId?: string;
  recipeId?: string;
};

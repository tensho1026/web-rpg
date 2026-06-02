export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemCategory =
  | "consumable"
  | "material"
  | "weapon"
  | "armor"
  | "accessory"
  | "relic"
  | "gem"
  | "quest"
  | "pet"
  | "mount";

export type EquipmentSlot = "weapon" | "armor" | "accessory";

export type Station = "synthesis" | "forge" | "alchemy";

export type Phase = "town" | "battle" | "explore" | "victory" | "defeat";

export type GameView =
  | "home"
  | "adventure"
  | "character"
  | "inventory"
  | "equipment"
  | "craft"
  | "shop"
  | "quests"
  | "codex"
  | "guild"
  | "gacha"
  | "data";

export type QuestType = "main" | "sub" | "daily" | "event";

export type StatusKind = "poison" | "paralysis" | "sleep" | "burn";

export type ActionKind =
  | "idle"
  | "attack"
  | "magic"
  | "skill"
  | "item"
  | "enemy"
  | "loot"
  | "town";

export type Stats = {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  agi: number;
  luck: number;
};

export type StatusEffect = {
  kind: StatusKind;
  turns: number;
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
  setId?: string;
  socketable?: boolean;
  gemStats?: Partial<Stats>;
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
  statusEffects: StatusEffect[];
};

export type Skill = {
  id: string;
  name: string;
  kind: "active" | "magic" | "passive";
  icon: string;
  mpCost: number;
  unlockLevel: number;
  description: string;
};

export type CharacterClass = {
  id: string;
  name: string;
  unlockLevel: number;
  cost: number;
  stats: Partial<Stats>;
  skillId: string;
};

export type MapArea = {
  id: string;
  name: string;
  kind: "field" | "dungeon" | "town";
  stamina: number;
  floor: number;
  description: string;
};

export type WarpPoint = {
  id: string;
  name: string;
  areaId: string;
  unlockFloor: number;
  cost: number;
  description: string;
};

export type EquipmentMeta = {
  refinement: number;
  durability: number;
  enchant?: {
    stat: keyof Stats;
    value: number;
  };
  sockets: string[];
  randomOptions: Array<{
    stat: keyof Stats;
    value: number;
  }>;
};

export type PlayerState = {
  name: string;
  classId: string;
  className: string;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  mp: number;
  base: Stats;
  gold: number;
  stamina: number;
  maxStamina: number;
  rank: number;
  awakening: number;
  evolution: number;
  limitBreak: number;
  skillPoints: number;
  title: string;
  activePet?: string;
  activeMount?: string;
  statusEffects: StatusEffect[];
  skills: Record<string, number>;
  passiveSkills: string[];
  skillTree: Record<string, boolean>;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipmentSlot, string>>;
  equipmentMeta: Record<string, EquipmentMeta>;
};

export type Quest = {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardGold: number;
  rewardItemId: string;
  rewardExp: number;
  completed: boolean;
};

export type GameState = {
  phase: Phase;
  view: GameView;
  location: string;
  floor: number;
  day: number;
  turn: number;
  forgeRank: number;
  alchemyRank: number;
  battleSpeed: 1 | 2 | 4;
  autoBattle: boolean;
  player: PlayerState;
  enemy: EnemyState;
  log: string[];
  quests: Quest[];
  lastDrops: InventoryStack[];
  discoveredEnemies: string[];
  discoveredItems: string[];
  achievements: string[];
  titles: string[];
  pets: string[];
  mounts: string[];
  guild: {
    name: string;
    level: number;
    contribution: number;
  };
  storyFlags: Record<string, boolean>;
  playHistory: string[];
  loginBonusClaimedDay: number;
  gachaPity: number;
  lastAction: {
    kind: ActionKind;
    seed: number;
    message: string;
  };
};

export type GameCommand = {
  type: string;
  itemId?: string;
  recipeId?: string;
  skillId?: string;
  targetView?: GameView;
  areaId?: string;
  value?: string;
  stateJson?: string;
};

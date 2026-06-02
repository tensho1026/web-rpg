import type { EnemyTemplate, Item, Quest, Recipe } from "@/lib/game/types";

export const ITEMS: Item[] = [
  {
    id: "potion",
    name: "薬草ポーション",
    category: "consumable",
    rarity: "common",
    icon: "瓶",
    value: 24,
    heal: { hp: 42 },
    description: "HPを少し回復する。探索者の基本携行品。"
  },
  {
    id: "ether-drop",
    name: "星くずエーテル",
    category: "consumable",
    rarity: "uncommon",
    icon: "雫",
    value: 44,
    heal: { mp: 12 },
    description: "MPを回復する。錬成炉の残光を固めたもの。"
  },
  {
    id: "smoke-bomb",
    name: "煙玉",
    category: "consumable",
    rarity: "common",
    icon: "煙",
    value: 18,
    description: "逃走成功率を大きく上げる。戦闘中に使用可能。"
  },
  {
    id: "flare-stone",
    name: "火花石",
    category: "consumable",
    rarity: "uncommon",
    icon: "火",
    value: 36,
    damage: 34,
    description: "敵に固定ダメージを与える投てき石。"
  },
  {
    id: "iron-shard",
    name: "鉄のかけら",
    category: "material",
    rarity: "common",
    icon: "鉱",
    value: 8,
    description: "武器や防具の合成に使う素材。"
  },
  {
    id: "moon-herb",
    name: "月明かり草",
    category: "material",
    rarity: "common",
    icon: "草",
    value: 7,
    description: "回復薬の調合に使う夜光性の草。"
  },
  {
    id: "beast-hide",
    name: "厚い革",
    category: "material",
    rarity: "uncommon",
    icon: "革",
    value: 14,
    description: "防具と装飾品の芯材になる。"
  },
  {
    id: "aether-dust",
    name: "霊銀の粉",
    category: "material",
    rarity: "rare",
    icon: "粉",
    value: 28,
    description: "錬成と強化に使う希少な粉末。"
  },
  {
    id: "crystal-core",
    name: "水晶核",
    category: "material",
    rarity: "rare",
    icon: "晶",
    value: 36,
    description: "上位装備や護符の錬成に必要な核。"
  },
  {
    id: "rusty-sword",
    name: "さびた剣",
    category: "weapon",
    rarity: "common",
    icon: "剣",
    value: 35,
    slot: "weapon",
    stats: { atk: 4 },
    description: "古いがまだ振れる剣。"
  },
  {
    id: "iron-sword",
    name: "鉄の剣",
    category: "weapon",
    rarity: "uncommon",
    icon: "剣",
    value: 86,
    slot: "weapon",
    stats: { atk: 9, agi: -1 },
    description: "素直な性能の鍛造剣。"
  },
  {
    id: "ember-blade",
    name: "火花の刃",
    category: "weapon",
    rarity: "rare",
    icon: "刃",
    value: 164,
    slot: "weapon",
    stats: { atk: 14, luck: 2 },
    description: "火花石を錬成した軽い片手剣。"
  },
  {
    id: "cloth-armor",
    name: "旅人の服",
    category: "armor",
    rarity: "common",
    icon: "服",
    value: 28,
    slot: "armor",
    stats: { def: 3, agi: 1 },
    description: "動きやすい旅装。"
  },
  {
    id: "iron-mail",
    name: "鉄の胸当て",
    category: "armor",
    rarity: "uncommon",
    icon: "鎧",
    value: 92,
    slot: "armor",
    stats: { def: 9, maxHp: 12 },
    description: "前衛向けの胸当て。"
  },
  {
    id: "moon-cloak",
    name: "月影の外套",
    category: "armor",
    rarity: "rare",
    icon: "套",
    value: 148,
    slot: "armor",
    stats: { def: 7, maxMp: 8, agi: 3 },
    description: "夜の探索で真価を発揮する軽装防具。"
  },
  {
    id: "lucky-charm",
    name: "幸運の護符",
    category: "accessory",
    rarity: "uncommon",
    icon: "守",
    value: 80,
    slot: "accessory",
    stats: { luck: 5 },
    description: "ドロップ抽選に少し強くなる装飾品。"
  },
  {
    id: "guard-ring",
    name: "守りの指輪",
    category: "accessory",
    rarity: "uncommon",
    icon: "輪",
    value: 78,
    slot: "accessory",
    stats: { def: 4, maxHp: 8 },
    description: "受けるダメージを抑える装飾品。"
  },
  {
    id: "sage-pendant",
    name: "賢者の首飾り",
    category: "accessory",
    rarity: "rare",
    icon: "飾",
    value: 155,
    slot: "accessory",
    stats: { maxMp: 16, luck: 3 },
    description: "錬成師が身につける精神集中の飾り。"
  },
  {
    id: "ancient-relic",
    name: "古代のレリック",
    category: "relic",
    rarity: "epic",
    icon: "遺",
    value: 260,
    description: "この地の最深部に眠る失われた部品。"
  }
];

export const ITEM_BY_ID = Object.fromEntries(
  ITEMS.map((item) => [item.id, item])
) as Record<string, Item>;

export const RECIPES: Recipe[] = [
  {
    id: "craft-potion",
    name: "薬草ポーション",
    station: "synthesis",
    icon: "合",
    unlockLevel: 1,
    description: "月明かり草から回復薬を作る。",
    requires: [{ itemId: "moon-herb", qty: 2 }],
    output: { itemId: "potion", qty: 2 }
  },
  {
    id: "craft-smoke",
    name: "煙玉",
    station: "synthesis",
    icon: "合",
    unlockLevel: 1,
    description: "鉄粉を混ぜて逃走用の道具を作る。",
    requires: [
      { itemId: "iron-shard", qty: 1 },
      { itemId: "moon-herb", qty: 1 }
    ],
    output: { itemId: "smoke-bomb", qty: 2 }
  },
  {
    id: "forge-iron-sword",
    name: "鉄の剣",
    station: "forge",
    icon: "鍛",
    unlockLevel: 1,
    description: "鉄のかけらをまとめて攻撃力を伸ばす。",
    requires: [
      { itemId: "iron-shard", qty: 4 },
      { itemId: "rusty-sword", qty: 1 }
    ],
    output: { itemId: "iron-sword", qty: 1 }
  },
  {
    id: "forge-iron-mail",
    name: "鉄の胸当て",
    station: "forge",
    icon: "鍛",
    unlockLevel: 2,
    description: "革と鉄で堅実な防具を作る。",
    requires: [
      { itemId: "iron-shard", qty: 5 },
      { itemId: "beast-hide", qty: 2 }
    ],
    output: { itemId: "iron-mail", qty: 1 }
  },
  {
    id: "alchemy-ether",
    name: "星くずエーテル",
    station: "alchemy",
    icon: "錬",
    unlockLevel: 1,
    description: "霊銀の粉を消費してMP回復薬を作る。",
    requires: [
      { itemId: "aether-dust", qty: 1 },
      { itemId: "moon-herb", qty: 1 }
    ],
    output: { itemId: "ether-drop", qty: 1 }
  },
  {
    id: "alchemy-charm",
    name: "幸運の護符",
    station: "alchemy",
    icon: "錬",
    unlockLevel: 2,
    description: "水晶核に霊銀を焼き付ける装飾品錬成。",
    requires: [
      { itemId: "crystal-core", qty: 1 },
      { itemId: "aether-dust", qty: 2 }
    ],
    output: { itemId: "lucky-charm", qty: 1 }
  },
  {
    id: "alchemy-ember-blade",
    name: "火花の刃",
    station: "alchemy",
    icon: "錬",
    unlockLevel: 3,
    description: "火花石と鉄の剣を錬成して希少武器に変える。",
    requires: [
      { itemId: "iron-sword", qty: 1 },
      { itemId: "flare-stone", qty: 2 },
      { itemId: "aether-dust", qty: 2 }
    ],
    output: { itemId: "ember-blade", qty: 1 }
  }
];

export const ENEMIES: EnemyTemplate[] = [
  {
    id: "slime",
    name: "蒼いスライム",
    sprite: "slime",
    biome: "湿った街道",
    level: 1,
    minFloor: 1,
    maxHp: 42,
    atk: 8,
    def: 2,
    agi: 5,
    exp: 18,
    gold: 16,
    description: "旅人の荷物に寄ってくる低層の魔物。",
    drops: [
      { itemId: "moon-herb", min: 1, max: 2, chance: 0.72 },
      { itemId: "potion", min: 1, max: 1, chance: 0.18 }
    ]
  },
  {
    id: "rust-bandit",
    name: "さび鉄の盗賊",
    sprite: "bandit",
    biome: "廃鉱の入口",
    level: 2,
    minFloor: 1,
    maxHp: 58,
    atk: 11,
    def: 4,
    agi: 7,
    exp: 28,
    gold: 34,
    description: "廃材から作った武器を振るう荒くれ者。",
    drops: [
      { itemId: "iron-shard", min: 1, max: 3, chance: 0.78 },
      { itemId: "rusty-sword", min: 1, max: 1, chance: 0.22 },
      { itemId: "smoke-bomb", min: 1, max: 1, chance: 0.16 }
    ]
  },
  {
    id: "shade-knight",
    name: "影まといの騎士",
    sprite: "knight",
    biome: "月影の回廊",
    level: 3,
    minFloor: 2,
    maxHp: 86,
    atk: 15,
    def: 8,
    agi: 5,
    exp: 44,
    gold: 48,
    description: "古い誓約だけで動き続ける甲冑。",
    drops: [
      { itemId: "iron-shard", min: 2, max: 4, chance: 0.85 },
      { itemId: "beast-hide", min: 1, max: 2, chance: 0.34 },
      { itemId: "iron-mail", min: 1, max: 1, chance: 0.12 }
    ]
  },
  {
    id: "aether-mage",
    name: "霊銀の術師",
    sprite: "mage",
    biome: "錬成炉跡",
    level: 4,
    minFloor: 3,
    maxHp: 94,
    atk: 18,
    def: 6,
    agi: 9,
    exp: 58,
    gold: 62,
    description: "こわれた炉の魔力をすくい続ける影。",
    drops: [
      { itemId: "aether-dust", min: 1, max: 3, chance: 0.74 },
      { itemId: "ether-drop", min: 1, max: 1, chance: 0.26 },
      { itemId: "sage-pendant", min: 1, max: 1, chance: 0.1 }
    ]
  },
  {
    id: "crystal-warden",
    name: "水晶の番人",
    sprite: "warden",
    biome: "最深の水晶庭",
    level: 6,
    minFloor: 4,
    maxHp: 136,
    atk: 23,
    def: 12,
    agi: 6,
    exp: 92,
    gold: 94,
    description: "古代のレリックを守る結晶兵。",
    drops: [
      { itemId: "crystal-core", min: 1, max: 2, chance: 0.68 },
      { itemId: "aether-dust", min: 2, max: 4, chance: 0.52 },
      { itemId: "ancient-relic", min: 1, max: 1, chance: 0.14 }
    ]
  }
];

export const STARTING_QUESTS: Quest[] = [
  {
    id: "first-forge",
    title: "鍛冶場の火入れ",
    description: "鉄のかけらを集めて装備合成の準備をする。",
    progress: 0,
    target: 6,
    rewardGold: 60,
    rewardItemId: "guard-ring",
    completed: false
  },
  {
    id: "relic-trail",
    title: "古代レリックの痕跡",
    description: "水晶核を集め、錬成炉の奥へ進む。",
    progress: 0,
    target: 3,
    rewardGold: 120,
    rewardItemId: "sage-pendant",
    completed: false
  }
];

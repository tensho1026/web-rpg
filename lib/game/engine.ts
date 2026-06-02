import {
  ENEMIES,
  ITEM_BY_ID,
  RECIPES,
  STARTING_QUESTS
} from "@/lib/game/data";
import {
  canCraft,
  getPlayerStats,
  inventoryCount
} from "@/lib/game/selectors";
import type {
  Drop,
  EnemyState,
  GameCommand,
  GameState,
  InventoryStack,
  PlayerState,
  Quest
} from "@/lib/game/types";

const MAX_LOG_LINES = 9;

export function createInitialGameState(): GameState {
  const player: PlayerState = {
    name: "レン",
    level: 1,
    exp: 0,
    expToNext: 60,
    hp: 112,
    mp: 24,
    base: {
      maxHp: 112,
      maxMp: 24,
      atk: 14,
      def: 7,
      agi: 8,
      luck: 4
    },
    gold: 120,
    inventory: {
      potion: 3,
      "ether-drop": 1,
      "smoke-bomb": 1,
      "flare-stone": 1,
      "moon-herb": 3,
      "iron-shard": 2,
      "rusty-sword": 1,
      "cloth-armor": 1
    },
    equipment: {
      weapon: "rusty-sword",
      armor: "cloth-armor"
    }
  };

  return {
    phase: "battle",
    floor: 1,
    day: 1,
    turn: 1,
    forgeRank: 1,
    alchemyRank: 1,
    player,
    enemy: createEnemy(1, "slime"),
    log: [
      "古い街道で蒼いスライムが跳ねている。",
      "戦う、逃げる、道具、合成、錬成をServer Actionで処理します。"
    ],
    quests: structuredClone(STARTING_QUESTS),
    lastDrops: [],
    discoveredEnemies: ["slime"]
  };
}

export function resolveGameCommand(
  previousState: GameState,
  command: GameCommand
): GameState {
  const state = normalizeState(structuredClone(previousState));
  const type = command.type;

  if (state.phase === "defeat" && type !== "rest") {
    return pushLog(state, "倒れている。宿で休む必要がある。");
  }

  switch (type) {
    case "attack":
      return attack(state, "normal");
    case "skill":
      return attack(state, "skill");
    case "guard":
      return guard(state);
    case "flee":
      return flee(state, false);
    case "item":
      return consumeItem(state, command.itemId ?? "");
    case "equip":
      return equipItem(state, command.itemId ?? "");
    case "craft":
      return craftRecipe(state, command.recipeId ?? "");
    case "alchemy":
      return craftRecipe(state, command.recipeId ?? "");
    case "explore":
      return explore(state);
    case "next":
      return nextBattle(state);
    case "rest":
      return restAtInn(state);
    case "salvage":
      return salvageItem(state, command.itemId ?? "");
    default:
      return pushLog(state, "未実装のコマンドです。");
  }
}

function attack(state: GameState, mode: "normal" | "skill"): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "いまは戦闘中ではない。探索で敵を探そう。");
  }

  const stats = getPlayerStats(state.player);
  const isSkill = mode === "skill";
  const mpCost = 7;

  if (isSkill && state.player.mp < mpCost) {
    return pushLog(state, "MPが足りない。魔法剣を使えない。");
  }

  if (isSkill) {
    state.player.mp -= mpCost;
  }

  const crit = Math.random() < (stats.luck + 2) / 100;
  const baseDamage = isSkill
    ? stats.atk * 1.65 + stats.luck * 0.5
    : stats.atk * 1.1;
  const damage = clamp(
    Math.round(baseDamage + randInt(0, 6) - state.enemy.def * 0.55),
    4,
    999
  );
  const finalDamage = crit ? Math.round(damage * 1.7) : damage;
  state.enemy.hp = Math.max(0, state.enemy.hp - finalDamage);
  state.turn += 1;

  const line = isSkill
    ? `魔法剣で${state.enemy.name}に${finalDamage}ダメージ。`
    : `攻撃して${state.enemy.name}に${finalDamage}ダメージ。`;
  pushLogMutable(state, crit ? `${line} 会心の手応え。` : line);

  if (state.enemy.hp <= 0) {
    return winBattle(state);
  }

  return enemyCounter(state, false);
}

function guard(state: GameState): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "盾を構えたが、周囲は静かだ。");
  }
  state.turn += 1;
  pushLogMutable(state, "身を固めて敵の攻撃を受ける。");
  return enemyCounter(state, true);
}

function flee(state: GameState, forced: boolean): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "すでに戦闘から離れている。");
  }

  const stats = getPlayerStats(state.player);
  const chance = forced
    ? 0.94
    : clampNumber(0.42 + (stats.agi - state.enemy.agi) * 0.035, 0.18, 0.78);

  state.turn += 1;
  if (Math.random() < chance) {
    state.phase = "explore";
    state.enemy.hp = state.enemy.maxHp;
    state.day += Math.random() < 0.25 ? 1 : 0;
    return pushLog(
      state,
      forced
        ? "煙幕に紛れて距離を取った。探索に戻る。"
        : "すばやく距離を取り、探索に戻った。"
    );
  }

  pushLogMutable(state, "逃走に失敗。敵が間合いを詰めてくる。");
  return enemyCounter(state, false);
}

function consumeItem(state: GameState, itemId: string): GameState {
  const item = ITEM_BY_ID[itemId];
  if (!item || inventoryCount(state.player, itemId) <= 0) {
    return pushLog(state, "その道具は持っていない。");
  }
  if (item.category !== "consumable") {
    return pushLog(state, "戦闘中に使える道具ではない。");
  }
  if (!ensureBattle(state) && (itemId === "smoke-bomb" || item.damage)) {
    return pushLog(state, "探索中に使う必要はない。");
  }

  removeInventory(state.player, itemId, 1);
  state.turn += 1;

  if (itemId === "smoke-bomb") {
    pushLogMutable(state, "煙玉を投げた。視界が白く染まる。");
    return flee(state, true);
  }

  const stats = getPlayerStats(state.player);
  if (item.heal?.hp) {
    state.player.hp = Math.min(stats.maxHp, state.player.hp + item.heal.hp);
    pushLogMutable(state, `${item.name}でHPを${item.heal.hp}回復。`);
  }
  if (item.heal?.mp) {
    state.player.mp = Math.min(stats.maxMp, state.player.mp + item.heal.mp);
    pushLogMutable(state, `${item.name}でMPを${item.heal.mp}回復。`);
  }
  if (item.damage && ensureBattle(state)) {
    state.enemy.hp = Math.max(0, state.enemy.hp - item.damage);
    pushLogMutable(state, `${item.name}を投げて${item.damage}ダメージ。`);
    if (state.enemy.hp <= 0) {
      return winBattle(state);
    }
  }

  if (ensureBattle(state)) {
    return enemyCounter(state, false);
  }
  return state;
}

function equipItem(state: GameState, itemId: string): GameState {
  const item = ITEM_BY_ID[itemId];
  if (!item?.slot) {
    return pushLog(state, "装備できるアイテムではない。");
  }
  if (inventoryCount(state.player, itemId) <= 0) {
    return pushLog(state, "その装備はバッグにない。");
  }

  state.player.equipment[item.slot] = itemId;
  clampPlayerVitals(state.player);
  return pushLog(state, `${item.name}を装備した。`);
}

function craftRecipe(state: GameState, recipeId: string): GameState {
  const recipe = RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) {
    return pushLog(state, "そのレシピは見つからない。");
  }
  if (recipe.unlockLevel > state.player.level) {
    return pushLog(state, "まだ扱えないレシピだ。レベルを上げよう。");
  }
  if (!canCraft(state.player, recipe)) {
    return pushLog(state, "素材が足りない。");
  }

  recipe.requires.forEach((stack) =>
    removeInventory(state.player, stack.itemId, stack.qty)
  );
  addInventory(state.player, recipe.output.itemId, recipe.output.qty);
  if (recipe.station === "forge") {
    state.forgeRank = Math.min(5, state.forgeRank + 0.15);
  }
  if (recipe.station === "alchemy") {
    state.alchemyRank = Math.min(5, state.alchemyRank + 0.15);
  }

  const output = ITEM_BY_ID[recipe.output.itemId];
  return pushLog(
    state,
    `${recipe.name}を${recipe.station === "alchemy" ? "錬成" : "合成"}した。${output?.name ?? "成果物"} x${recipe.output.qty}を入手。`
  );
}

function salvageItem(state: GameState, itemId: string): GameState {
  const item = ITEM_BY_ID[itemId];
  if (!item?.slot) {
    return pushLog(state, "分解できる装備ではない。");
  }
  if (inventoryCount(state.player, itemId) <= 0) {
    return pushLog(state, "分解する装備がない。");
  }
  if (Object.values(state.player.equipment).includes(itemId)) {
    return pushLog(state, "装備中の品は分解できない。");
  }

  removeInventory(state.player, itemId, 1);
  const materialQty = item.rarity === "rare" ? 3 : 2;
  addInventory(state.player, "iron-shard", materialQty);
  if (item.rarity !== "common") {
    addInventory(state.player, "aether-dust", 1);
  }
  return pushLog(state, `${item.name}を分解し、素材を回収した。`);
}

function explore(state: GameState): GameState {
  if (state.phase === "battle") {
    return pushLog(state, "敵が目の前にいる。まず戦闘を決着させよう。");
  }

  state.phase = "explore";
  state.turn += 1;
  const roll = Math.random();

  if (roll < 0.46) {
    const herbQty = randInt(1, 3);
    const shardQty = Math.random() < 0.5 ? randInt(1, 2) : 0;
    addInventory(state.player, "moon-herb", herbQty);
    if (shardQty > 0) {
      addInventory(state.player, "iron-shard", shardQty);
    }
    updateQuestProgress(state, "first-forge", shardQty);
    return pushLog(
      state,
      `草むらと廃材を調べた。月明かり草 x${herbQty}${shardQty ? `、鉄のかけら x${shardQty}` : ""}を入手。`
    );
  }

  if (roll < 0.68) {
    const foundGold = randInt(12, 36) + state.floor * 4;
    state.player.gold += foundGold;
    return pushLog(state, `古い木箱から${foundGold}Gを見つけた。`);
  }

  if (roll < 0.8) {
    state.floor = Math.min(5, state.floor + 1);
    state.day += 1;
    state.enemy = createEnemy(state.floor);
    state.phase = "battle";
    addDiscovery(state, state.enemy.id);
    return pushLog(
      state,
      `階層${state.floor}へ進んだ。${state.enemy.name}が立ちはだかる。`
    );
  }

  state.enemy = createEnemy(state.floor);
  state.phase = "battle";
  addDiscovery(state, state.enemy.id);
  return pushLog(state, `${state.enemy.biome}で${state.enemy.name}と遭遇。`);
}

function nextBattle(state: GameState): GameState {
  const shouldAdvance = state.phase === "victory" && Math.random() < 0.55;
  if (shouldAdvance) {
    state.floor = Math.min(5, state.floor + 1);
  }
  state.phase = "battle";
  state.enemy = createEnemy(state.floor);
  addDiscovery(state, state.enemy.id);
  return pushLog(
    state,
    `階層${state.floor}、${state.enemy.biome}。${state.enemy.name}が現れた。`
  );
}

function restAtInn(state: GameState): GameState {
  const cost = state.phase === "defeat" ? 0 : Math.min(40, state.player.gold);
  state.player.gold -= cost;
  state.day += 1;
  const stats = getPlayerStats(state.player);
  state.player.hp = stats.maxHp;
  state.player.mp = stats.maxMp;
  state.phase = "explore";
  state.enemy.hp = state.enemy.maxHp;
  return pushLog(
    state,
    cost > 0
      ? `宿で休んだ。${cost}Gを支払い、HPとMPが全快。`
      : "救護所で目を覚ました。HPとMPが全快。"
  );
}

function enemyCounter(state: GameState, guarded: boolean): GameState {
  const stats = getPlayerStats(state.player);
  const rawDamage = state.enemy.atk + randInt(0, 6) - stats.def * 0.5;
  const damage = clamp(Math.round(rawDamage * (guarded ? 0.45 : 1)), 1, 999);
  state.player.hp = Math.max(0, state.player.hp - damage);
  pushLogMutable(
    state,
    guarded
      ? `${state.enemy.name}の反撃を受け止め、${damage}ダメージ。`
      : `${state.enemy.name}の反撃。${damage}ダメージ。`
  );

  if (state.player.hp <= 0) {
    state.phase = "defeat";
    const lostGold = Math.floor(state.player.gold * 0.15);
    state.player.gold -= lostGold;
    pushLogMutable(
      state,
      `倒れてしまった。救護費として${lostGold}Gを失った。`
    );
  }
  return state;
}

function winBattle(state: GameState): GameState {
  const enemy = state.enemy;
  state.phase = "victory";
  state.player.gold += enemy.gold;
  state.player.exp += enemy.exp;

  const drops = rollDrops(enemy.drops, getPlayerStats(state.player).luck);
  drops.forEach((drop) => addInventory(state.player, drop.itemId, drop.qty));
  state.lastDrops = drops;
  updateQuestProgress(
    state,
    "first-forge",
    drops
      .filter((drop) => drop.itemId === "iron-shard")
      .reduce((sum, drop) => sum + drop.qty, 0)
  );
  updateQuestProgress(
    state,
    "relic-trail",
    drops
      .filter((drop) => drop.itemId === "crystal-core")
      .reduce((sum, drop) => sum + drop.qty, 0)
  );

  const dropText =
    drops.length > 0
      ? drops
          .map((drop) => `${ITEM_BY_ID[drop.itemId]?.name ?? drop.itemId} x${drop.qty}`)
          .join("、")
      : "ドロップなし";

  pushLogMutable(
    state,
    `${enemy.name}を倒した。${enemy.exp}EXPと${enemy.gold}Gを獲得。`
  );
  pushLogMutable(state, `戦利品: ${dropText}`);
  levelUpIfNeeded(state);
  return state;
}

function levelUpIfNeeded(state: GameState): void {
  let leveled = false;
  while (state.player.exp >= state.player.expToNext) {
    state.player.exp -= state.player.expToNext;
    state.player.level += 1;
    state.player.expToNext = Math.round(state.player.expToNext * 1.42 + 18);
    state.player.base.maxHp += 16;
    state.player.base.maxMp += 5;
    state.player.base.atk += 3;
    state.player.base.def += 2;
    state.player.base.agi += 1;
    state.player.base.luck += 1;
    leveled = true;
  }

  if (leveled) {
    const stats = getPlayerStats(state.player);
    state.player.hp = stats.maxHp;
    state.player.mp = stats.maxMp;
    pushLogMutable(
      state,
      `レベル${state.player.level}に上がった。新しいレシピが増えているかもしれない。`
    );
  }
}

function rollDrops(drops: Drop[], luck: number): InventoryStack[] {
  const luckBonus = Math.min(0.16, luck * 0.008);
  return drops.flatMap((drop) => {
    if (Math.random() > drop.chance + luckBonus) {
      return [];
    }
    return [
      {
        itemId: drop.itemId,
        qty: randInt(drop.min, drop.max)
      }
    ];
  });
}

function createEnemy(floor: number, forcedId?: string): EnemyState {
  const available = ENEMIES.filter((enemy) => enemy.minFloor <= floor);
  const template =
    ENEMIES.find((enemy) => enemy.id === forcedId) ??
    available[Math.floor(Math.random() * available.length)] ??
    ENEMIES[0];
  const scale = 1 + Math.max(0, floor - template.minFloor) * 0.16;
  const maxHp = Math.round(template.maxHp * scale);
  return {
    ...template,
    level: template.level + Math.max(0, floor - template.minFloor),
    maxHp,
    hp: maxHp,
    atk: Math.round(template.atk * scale),
    def: Math.round(template.def * scale),
    agi: Math.round(template.agi * scale),
    exp: Math.round(template.exp * scale),
    gold: Math.round(template.gold * scale)
  };
}

function updateQuestProgress(state: GameState, questId: string, amount: number): void {
  if (amount <= 0) {
    return;
  }

  const quest = state.quests.find((entry) => entry.id === questId);
  if (!quest || quest.completed) {
    return;
  }

  quest.progress = Math.min(quest.target, quest.progress + amount);
  if (quest.progress >= quest.target) {
    quest.completed = true;
    state.player.gold += quest.rewardGold;
    addInventory(state.player, quest.rewardItemId, 1);
    pushLogMutable(
      state,
      `依頼「${quest.title}」達成。${quest.rewardGold}Gと${ITEM_BY_ID[quest.rewardItemId]?.name ?? "報酬"}を受け取った。`
    );
  }
}

function addDiscovery(state: GameState, enemyId: string): void {
  if (!state.discoveredEnemies.includes(enemyId)) {
    state.discoveredEnemies.push(enemyId);
  }
}

function addInventory(player: PlayerState, itemId: string, qty: number): void {
  player.inventory[itemId] = Math.max(0, (player.inventory[itemId] ?? 0) + qty);
}

function removeInventory(player: PlayerState, itemId: string, qty: number): void {
  player.inventory[itemId] = Math.max(0, (player.inventory[itemId] ?? 0) - qty);
  if (player.inventory[itemId] === 0) {
    delete player.inventory[itemId];
  }
}

function clampPlayerVitals(player: PlayerState): void {
  const stats = getPlayerStats(player);
  player.hp = Math.min(player.hp, stats.maxHp);
  player.mp = Math.min(player.mp, stats.maxMp);
}

function ensureBattle(state: GameState): boolean {
  return state.phase === "battle" && state.enemy.hp > 0;
}

function normalizeState(state: GameState): GameState {
  state.log = state.log.slice(0, MAX_LOG_LINES);
  state.quests = state.quests.map((quest): Quest => ({ ...quest }));
  state.lastDrops = state.lastDrops ?? [];
  state.discoveredEnemies = state.discoveredEnemies ?? [state.enemy.id];
  clampPlayerVitals(state.player);
  return state;
}

function pushLog(state: GameState, line: string): GameState {
  pushLogMutable(state, line);
  return state;
}

function pushLogMutable(state: GameState, line: string): void {
  state.log = [line, ...state.log].slice(0, MAX_LOG_LINES);
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

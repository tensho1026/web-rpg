import {
  ACHIEVEMENTS,
  CLASSES,
  ENEMIES,
  GACHA_POOL,
  ITEM_BY_ID,
  MAP_AREAS,
  RECIPES,
  SHOP_ITEMS,
  SKILLS,
  STARTING_QUESTS,
  WARP_POINTS
} from "@/lib/game/data";
import {
  canCraft,
  getPlayerStats,
  inventoryCount
} from "@/lib/game/selectors";
import type {
  Drop,
  EnemyState,
  EquipmentMeta,
  EquipmentSlot,
  GameView,
  GameCommand,
  GameState,
  InventoryStack,
  Item,
  PlayerState,
  Quest,
  Skill,
  StatusEffect,
  StatusKind
} from "@/lib/game/types";

const MAX_LOG_LINES = 9;

export function createInitialGameState(): GameState {
  const player: PlayerState = {
    name: "レン",
    classId: "wanderer",
    className: "放浪者",
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
    gold: 50000,
    stamina: 24,
    maxStamina: 24,
    rank: 1,
    awakening: 0,
    evolution: 0,
    limitBreak: 0,
    skillPoints: 1,
    title: "rookie",
    statusEffects: [],
    skills: {
      "power-slash": 1,
      firebolt: 1
    },
    passiveSkills: [],
    skillTree: {
      "node-atk-1": true
    },
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
    },
    equipmentMeta: {
      "rusty-sword": createEquipmentMeta(),
      "cloth-armor": createEquipmentMeta()
    }
  };

  return {
    phase: "town",
    view: "home",
    location: "炉端の街アステル",
    floor: 1,
    day: 1,
    turn: 1,
    forgeRank: 1,
    alchemyRank: 1,
    battleSpeed: 1,
    autoBattle: false,
    player,
    enemy: createEnemy(1, "slime"),
    log: [
      "炉端の街アステルに到着した。",
      "街から冒険、装備、育成、店、ギルド、ガチャ、データ管理を選べます。"
    ],
    quests: structuredClone(STARTING_QUESTS),
    lastDrops: [],
    discoveredEnemies: ["slime"],
    discoveredItems: [
      "potion",
      "ether-drop",
      "rusty-sword",
      "cloth-armor",
      "moon-herb",
      "iron-shard"
    ],
    achievements: [],
    titles: ["rookie"],
    pets: [],
    mounts: [],
    guild: {
      name: "白灯ギルド",
      level: 1,
      contribution: 0
    },
    storyFlags: {
      metGuildMaster: true
    },
    playHistory: ["街に到着"],
    loginBonusClaimedDay: 0,
    gachaPity: 0,
    lastAction: {
      kind: "town",
      seed: 1,
      message: "街に到着"
    }
  };
}

export function resolveGameCommand(
  previousState: GameState,
  command: GameCommand
): GameState {
  if (command.type === "load" && command.stateJson) {
    return loadState(command.stateJson, previousState);
  }

  const state = normalizeState(structuredClone(previousState));
  const type = command.type;

  if (state.phase === "defeat" && type !== "rest" && type !== "returnTown") {
    return pushLog(state, "倒れている。宿で休む必要がある。");
  }

  switch (type) {
    case "view":
      return setView(state, command.targetView ?? "home");
    case "returnTown":
      return returnTown(state);
    case "startAdventure":
      return startAdventure(state, command.areaId ?? "field");
    case "warp":
      return warpTo(state, command.value ?? "town");
    case "attack":
      return attack(state, "normal");
    case "skill":
      return executeSkill(state, command.skillId ?? "power-slash");
    case "magic":
      return executeSkill(state, command.skillId ?? "firebolt");
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
    case "buy":
      return buyItem(state, command.itemId ?? "");
    case "sell":
      return sellItem(state, command.itemId ?? "");
    case "upgradeSkill":
      return upgradeSkill(state, command.skillId ?? "");
    case "unlockPassive":
      return unlockPassive(state, command.skillId ?? "treasure-sense");
    case "classChange":
      return classChange(state, command.value ?? "spellblade");
    case "awaken":
      return awaken(state);
    case "evolve":
      return evolve(state);
    case "limitBreak":
      return limitBreak(state);
    case "rankUp":
      return rankUp(state);
    case "refine":
      return refineEquipment(state, command.itemId ?? "");
    case "enhance":
      return enhanceEquipment(state, command.itemId ?? "");
    case "enchant":
      return enchantEquipment(state, command.itemId ?? "");
    case "reroll":
      return rerollEquipmentOptions(state, command.itemId ?? "");
    case "socket":
      return socketGem(state, command.itemId ?? "", command.value ?? "ruby-gem");
    case "repair":
      return repairEquipment(state, command.itemId ?? "");
    case "gacha":
      return drawGacha(state);
    case "claimLogin":
      return claimLoginBonus(state);
    case "guildDonate":
      return guildDonate(state);
    case "trainPet":
      return trainCompanion(state, "pet");
    case "trainMount":
      return trainCompanion(state, "mount");
    case "setSpeed":
      return setBattleSpeed(state, command.value ?? "1");
    case "toggleAuto":
      return toggleAutoBattle(state);
    case "autoBattle":
      return runAutoBattle(state);
    case "storyChoice":
      return storyChoice(state, command.value ?? "help");
    case "setTitle":
      return setTitle(state, command.value ?? "rookie");
    default:
      return pushLog(state, "未実装のコマンドです。");
  }
}

function setView(state: GameState, view: GameView): GameState {
  state.view = view;
  return setAction(pushLog(state, `${viewLabel(view)}を開いた。`), "town", view);
}

function returnTown(state: GameState): GameState {
  state.phase = "town";
  state.view = "home";
  state.location = "炉端の街アステル";
  state.enemy.hp = state.enemy.maxHp;
  state.player.statusEffects = [];
  pushHistory(state, "街へ帰還");
  return setAction(pushLog(state, "街へ帰還した。次の行動を選べる。"), "town", "return");
}

function startAdventure(state: GameState, areaId: string): GameState {
  const area = MAP_AREAS.find((entry) => entry.id === areaId) ?? MAP_AREAS[0];
  if (state.player.stamina < area.stamina) {
    return pushLog(state, "スタミナが足りない。ログインボーナスか宿で回復しよう。");
  }

  state.player.stamina -= area.stamina;
  state.floor = area.floor;
  state.location = area.name;
  state.phase = "battle";
  state.view = "adventure";
  state.enemy = createEnemy(area.floor);
  state.turn += 1;
  addDiscovery(state, state.enemy.id);
  pushHistory(state, `${area.name}へ出発`);
  return setAction(
    pushLog(state, `${area.name}へ出発。${state.enemy.name}が現れた。`),
    "enemy",
    area.id
  );
}

function warpTo(state: GameState, warpId: string): GameState {
  const warp = WARP_POINTS.find((entry) => entry.id === warpId);
  if (!warp) {
    return pushLog(state, "そのワープ地点は見つからない。");
  }
  if (state.floor < warp.unlockFloor) {
    return pushLog(state, "まだワープ地点が開放されていない。");
  }
  if (state.player.gold < warp.cost) {
    return pushLog(state, "ワープ費用が足りない。");
  }
  state.player.gold -= warp.cost;
  if (warp.areaId === "town") {
    return setAction(returnTown(state), "town", "warp-town");
  }
  const area = MAP_AREAS.find((entry) => entry.id === warp.areaId);
  if (!area) {
    return pushLog(state, "ワープ先エリアが見つからない。");
  }
  state.floor = area.floor;
  state.location = area.name;
  state.phase = "battle";
  state.view = "adventure";
  state.enemy = createEnemy(area.floor);
  state.turn += 1;
  addDiscovery(state, state.enemy.id);
  pushHistory(state, `${warp.name}へワープ`);
  return setAction(pushLog(state, `${warp.name}へワープ。${state.enemy.name}と遭遇。`), "enemy", "warp");
}

function executeSkill(state: GameState, skillId: string): GameState {
  const skill = SKILLS.find((entry) => entry.id === skillId) ?? SKILLS[0];
  if (skill.kind === "passive") {
    return pushLog(state, "パッシブスキルは戦闘中に発動済みです。");
  }
  if (!state.player.skills[skill.id]) {
    return pushLog(state, `${skill.name}はまだ習得していない。`);
  }
  if (skill.kind === "magic") {
    return castMagic(state, skill);
  }
  return attack(state, "skill", skill);
}

function attack(state: GameState, mode: "normal" | "skill", skill?: Skill): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "いまは戦闘中ではない。探索で敵を探そう。");
  }

  const skipReason = processActorStatus(state, "player");
  if (skipReason) {
    pushLogMutable(state, skipReason);
    if (state.phase === "defeat" || skipReason.includes("行動できない")) {
      state.turn += 1;
      return enemyCounter(state, false);
    }
  }

  const stats = getPlayerStats(state.player);
  const isSkill = mode === "skill";
  const mpCost = skill?.mpCost ?? 7;

  if (isSkill && state.player.mp < mpCost) {
    return pushLog(state, `MPが足りない。${skill?.name ?? "スキル"}を使えない。`);
  }

  if (isSkill) {
    state.player.mp -= mpCost;
  }

  const crit = Math.random() < (stats.luck + 2) / 100;
  const baseDamage = isSkill
    ? stats.atk * (1.45 + (state.player.skills[skill?.id ?? ""] ?? 1) * 0.12) + stats.luck * 0.5
    : stats.atk * 1.1;
  const damage = clamp(
    Math.round(baseDamage + randInt(0, 6) - state.enemy.def * 0.55),
    4,
    999
  );
  const finalDamage = crit ? Math.round(damage * 1.7) : damage;
  state.enemy.hp = Math.max(0, state.enemy.hp - finalDamage);
  wearEquipment(state, "weapon", 1);
  state.turn += 1;

  const line = isSkill
    ? `${skill?.name ?? "スキル"}で${state.enemy.name}に${finalDamage}ダメージ。`
    : `攻撃して${state.enemy.name}に${finalDamage}ダメージ。`;
  pushLogMutable(state, crit ? `${line} 会心の手応え。` : line);

  if (skill?.id === "venom-edge" && Math.random() < 0.45) {
    addStatus(state.enemy.statusEffects, "poison", 3);
    pushLogMutable(state, `${state.enemy.name}に毒を与えた。`);
  }

  if (state.enemy.hp <= 0) {
    return setAction(winBattle(state), "loot", "win");
  }

  return setAction(enemyCounter(state, false), isSkill ? "skill" : "attack", line);
}

function castMagic(state: GameState, skill: Skill): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "魔法を放つ相手がいない。");
  }
  const skipReason = processActorStatus(state, "player");
  if (skipReason) {
    pushLogMutable(state, skipReason);
    if (state.phase === "defeat" || skipReason.includes("行動できない")) {
      state.turn += 1;
      return enemyCounter(state, false);
    }
  }

  const stats = getPlayerStats(state.player);
  const level = state.player.skills[skill.id] ?? 1;
  if (state.player.mp < skill.mpCost) {
    return pushLog(state, `MPが足りない。${skill.name}を使えない。`);
  }
  state.player.mp -= skill.mpCost;
  const damage = clamp(
    Math.round(stats.atk * 1.2 + stats.luck * 0.8 + level * 8 - state.enemy.def * 0.25),
    8,
    999
  );
  state.enemy.hp = Math.max(0, state.enemy.hp - damage);
  state.turn += 1;
  pushLogMutable(state, `${skill.name}を放ち、${state.enemy.name}に${damage}ダメージ。`);
  if (Math.random() < 0.38) {
    addStatus(state.enemy.statusEffects, "burn", 3);
    pushLogMutable(state, `${state.enemy.name}が火傷を負った。`);
  }
  if (state.enemy.hp <= 0) {
    return setAction(winBattle(state), "loot", "magic-win");
  }
  return setAction(enemyCounter(state, false), "magic", skill.name);
}

function guard(state: GameState): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "盾を構えたが、周囲は静かだ。");
  }
  const skipReason = processActorStatus(state, "player");
  if (skipReason) {
    pushLogMutable(state, skipReason);
    if (state.phase === "defeat" || skipReason.includes("行動できない")) {
      state.turn += 1;
      return enemyCounter(state, false);
    }
  }
  state.turn += 1;
  pushLogMutable(state, "身を固めて敵の攻撃を受ける。");
  return setAction(enemyCounter(state, true), "attack", "guard");
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
    state.phase = "town";
    state.view = "home";
    state.location = "炉端の街アステル";
    state.enemy.hp = state.enemy.maxHp;
    state.day += Math.random() < 0.25 ? 1 : 0;
    return setAction(
      pushLog(
      state,
      forced
        ? "煙幕に紛れて距離を取った。街へ戻る。"
        : "すばやく距離を取り、街へ戻った。"
      ),
      "town",
      "flee"
    );
  }

  pushLogMutable(state, "逃走に失敗。敵が間合いを詰めてくる。");
  return setAction(enemyCounter(state, false), "enemy", "flee-failed");
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
      return setAction(winBattle(state), "loot", item.name);
    }
  }

  if (ensureBattle(state)) {
    return setAction(enemyCounter(state, false), "item", item.name);
  }
  return setAction(state, "item", item.name);
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
  ensureEquipmentMeta(state.player, itemId);
  addDiscoveredItem(state, itemId);
  return setAction(pushLog(state, `${item.name}を装備した。`), "town", item.name);
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
  addDiscoveredItem(state, recipe.output.itemId);
  if (recipe.station === "forge") {
    state.forgeRank = Math.min(5, state.forgeRank + 0.15);
  }
  if (recipe.station === "alchemy") {
    state.alchemyRank = Math.min(5, state.alchemyRank + 0.15);
  }

  const output = ITEM_BY_ID[recipe.output.itemId];
  unlockAchievement(state, "crafter");
  pushHistory(state, `${recipe.name}を作成`);
  return setAction(
    pushLog(
      state,
      `${recipe.name}を${recipe.station === "alchemy" ? "錬成" : "合成"}した。${output?.name ?? "成果物"} x${recipe.output.qty}を入手。`
    ),
    "town",
    recipe.name
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
  return setAction(pushLog(state, `${item.name}を分解し、素材を回収した。`), "town", "salvage");
}

function explore(state: GameState): GameState {
  if (state.phase === "battle") {
    return pushLog(state, "敵が目の前にいる。まず戦闘を決着させよう。");
  }

  state.phase = "explore";
  state.view = "adventure";
  state.turn += 1;
  const roll = Math.random();

  if (roll < 0.46) {
    const herbQty = randInt(1, 3);
    const shardQty = Math.random() < 0.5 ? randInt(1, 2) : 0;
    addInventory(state.player, "moon-herb", herbQty);
    addDiscoveredItem(state, "moon-herb");
    if (shardQty > 0) {
      addInventory(state.player, "iron-shard", shardQty);
      addDiscoveredItem(state, "iron-shard");
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
    state.view = "adventure";
    addDiscovery(state, state.enemy.id);
    return pushLog(
      state,
      `階層${state.floor}へ進んだ。${state.enemy.name}が立ちはだかる。`
    );
  }

  state.enemy = createEnemy(state.floor);
  state.phase = "battle";
  state.view = "adventure";
  addDiscovery(state, state.enemy.id);
  return pushLog(state, `${state.enemy.biome}で${state.enemy.name}と遭遇。`);
}

function nextBattle(state: GameState): GameState {
  const shouldAdvance = state.phase === "victory" && Math.random() < 0.55;
  if (shouldAdvance) {
    state.floor = Math.min(5, state.floor + 1);
  }
  state.phase = "battle";
  state.view = "adventure";
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
  state.player.stamina = state.player.maxStamina;
  state.player.statusEffects = [];
  state.phase = "town";
  state.view = "home";
  state.location = "炉端の街アステル";
  state.enemy.hp = state.enemy.maxHp;
  return setAction(
    pushLog(
      state,
      cost > 0
        ? `宿で休んだ。${cost}Gを支払い、HP、MP、スタミナが全快。`
        : "救護所で目を覚ました。HP、MP、スタミナが全快。"
    ),
    "town",
    "inn"
  );
}

function buyItem(state: GameState, itemId: string): GameState {
  const shopItem = SHOP_ITEMS.find((entry) => entry.itemId === itemId);
  const item = ITEM_BY_ID[itemId];
  if (!shopItem || !item) {
    return pushLog(state, "その商品は店に並んでいない。");
  }
  if (state.player.gold < shopItem.price) {
    return pushLog(state, "ゴールドが足りない。");
  }
  state.player.gold -= shopItem.price;
  addInventory(state.player, itemId, 1);
  addDiscoveredItem(state, itemId);
  return setAction(pushLog(state, `${item.name}を${shopItem.price}Gで購入した。`), "town", "buy");
}

function sellItem(state: GameState, itemId: string): GameState {
  const item = ITEM_BY_ID[itemId];
  if (!item || inventoryCount(state.player, itemId) <= 0) {
    return pushLog(state, "売るアイテムがない。");
  }
  if (Object.values(state.player.equipment).includes(itemId)) {
    return pushLog(state, "装備中の品は売れない。");
  }
  const price = Math.max(1, Math.floor(item.value * 0.55));
  removeInventory(state.player, itemId, 1);
  state.player.gold += price;
  return setAction(pushLog(state, `${item.name}を${price}Gで売却した。`), "town", "sell");
}

function upgradeSkill(state: GameState, skillId: string): GameState {
  const skill = SKILLS.find((entry) => entry.id === skillId);
  if (!skill) {
    return pushLog(state, "そのスキルは存在しない。");
  }
  if (state.player.level < skill.unlockLevel) {
    return pushLog(state, "レベルが足りず習得できない。");
  }
  if (state.player.skillPoints <= 0) {
    return pushLog(state, "スキルポイントが足りない。");
  }
  const current = state.player.skills[skill.id] ?? 0;
  state.player.skills[skill.id] = current + 1;
  state.player.skillPoints -= 1;
  if (skill.kind === "passive" && !state.player.passiveSkills.includes(skill.id)) {
    state.player.passiveSkills.push(skill.id);
  }
  return setAction(pushLog(state, `${skill.name}をLv ${current + 1}に強化した。`), "town", "skill");
}

function unlockPassive(state: GameState, skillId: string): GameState {
  const skill = SKILLS.find((entry) => entry.id === skillId && entry.kind === "passive");
  if (!skill) {
    return pushLog(state, "そのパッシブは存在しない。");
  }
  if (state.player.level < skill.unlockLevel || state.player.skillPoints < 1) {
    return pushLog(state, "パッシブ習得条件を満たしていない。");
  }
  if (!state.player.passiveSkills.includes(skill.id)) {
    state.player.passiveSkills.push(skill.id);
  }
  state.player.skills[skill.id] = Math.max(1, state.player.skills[skill.id] ?? 1);
  state.player.skillTree[`passive-${skill.id}`] = true;
  state.player.skillPoints -= 1;
  return setAction(pushLog(state, `${skill.name}をパッシブに設定した。`), "town", "passive");
}

function classChange(state: GameState, classId: string): GameState {
  const nextClass = CLASSES.find((entry) => entry.id === classId);
  if (!nextClass) {
    return pushLog(state, "その職業は存在しない。");
  }
  if (state.player.level < nextClass.unlockLevel) {
    return pushLog(state, "転職に必要なレベルが足りない。");
  }
  if (state.player.gold < nextClass.cost) {
    return pushLog(state, "転職費用が足りない。");
  }
  state.player.gold -= nextClass.cost;
  state.player.classId = nextClass.id;
  state.player.className = nextClass.name;
  state.player.skills[nextClass.skillId] = Math.max(1, state.player.skills[nextClass.skillId] ?? 1);
  clampPlayerVitals(state.player);
  return setAction(pushLog(state, `${nextClass.name}へ転職した。`), "town", "class");
}

function awaken(state: GameState): GameState {
  const cost = 180 + state.player.awakening * 120;
  if (state.player.gold < cost || inventoryCount(state.player, "aether-dust") < 2) {
    return pushLog(state, "覚醒に必要なゴールドか霊銀の粉が足りない。");
  }
  state.player.gold -= cost;
  removeInventory(state.player, "aether-dust", 2);
  state.player.awakening += 1;
  state.player.skillPoints += 1;
  clampPlayerVitals(state.player);
  return setAction(pushLog(state, `覚醒段階が${state.player.awakening}になった。`), "town", "awaken");
}

function evolve(state: GameState): GameState {
  if (inventoryCount(state.player, "dragon-contract") < 1) {
    return pushLog(state, "進化には竜騎契約書が必要。");
  }
  removeInventory(state.player, "dragon-contract", 1);
  state.player.evolution += 1;
  state.player.skillPoints += 1;
  return setAction(pushLog(state, `進化段階が${state.player.evolution}になった。`), "town", "evolve");
}

function limitBreak(state: GameState): GameState {
  const cost = 240 + state.player.limitBreak * 160;
  if (state.player.gold < cost || state.player.level < 3) {
    return pushLog(state, "限界突破条件を満たしていない。");
  }
  state.player.gold -= cost;
  state.player.limitBreak += 1;
  state.player.expToNext = Math.round(state.player.expToNext * 0.92);
  return setAction(pushLog(state, `限界突破 +${state.player.limitBreak}。必要経験値が少し下がった。`), "town", "limit");
}

function rankUp(state: GameState): GameState {
  const cost = 90 + state.player.rank * 35;
  if (state.player.gold < cost) {
    return pushLog(state, "ランクアップ費用が足りない。");
  }
  state.player.gold -= cost;
  state.player.rank += 1;
  state.player.maxStamina += state.player.rank % 2 === 0 ? 2 : 1;
  state.player.stamina = state.player.maxStamina;
  return setAction(pushLog(state, `冒険者ランクが${state.player.rank}に上がった。`), "town", "rank");
}

function refineEquipment(state: GameState, itemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  if (!item) {
    return pushLog(state, "精錬できる装備がない。");
  }
  const meta = ensureEquipmentMeta(state.player, itemId);
  const cost = 45 + Math.max(0, meta.refinement) * 25;
  if (state.player.gold < cost) {
    return pushLog(state, "精錬費用が足りない。");
  }
  state.player.gold -= cost;
  const roll = Math.random();
  if (roll < 0.12) {
    meta.refinement = Math.max(-2, meta.refinement - 1);
    meta.durability = Math.max(20, meta.durability - 18);
    return setAction(pushLog(state, `${item.name}の精錬に失敗。精錬値が${meta.refinement}になった。`), "town", "refine");
  }
  if (roll < 0.28) {
    meta.durability = Math.max(1, meta.durability - 28);
    return setAction(pushLog(state, `${item.name}の精錬は不安定。値は変わらず耐久が下がった。`), "town", "refine");
  }
  meta.refinement += roll > 0.92 ? 2 : 1;
  meta.durability = Math.max(10, meta.durability - 8);
  unlockAchievement(state, "refiner");
  return setAction(pushLog(state, `${item.name}の精錬成功。精錬値 +${meta.refinement}。`), "town", "refine");
}

function enhanceEquipment(state: GameState, itemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  if (!item) {
    return pushLog(state, "強化できる装備がない。");
  }
  if (state.player.gold < 70 || inventoryCount(state.player, "iron-shard") < 2) {
    return pushLog(state, "強化費用か鉄のかけらが足りない。");
  }
  state.player.gold -= 70;
  removeInventory(state.player, "iron-shard", 2);
  const meta = ensureEquipmentMeta(state.player, itemId);
  meta.randomOptions.push({
    stat: item.slot === "weapon" ? "atk" : "def",
    value: randInt(1, 3)
  });
  return setAction(pushLog(state, `${item.name}にランダムオプションを追加した。`), "town", "enhance");
}

function rerollEquipmentOptions(state: GameState, itemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  if (!item) {
    return pushLog(state, "厳選する装備がない。");
  }
  const cost = item.rarity === "legendary" ? 160 : 90;
  if (state.player.gold < cost || inventoryCount(state.player, "aether-dust") < 1) {
    return pushLog(state, "厳選費用か霊銀の粉が足りない。");
  }
  state.player.gold -= cost;
  removeInventory(state.player, "aether-dust", 1);
  const meta = ensureEquipmentMeta(state.player, itemId);
  const optionCount = item.rarity === "legendary" ? 3 : 2;
  meta.randomOptions = Array.from({ length: optionCount }, () => {
    const stat = pick(["atk", "def", "agi", "luck", "maxHp", "maxMp"] as const);
    return {
      stat,
      value: randInt(1, stat.startsWith("max") ? 18 : 5)
    };
  });
  return setAction(pushLog(state, `${item.name}のランダムオプションを厳選した。`), "town", "reroll");
}

function enchantEquipment(state: GameState, itemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  if (!item) {
    return pushLog(state, "エンチャントできる装備がない。");
  }
  if (state.player.gold < 85 || inventoryCount(state.player, "aether-dust") < 1) {
    return pushLog(state, "エンチャント素材が足りない。");
  }
  state.player.gold -= 85;
  removeInventory(state.player, "aether-dust", 1);
  const meta = ensureEquipmentMeta(state.player, itemId);
  const stat = pick(["atk", "def", "agi", "luck", "maxHp", "maxMp"] as const);
  meta.enchant = { stat, value: randInt(1, stat.startsWith("max") ? 12 : 4) };
  return setAction(pushLog(state, `${item.name}に${stat.toUpperCase()} +${meta.enchant.value}を付与。`), "town", "enchant");
}

function socketGem(state: GameState, itemId: string, gemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  const gem = ITEM_BY_ID[gemId];
  if (!item?.socketable || gem?.category !== "gem") {
    return pushLog(state, "ソケット対象か宝石が正しくない。");
  }
  if (inventoryCount(state.player, gemId) <= 0) {
    return pushLog(state, "装着する宝石を持っていない。");
  }
  const meta = ensureEquipmentMeta(state.player, itemId);
  if (meta.sockets.length >= 2) {
    return pushLog(state, "ソケットは最大2個まで。");
  }
  removeInventory(state.player, gemId, 1);
  meta.sockets.push(gemId);
  return setAction(pushLog(state, `${item.name}に${gem.name}を装着した。`), "town", "socket");
}

function repairEquipment(state: GameState, itemId: string): GameState {
  const item = requireOwnedEquipment(state, itemId);
  if (!item) {
    return pushLog(state, "修理する装備がない。");
  }
  const cost = 30;
  if (state.player.gold < cost) {
    return pushLog(state, "修理費が足りない。");
  }
  state.player.gold -= cost;
  ensureEquipmentMeta(state.player, itemId).durability = 100;
  return setAction(pushLog(state, `${item.name}を修理した。`), "town", "repair");
}

function drawGacha(state: GameState): GameState {
  const cost = 100;
  if (state.player.gold < cost) {
    return pushLog(state, "ガチャに必要なゴールドが足りない。");
  }
  state.player.gold -= cost;
  state.gachaPity += 1;
  const hitLegendary = state.gachaPity >= 12 || Math.random() < 0.04;
  const result = hitLegendary ? "starfall-sword" : weightedPick(GACHA_POOL);
  if (hitLegendary) {
    state.gachaPity = 0;
  }
  addInventory(state.player, result, 1);
  addDiscoveredItem(state, result);
  if (ITEM_BY_ID[result]?.category === "pet" && !state.pets.includes(result)) {
    state.pets.push(result);
    state.player.activePet = result;
  }
  if (ITEM_BY_ID[result]?.category === "mount" && !state.mounts.includes(result)) {
    state.mounts.push(result);
    state.player.activeMount = result;
  }
  if (ITEM_BY_ID[result]?.rarity === "legendary") {
    unlockAchievement(state, "legend-hunter");
    updateQuestProgress(state, "event-starfall", 1);
  }
  return setAction(pushLog(state, `召喚結果: ${ITEM_BY_ID[result]?.name ?? result}を入手。`), "loot", "gacha");
}

function claimLoginBonus(state: GameState): GameState {
  if (state.loginBonusClaimedDay === state.day) {
    return pushLog(state, "今日のログインボーナスは受け取り済み。");
  }
  state.loginBonusClaimedDay = state.day;
  state.player.gold += 80;
  state.player.stamina = state.player.maxStamina;
  addInventory(state.player, "potion", 1);
  return setAction(pushLog(state, "ログインボーナス: 80G、薬草ポーション、スタミナ全快。"), "town", "login");
}

function guildDonate(state: GameState): GameState {
  const cost = 60;
  if (state.player.gold < cost) {
    return pushLog(state, "ギルド寄付に必要なゴールドが足りない。");
  }
  state.player.gold -= cost;
  state.guild.contribution += 20;
  if (state.guild.contribution >= state.guild.level * 60) {
    state.guild.contribution = 0;
    state.guild.level += 1;
    state.player.skillPoints += 1;
    unlockAchievement(state, "guild-hand");
    return setAction(pushLog(state, `ギルドLv ${state.guild.level}。スキルポイントを得た。`), "town", "guild");
  }
  return setAction(pushLog(state, "ギルドへ貢献した。ギルドショップの品揃えがよくなる。"), "town", "guild");
}

function trainCompanion(state: GameState, kind: "pet" | "mount"): GameState {
  const target = kind === "pet" ? state.player.activePet : state.player.activeMount;
  if (!target) {
    return pushLog(state, kind === "pet" ? "ペットがいない。" : "マウントがいない。");
  }
  if (state.player.gold < 40) {
    return pushLog(state, "訓練費用が足りない。");
  }
  state.player.gold -= 40;
  state.player.rank += kind === "pet" ? 0 : 1;
  state.player.skillPoints += kind === "pet" ? 1 : 0;
  return setAction(pushLog(state, `${ITEM_BY_ID[target]?.name ?? target}を訓練した。`), "town", kind);
}

function setBattleSpeed(state: GameState, value: string): GameState {
  state.battleSpeed = value === "4" ? 4 : value === "2" ? 2 : 1;
  return setAction(pushLog(state, `バトル速度を${state.battleSpeed}倍にした。`), "town", "speed");
}

function toggleAutoBattle(state: GameState): GameState {
  state.autoBattle = !state.autoBattle;
  return setAction(pushLog(state, `オート戦闘を${state.autoBattle ? "ON" : "OFF"}にした。`), "town", "auto");
}

function runAutoBattle(state: GameState): GameState {
  if (!ensureBattle(state)) {
    return pushLog(state, "オート戦闘を行う敵がいない。");
  }
  let nextState = state;
  const turns = nextState.battleSpeed;
  for (let index = 0; index < turns; index += 1) {
    if (!ensureBattle(nextState)) {
      break;
    }
    const skill = nextState.player.mp >= 8 && nextState.player.skills.firebolt ? "firebolt" : "power-slash";
    nextState = executeSkill(nextState, skill);
    if (nextState.phase === "defeat" || nextState.phase === "victory") {
      break;
    }
  }
  return setAction(nextState, "attack", "auto");
}

function storyChoice(state: GameState, value: string): GameState {
  if (value === "guild") {
    state.storyFlags.guildRoute = true;
    addInventory(state.player, "dragon-contract", 1);
    return setAction(pushLog(state, "ギルド長の依頼を受けた。竜騎契約書を預かった。"), "town", "story");
  }
  state.storyFlags.independentRoute = true;
  state.player.gold += 30;
  return setAction(pushLog(state, "単独調査を選んだ。準備金30Gを得た。"), "town", "story");
}

function setTitle(state: GameState, titleId: string): GameState {
  if (!state.titles.includes(titleId)) {
    return pushLog(state, "その称号は未獲得。");
  }
  state.player.title = titleId;
  return setAction(pushLog(state, "称号を変更した。"), "town", "title");
}

function enemyCounter(state: GameState, guarded: boolean): GameState {
  const enemyStatusLine = processActorStatus(state, "enemy");
  if (enemyStatusLine) {
    pushLogMutable(state, enemyStatusLine);
    if (state.enemy.hp <= 0) {
      return winBattle(state);
    }
    if (enemyStatusLine.includes("行動できない")) {
      return state;
    }
  }
  const stats = getPlayerStats(state.player);
  const rawDamage = state.enemy.atk + randInt(0, 6) - stats.def * 0.5;
  const damage = clamp(Math.round(rawDamage * (guarded ? 0.45 : 1)), 1, 999);
  state.player.hp = Math.max(0, state.player.hp - damage);
  wearEquipment(state, "armor", guarded ? 1 : 2);
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
    setAction(state, "enemy", "defeat");
  } else if (Math.random() < 0.14) {
    const effect = pick(["poison", "paralysis", "sleep"] as const);
    addStatus(state.player.statusEffects, effect, effect === "sleep" ? 1 : 3);
    pushLogMutable(state, `${state.enemy.name}の追加効果。${statusLabel(effect)}を受けた。`);
  }
  return state;
}

function winBattle(state: GameState): GameState {
  const enemy = state.enemy;
  state.phase = "victory";
  state.player.gold += enemy.gold;
  state.player.exp += enemy.exp;

  const drops = rollDrops(enemy.drops, getPlayerStats(state.player).luck);
  drops.forEach((drop) => {
    addInventory(state.player, drop.itemId, drop.qty);
    addDiscoveredItem(state, drop.itemId);
    if (ITEM_BY_ID[drop.itemId]?.rarity === "legendary") {
      unlockAchievement(state, "legend-hunter");
      updateQuestProgress(state, "event-starfall", drop.qty);
    }
  });
  state.lastDrops = drops;
  updateQuestProgress(state, "daily-hunt", 1);
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
  unlockAchievement(state, "first-blood");
  pushHistory(state, `${enemy.name}を撃破`);
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
    state.player.skillPoints += 1;
    leveled = true;
  }

  if (leveled) {
    const stats = getPlayerStats(state.player);
    state.player.hp = stats.maxHp;
    state.player.mp = stats.maxMp;
    pushLogMutable(
      state,
      `レベル${state.player.level}に上がった。ステータス上昇とスキルポイントを獲得。`
    );
    SKILLS.filter((skill) => skill.unlockLevel <= state.player.level).forEach((skill) => {
      if (skill.kind !== "passive") {
        state.player.skills[skill.id] = Math.max(1, state.player.skills[skill.id] ?? 0);
      }
    });
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
    statusEffects: [],
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
    state.player.exp += quest.rewardExp;
    addInventory(state.player, quest.rewardItemId, 1);
    addDiscoveredItem(state, quest.rewardItemId);
    pushLogMutable(
      state,
      `依頼「${quest.title}」達成。${quest.rewardGold}G、${quest.rewardExp}EXP、${ITEM_BY_ID[quest.rewardItemId]?.name ?? "報酬"}を受け取った。`
    );
    levelUpIfNeeded(state);
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

function loadState(stateJson: string, fallback: GameState): GameState {
  try {
    const parsed = JSON.parse(stateJson) as GameState;
    return setAction(normalizeState(parsed), "town", "ロード完了");
  } catch {
    return pushLog(normalizeState(structuredClone(fallback)), "ロードデータを読み込めなかった。");
  }
}

function createEquipmentMeta(): EquipmentMeta {
  return {
    refinement: 0,
    durability: 100,
    sockets: [],
    randomOptions: []
  };
}

function ensureEquipmentMeta(player: PlayerState, itemId: string): EquipmentMeta {
  player.equipmentMeta ??= {};
  player.equipmentMeta[itemId] ??= createEquipmentMeta();
  return player.equipmentMeta[itemId];
}

function requireOwnedEquipment(state: GameState, itemId: string): Item | undefined {
  const item = ITEM_BY_ID[itemId];
  if (!item?.slot || inventoryCount(state.player, itemId) <= 0) {
    return undefined;
  }
  ensureEquipmentMeta(state.player, itemId);
  return item;
}

function wearEquipment(state: GameState, slot: EquipmentSlot, amount: number): void {
  const itemId = state.player.equipment[slot];
  if (!itemId) {
    return;
  }
  const meta = ensureEquipmentMeta(state.player, itemId);
  meta.durability = Math.max(0, meta.durability - amount);
  if (meta.durability === 0) {
    pushLogMutable(state, `${ITEM_BY_ID[itemId]?.name ?? "装備"}の耐久値が尽きた。修理が必要。`);
  }
}

function processActorStatus(state: GameState, actor: "player" | "enemy"): string | undefined {
  const effects = actor === "player" ? state.player.statusEffects : state.enemy.statusEffects;
  if (effects.length === 0) {
    return undefined;
  }

  const holder = actor === "player" ? state.player.name : state.enemy.name;
  const lines: string[] = [];
  for (const effect of effects) {
    if (effect.kind === "poison" || effect.kind === "burn") {
      const damage = effect.kind === "poison" ? 6 : 9;
      if (actor === "player") {
        state.player.hp = Math.max(0, state.player.hp - damage);
      } else {
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
      }
      lines.push(`${holder}は${statusLabel(effect.kind)}で${damage}ダメージ。`);
    }
    effect.turns -= 1;
  }

  const skip = effects.some(
    (effect) =>
      effect.turns >= 0 &&
      ((effect.kind === "sleep" && Math.random() < 0.72) ||
        (effect.kind === "paralysis" && Math.random() < 0.42))
  );
  const skipEffect = effects.find((effect) => effect.kind === "sleep" || effect.kind === "paralysis");
  const active = effects.filter((effect) => effect.turns > 0);
  if (actor === "player") {
    state.player.statusEffects = active;
  } else {
    state.enemy.statusEffects = active;
  }
  if (state.player.hp <= 0 && actor === "player") {
    state.phase = "defeat";
  }
  if (skip && skipEffect) {
    lines.push(`${holder}は${statusLabel(skipEffect.kind)}で行動できない。`);
  }
  return lines.length > 0 ? lines.join(" ") : undefined;
}

function addStatus(effects: StatusEffect[], kind: StatusKind, turns: number): void {
  const current = effects.find((effect) => effect.kind === kind);
  if (current) {
    current.turns = Math.max(current.turns, turns);
    return;
  }
  effects.push({ kind, turns });
}

function statusLabel(kind: StatusKind): string {
  return {
    poison: "毒",
    paralysis: "麻痺",
    sleep: "睡眠",
    burn: "火傷"
  }[kind];
}

function addDiscoveredItem(state: GameState, itemId: string): void {
  if (!state.discoveredItems.includes(itemId)) {
    state.discoveredItems.push(itemId);
  }
}

function unlockAchievement(state: GameState, achievementId: string): void {
  if (!ACHIEVEMENTS.some((entry) => entry.id === achievementId)) {
    return;
  }
  if (!state.achievements.includes(achievementId)) {
    state.achievements.push(achievementId);
    pushLogMutable(state, `実績を解除: ${achievementId}`);
  }
  if (achievementId === "legend-hunter" && !state.titles.includes("star-seeker")) {
    state.titles.push("star-seeker");
  }
  if (achievementId === "first-blood" && !state.titles.includes("lucky")) {
    state.titles.push("lucky");
  }
}

function setAction(state: GameState, kind: GameState["lastAction"]["kind"], message: string): GameState {
  state.lastAction = {
    kind,
    message,
    seed: state.turn + randInt(1, 9999)
  };
  return state;
}

function pushHistory(state: GameState, line: string): void {
  state.playHistory = [line, ...state.playHistory].slice(0, 12);
}

function weightedPick(pool: Array<{ itemId: string; weight: number }>): string {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.itemId;
    }
  }
  return pool[0]?.itemId ?? "potion";
}

function pick<T>(entries: readonly T[]): T {
  return entries[Math.floor(Math.random() * entries.length)];
}

function viewLabel(view: GameView): string {
  return {
    home: "街",
    adventure: "冒険",
    character: "プレイヤー",
    inventory: "アイテム",
    equipment: "装備",
    craft: "クラフト",
    shop: "店",
    quests: "クエスト",
    codex: "図鑑",
    guild: "ギルド",
    gacha: "ガチャ",
    data: "データ管理"
  }[view];
}

function ensureBattle(state: GameState): boolean {
  return state.phase === "battle" && state.enemy.hp > 0;
}

function normalizeState(state: GameState): GameState {
  state.phase = state.phase ?? "town";
  state.view = state.view ?? (state.phase === "battle" ? "adventure" : "home");
  state.location = state.location ?? "炉端の街アステル";
  state.log = state.log.slice(0, MAX_LOG_LINES);
  state.quests = state.quests.map((quest): Quest => ({ ...quest }));
  state.lastDrops = state.lastDrops ?? [];
  state.discoveredEnemies = state.discoveredEnemies ?? [state.enemy.id];
  state.discoveredItems = state.discoveredItems ?? Object.keys(state.player.inventory);
  state.achievements = state.achievements ?? [];
  state.titles = state.titles ?? ["rookie"];
  state.pets = state.pets ?? [];
  state.mounts = state.mounts ?? [];
  state.guild = state.guild ?? { name: "白灯ギルド", level: 1, contribution: 0 };
  state.storyFlags = state.storyFlags ?? {};
  state.playHistory = state.playHistory ?? [];
  state.loginBonusClaimedDay = state.loginBonusClaimedDay ?? 0;
  state.gachaPity = state.gachaPity ?? 0;
  state.battleSpeed = state.battleSpeed ?? 1;
  state.autoBattle = state.autoBattle ?? false;
  state.lastAction = state.lastAction ?? { kind: "idle", seed: state.turn, message: "" };
  state.player.classId = state.player.classId ?? "wanderer";
  state.player.className = state.player.className ?? "放浪者";
  state.player.stamina = state.player.stamina ?? 24;
  state.player.maxStamina = state.player.maxStamina ?? 24;
  state.player.rank = state.player.rank ?? 1;
  state.player.awakening = state.player.awakening ?? 0;
  state.player.evolution = state.player.evolution ?? 0;
  state.player.limitBreak = state.player.limitBreak ?? 0;
  state.player.skillPoints = state.player.skillPoints ?? 0;
  state.player.title = state.player.title ?? "rookie";
  state.player.statusEffects = state.player.statusEffects ?? [];
  state.player.skills = state.player.skills ?? { "power-slash": 1 };
  state.player.passiveSkills = state.player.passiveSkills ?? [];
  state.player.skillTree = state.player.skillTree ?? {};
  state.player.equipmentMeta = state.player.equipmentMeta ?? {};
  Object.values(state.player.equipment).forEach((itemId) => {
    if (itemId) {
      ensureEquipmentMeta(state.player, itemId);
    }
  });
  state.enemy.statusEffects = state.enemy.statusEffects ?? [];
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

"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import {
  Backpack,
  Bed,
  Boxes,
  ChevronRight,
  Coins,
  Compass,
  FlaskConical,
  Footprints,
  Gem,
  Hammer,
  Heart,
  PackageOpen,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  WandSparkles
} from "lucide-react";
import { runGameCommand } from "@/app/actions";
import { ENEMIES, ITEM_BY_ID, RECIPES } from "@/lib/game/data";
import {
  canCraft,
  getItem,
  getPlayerStats,
  inventoryCount,
  inventoryItems,
  visibleRecipes
} from "@/lib/game/selectors";
import type {
  EnemyTemplate,
  GameState,
  Item,
  Recipe,
  Station
} from "@/lib/game/types";

type Tab = "battle" | "bag" | "gear" | "craft" | "codex";

type CommandButtonProps = {
  action: (payload: FormData) => void;
  command: string;
  label: string;
  detail?: string;
  itemId?: string;
  recipeId?: string;
  disabled?: boolean;
  icon: ReactNode;
};

const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "battle", label: "戦闘", icon: <Swords size={16} /> },
  { id: "bag", label: "バッグ", icon: <Backpack size={16} /> },
  { id: "gear", label: "装備", icon: <Shield size={16} /> },
  { id: "craft", label: "工房", icon: <Hammer size={16} /> },
  { id: "codex", label: "図鑑", icon: <ScrollText size={16} /> }
];

const stationLabels: Record<Station, string> = {
  synthesis: "合成",
  forge: "鍛冶",
  alchemy: "錬成"
};

const categoryLabels: Record<Item["category"], string> = {
  consumable: "道具",
  material: "素材",
  weapon: "武器",
  armor: "防具",
  accessory: "装飾品",
  relic: "レリック"
};

const spritePalette: Record<string, string> = {
  ".": "transparent",
  A: "#101820",
  B: "#f4d35e",
  C: "#1f8a70",
  D: "#44c2b8",
  E: "#d95d39",
  F: "#f7f0d6",
  G: "#6b4f3f",
  H: "#8a8f98",
  I: "#c9d1d9",
  J: "#7a4cff",
  K: "#2f4858",
  L: "#d7263d",
  M: "#92d050",
  N: "#3b6ea8",
  O: "#9b5de5",
  P: "#f15bb5",
  Q: "#00bbf9"
};

const sprites: Record<string, string[]> = {
  hero: [
    ".....BB.....",
    "....BFFB....",
    "....FAFB....",
    "...BBABB....",
    "..CCBCBCC...",
    "..C.CBC.C...",
    "....CBC.....",
    "...GG.GG....",
    "...G...G....",
    "..HH...HH...",
    ".HH.....HH.."
  ],
  slime: [
    "............",
    "............",
    "....DDDD....",
    "...DQQQQD...",
    "..DQQFFQQD..",
    "..DQQAAQQD..",
    "..DQQQQQQD..",
    "...DQQQQD...",
    "....DDDD....",
    "...D....D...",
    "............"
  ],
  bandit: [
    ".....GG.....",
    "....GFFG....",
    "...GFAAFG...",
    "..HHHGGHHH..",
    ".H..GEEG..H.",
    "....GEEG....",
    "...GG..GG...",
    "...G....G...",
    "..HH....HH..",
    ".HH......HH.",
    "............"
  ],
  knight: [
    ".....II.....",
    "....IAAI....",
    "...IIAAII...",
    "..IIIIIIII..",
    "..IILLLLII..",
    ".IIIKKKKIII.",
    "....IKKI....",
    "...II..II...",
    "..II....II..",
    ".II......II.",
    "............"
  ],
  mage: [
    ".....OO.....",
    "....OQQO....",
    "...OFAAFQ...",
    "..OOOJJOOO..",
    ".O..OJJQ..O.",
    "....OJJQ....",
    "...OO..OO...",
    "...O....O...",
    "..PP....PP..",
    ".PP......PP.",
    "............"
  ],
  warden: [
    ".....QQ.....",
    "....QIIQ....",
    "...QIAAIQ...",
    "..QQQNNQQQ..",
    ".Q..NLLN..Q.",
    "....NLLN....",
    "...QQNNQQ...",
    "..QQ....QQ..",
    ".QQ......QQ.",
    "QQ........QQ",
    "............"
  ]
};

export function RpgShell({ initialState }: { initialState: GameState }) {
  const [state, formAction, isPending] = useActionState(
    runGameCommand,
    initialState
  );
  const [activeTab, setActiveTab] = useState<Tab>("battle");
  const stats = getPlayerStats(state.player);
  const carriedItems = useMemo(() => inventoryItems(state.player), [state]);
  const learnedRecipes = useMemo(
    () => visibleRecipes(state.player.level),
    [state.player.level]
  );
  const battleLocked = isPending || state.phase !== "battle";
  const hpPercent = percent(state.player.hp, stats.maxHp);
  const mpPercent = percent(state.player.mp, stats.maxMp);
  const expPercent = percent(state.player.exp, state.player.expToNext);
  const enemyPercent = percent(state.enemy.hp, state.enemy.maxHp);

  return (
    <main className="app-frame">
      <section className="game-shell" aria-label="Pixel Relic RPG">
        <header className="top-bar">
          <div>
            <p className="eyebrow">PIXEL RELIC</p>
            <h1>古代炉の探索者</h1>
          </div>
          <div className="wallet" aria-label="所持金">
            <Coins size={16} />
            <strong>{state.player.gold}</strong>
            <span>G</span>
          </div>
        </header>

        <section className="scene-panel">
          <div className="scene-meta">
            <span>DAY {state.day}</span>
            <span>FLOOR {state.floor}</span>
            <span>{phaseLabel(state.phase)}</span>
          </div>
          <div className="battlefield" aria-label="戦闘フィールド">
            <div className="sprite-wrap hero-sprite">
              <PixelSprite spriteId="hero" label={state.player.name} />
              <span className="sprite-name">{state.player.name}</span>
            </div>
            <div className="ground-line" />
            <div className="sprite-wrap enemy-sprite">
              <PixelSprite spriteId={state.enemy.sprite} label={state.enemy.name} />
              <span className="sprite-name">{state.enemy.name}</span>
            </div>
          </div>
          <div className="enemy-card">
            <div>
              <p>{state.enemy.biome}</p>
              <h2>{state.enemy.name}</h2>
            </div>
            <div className="enemy-level">Lv {state.enemy.level}</div>
            <Meter
              label="ENEMY"
              value={state.enemy.hp}
              max={state.enemy.maxHp}
              percentValue={enemyPercent}
              tone="danger"
            />
          </div>
        </section>

        <section className="status-strip">
          <div className="status-main">
            <div className="avatar-chip">R</div>
            <div>
              <p>{state.player.name}</p>
              <strong>Lv {state.player.level}</strong>
            </div>
          </div>
          <div className="meter-stack">
            <Meter
              label="HP"
              value={state.player.hp}
              max={stats.maxHp}
              percentValue={hpPercent}
              tone="hp"
            />
            <Meter
              label="MP"
              value={state.player.mp}
              max={stats.maxMp}
              percentValue={mpPercent}
              tone="mp"
            />
            <Meter
              label="EXP"
              value={state.player.exp}
              max={state.player.expToNext}
              percentValue={expPercent}
              tone="exp"
            />
          </div>
        </section>

        <nav className="tab-bar" aria-label="ゲームメニュー">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <section className="content-panel">
          {activeTab === "battle" && (
            <BattlePanel
              state={state}
              action={formAction}
              isPending={isPending}
              disabled={battleLocked}
            />
          )}
          {activeTab === "bag" && (
            <BagPanel
              state={state}
              items={carriedItems}
              action={formAction}
              isPending={isPending}
            />
          )}
          {activeTab === "gear" && (
            <GearPanel
              state={state}
              items={carriedItems}
              action={formAction}
              isPending={isPending}
            />
          )}
          {activeTab === "craft" && (
            <CraftPanel
              state={state}
              recipes={learnedRecipes}
              action={formAction}
              isPending={isPending}
            />
          )}
          {activeTab === "codex" && <CodexPanel state={state} />}
        </section>
      </section>
    </main>
  );
}

function BattlePanel({
  state,
  action,
  isPending,
  disabled
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
  disabled: boolean;
}) {
  const consumables = inventoryItems(state.player).filter(
    (item) => item.category === "consumable"
  );
  const stats = getPlayerStats(state.player);

  return (
    <div className="panel-grid">
      <div className="command-grid">
        <CommandButton
          action={action}
          command="attack"
          label="戦う"
          detail={`ATK ${stats.atk}`}
          icon={<Swords size={18} />}
          disabled={disabled}
        />
        <CommandButton
          action={action}
          command="skill"
          label="魔法剣"
          detail="MP 7"
          icon={<WandSparkles size={18} />}
          disabled={disabled || state.player.mp < 7}
        />
        <CommandButton
          action={action}
          command="guard"
          label="守る"
          detail={`DEF ${stats.def}`}
          icon={<Shield size={18} />}
          disabled={disabled}
        />
        <CommandButton
          action={action}
          command="flee"
          label="逃げる"
          detail={`AGI ${stats.agi}`}
          icon={<Footprints size={18} />}
          disabled={disabled}
        />
        <CommandButton
          action={action}
          command="explore"
          label="探索"
          detail="素材と遭遇"
          icon={<Compass size={18} />}
          disabled={isPending || state.phase === "battle"}
        />
        <CommandButton
          action={action}
          command="next"
          label="次の敵"
          detail="戦利品後"
          icon={<ChevronRight size={18} />}
          disabled={isPending || state.phase === "battle"}
        />
        <CommandButton
          action={action}
          command="rest"
          label="休む"
          detail="HP/MP全快"
          icon={<Bed size={18} />}
          disabled={isPending || state.phase === "battle"}
        />
      </div>

      <div className="quick-items">
        <div className="section-title">
          <PackageOpen size={15} />
          <span>戦闘アイテム</span>
        </div>
        <div className="item-action-list">
          {consumables.length === 0 ? (
            <p className="empty-text">使える道具がありません。</p>
          ) : (
            consumables.slice(0, 4).map((item) => (
              <CommandButton
                key={item.id}
                action={action}
                command="item"
                itemId={item.id}
                label={item.name}
                detail={`x${item.qty}`}
                icon={<span className="kanji-icon">{item.icon}</span>}
                disabled={isPending || (state.phase !== "battle" && !item.heal)}
              />
            ))
          )}
        </div>
      </div>

      <LogPanel log={state.log} />
    </div>
  );
}

function BagPanel({
  state,
  items,
  action,
  isPending
}: {
  state: GameState;
  items: Array<Item & { qty: number }>;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <div className="section-title">
        <Backpack size={15} />
        <span>インベントリ</span>
      </div>
      <div className="inventory-list">
        {items.map((item) => (
          <article key={item.id} className={`item-row rarity-${item.rarity}`}>
            <div className="item-icon">{item.icon}</div>
            <div className="item-copy">
              <div>
                <strong>{item.name}</strong>
                <span>{categoryLabels[item.category]}</span>
              </div>
              <p>{item.description}</p>
            </div>
            <div className="item-count">x{item.qty}</div>
            {item.category === "consumable" && (
              <CommandButton
                action={action}
                command="item"
                itemId={item.id}
                label="使う"
                detail={state.phase === "battle" ? "ターン消費" : "回復"}
                icon={<Heart size={16} />}
                disabled={isPending}
              />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function GearPanel({
  state,
  items,
  action,
  isPending
}: {
  state: GameState;
  items: Array<Item & { qty: number }>;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  const stats = getPlayerStats(state.player);
  const equipment = items.filter((item) => item.slot);

  return (
    <div className="panel-grid">
      <div className="stat-board">
        {[
          ["HP", stats.maxHp],
          ["MP", stats.maxMp],
          ["ATK", stats.atk],
          ["DEF", stats.def],
          ["AGI", stats.agi],
          ["LUK", stats.luck]
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="slot-grid">
        {(["weapon", "armor", "accessory"] as const).map((slot) => {
          const item = getItem(state.player.equipment[slot] ?? "");
          return (
            <article key={slot} className="slot-card">
              <span>{slotLabel(slot)}</span>
              <strong>{item?.name ?? "未装備"}</strong>
              <p>{item?.description ?? "バッグから装備を選べます。"}</p>
            </article>
          );
        })}
      </div>

      <div className="section-title">
        <Shield size={15} />
        <span>装備変更と分解</span>
      </div>
      <div className="inventory-list compact">
        {equipment.map((item) => {
          const equipped = Object.values(state.player.equipment).includes(item.id);
          return (
            <article key={item.id} className={`item-row rarity-${item.rarity}`}>
              <div className="item-icon">{item.icon}</div>
              <div className="item-copy">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.slot ? slotLabel(item.slot) : ""}</span>
                </div>
                <p>{statsText(item)}</p>
              </div>
              <div className="gear-actions">
                <CommandButton
                  action={action}
                  command="equip"
                  itemId={item.id}
                  label={equipped ? "装備中" : "装備"}
                  icon={<Shield size={16} />}
                  disabled={isPending || equipped}
                />
                <CommandButton
                  action={action}
                  command="salvage"
                  itemId={item.id}
                  label="分解"
                  icon={<Boxes size={16} />}
                  disabled={isPending || equipped || item.qty < 1}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CraftPanel({
  state,
  recipes,
  action,
  isPending
}: {
  state: GameState;
  recipes: Recipe[];
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <div className="workshop-ranks">
        <div>
          <Hammer size={16} />
          <span>鍛冶ランク</span>
          <strong>{state.forgeRank.toFixed(1)}</strong>
        </div>
        <div>
          <FlaskConical size={16} />
          <span>錬成ランク</span>
          <strong>{state.alchemyRank.toFixed(1)}</strong>
        </div>
      </div>
      {(["synthesis", "forge", "alchemy"] as Station[]).map((station) => (
        <section key={station} className="recipe-section">
          <div className="section-title">
            {station === "alchemy" ? (
              <Sparkles size={15} />
            ) : station === "forge" ? (
              <Hammer size={15} />
            ) : (
              <FlaskConical size={15} />
            )}
            <span>{stationLabels[station]}</span>
          </div>
          <div className="recipe-list">
            {recipes
              .filter((recipe) => recipe.station === station)
              .map((recipe) => {
                const output = getItem(recipe.output.itemId);
                const ready = canCraft(state.player, recipe);
                return (
                  <article key={recipe.id} className="recipe-card">
                    <div className="item-icon">{recipe.icon}</div>
                    <div className="recipe-copy">
                      <strong>{recipe.name}</strong>
                      <p>{recipe.description}</p>
                      <div className="materials">
                        {recipe.requires.map((stack) => (
                          <span key={stack.itemId}>
                            {getItem(stack.itemId)?.name ?? stack.itemId}{" "}
                            {inventoryCount(state.player, stack.itemId)}/{stack.qty}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="recipe-output">
                      <span>{output?.icon}</span>
                      <strong>x{recipe.output.qty}</strong>
                    </div>
                    <CommandButton
                      action={action}
                      command={station === "alchemy" ? "alchemy" : "craft"}
                      recipeId={recipe.id}
                      label={stationLabels[station]}
                      icon={
                        station === "alchemy" ? (
                          <Sparkles size={16} />
                        ) : (
                          <Hammer size={16} />
                        )
                      }
                      disabled={isPending || !ready}
                    />
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      <LockedRecipes level={state.player.level} />
    </div>
  );
}

function CodexPanel({ state }: { state: GameState }) {
  return (
    <div className="panel-grid">
      <section className="quest-list">
        <div className="section-title">
          <Trophy size={15} />
          <span>依頼</span>
        </div>
        {state.quests.map((quest) => (
          <article key={quest.id} className={quest.completed ? "quest done" : "quest"}>
            <div>
              <strong>{quest.title}</strong>
              <p>{quest.description}</p>
            </div>
            <span>
              {quest.completed ? "DONE" : `${quest.progress}/${quest.target}`}
            </span>
          </article>
        ))}
      </section>

      <section className="codex-list">
        <div className="section-title">
          <Gem size={15} />
          <span>敵とドロップ</span>
        </div>
        {ENEMIES.map((enemy) => (
          <EnemyCodex
            key={enemy.id}
            enemy={enemy}
            discovered={state.discoveredEnemies.includes(enemy.id)}
          />
        ))}
      </section>
    </div>
  );
}

function EnemyCodex({
  enemy,
  discovered
}: {
  enemy: EnemyTemplate;
  discovered: boolean;
}) {
  return (
    <article className={discovered ? "enemy-codex" : "enemy-codex hidden-entry"}>
      <PixelSprite spriteId={enemy.sprite} label={enemy.name} mini />
      <div>
        <strong>{discovered ? enemy.name : "未発見"}</strong>
        <p>{discovered ? enemy.description : "探索で遭遇すると情報が開きます。"}</p>
        {discovered && (
          <div className="drop-tags">
            {enemy.drops.map((drop) => (
              <span key={drop.itemId}>{ITEM_BY_ID[drop.itemId]?.name}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function LockedRecipes({ level }: { level: number }) {
  const locked = RECIPES.filter((recipe) => recipe.unlockLevel > level);
  if (locked.length === 0) {
    return null;
  }

  return (
    <section className="locked-recipes">
      <div className="section-title">
        <ScrollText size={15} />
        <span>未開放レシピ</span>
      </div>
      <div className="drop-tags">
        {locked.map((recipe) => (
          <span key={recipe.id}>
            Lv {recipe.unlockLevel} {recipe.name}
          </span>
        ))}
      </div>
    </section>
  );
}

function LogPanel({ log }: { log: string[] }) {
  return (
    <section className="battle-log" aria-label="戦闘ログ">
      <div className="section-title">
        <ScrollText size={15} />
        <span>ログ</span>
      </div>
      <ol>
        {log.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ol>
    </section>
  );
}

function CommandButton({
  action,
  command,
  label,
  detail,
  itemId,
  recipeId,
  disabled,
  icon
}: CommandButtonProps) {
  return (
    <form action={action} className="command-form">
      <input type="hidden" name="command" value={command} />
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      {recipeId && <input type="hidden" name="recipeId" value={recipeId} />}
      <button type="submit" className="command-button" disabled={disabled}>
        <span className="button-icon">{icon}</span>
        <span className="button-copy">
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
    </form>
  );
}

function Meter({
  label,
  value,
  max,
  percentValue,
  tone
}: {
  label: string;
  value: number;
  max: number;
  percentValue: number;
  tone: "hp" | "mp" | "exp" | "danger";
}) {
  return (
    <div className={`meter meter-${tone}`}>
      <div className="meter-label">
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="meter-track">
        <span style={{ inlineSize: `${percentValue}%` }} />
      </div>
    </div>
  );
}

function PixelSprite({
  spriteId,
  label,
  mini = false
}: {
  spriteId: string;
  label: string;
  mini?: boolean;
}) {
  const rows = sprites[spriteId] ?? sprites.slime;
  return (
    <div
      className={mini ? "pixel-sprite mini" : "pixel-sprite"}
      role="img"
      aria-label={label}
      style={{
        gridTemplateColumns: `repeat(${rows[0].length}, 1fr)`
      }}
    >
      {rows.join("").split("").map((pixel, index) => (
        <span
          key={`${pixel}-${index}`}
          style={{ background: spritePalette[pixel] ?? "transparent" }}
        />
      ))}
    </div>
  );
}

function percent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function phaseLabel(phase: GameState["phase"]): string {
  return {
    battle: "BATTLE",
    explore: "EXPLORE",
    victory: "VICTORY",
    defeat: "DEFEAT"
  }[phase];
}

function slotLabel(slot: NonNullable<Item["slot"]>): string {
  return {
    weapon: "武器",
    armor: "防具",
    accessory: "装飾品"
  }[slot];
}

function statsText(item: Item): string {
  if (!item.stats) {
    return item.description;
  }
  return Object.entries(item.stats)
    .map(([key, value]) => `${key.toUpperCase()} ${value && value > 0 ? "+" : ""}${value}`)
    .join(" / ");
}

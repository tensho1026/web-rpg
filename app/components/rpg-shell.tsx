"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  Backpack,
  BadgeCheck,
  Bed,
  Boxes,
  Castle,
  ChevronRight,
  Coins,
  Compass,
  Database,
  FlaskConical,
  Footprints,
  Gem,
  Hammer,
  Heart,
  Home,
  PackageOpen,
  ScrollText,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Users,
  WandSparkles,
  Zap
} from "lucide-react";
import { runGameCommand } from "@/app/actions";
import {
  ACHIEVEMENTS,
  CLASSES,
  ENEMIES,
  ITEM_BY_ID,
  ITEMS,
  MAP_AREAS,
  RECIPES,
  SHOP_ITEMS,
  SKILLS,
  TITLES,
  WARP_POINTS
} from "@/lib/game/data";
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
  EquipmentSlot,
  GameState,
  GameView,
  Item,
  Quest,
  Recipe,
  Station,
  StatusEffect
} from "@/lib/game/types";

type CommandButtonProps = {
  action: (payload: FormData) => void;
  command: string;
  label: string;
  detail?: string;
  itemId?: string;
  recipeId?: string;
  skillId?: string;
  targetView?: GameView;
  areaId?: string;
  value?: string;
  disabled?: boolean;
  icon: ReactNode;
  compact?: boolean;
  onCommand?: () => void;
};

const views: Array<{ id: GameView; label: string; icon: ReactNode }> = [
  { id: "home", label: "街", icon: <Home size={16} /> },
  { id: "adventure", label: "冒険", icon: <Compass size={16} /> },
  { id: "character", label: "育成", icon: <Zap size={16} /> },
  { id: "equipment", label: "装備", icon: <Shield size={16} /> },
  { id: "inventory", label: "バッグ", icon: <Backpack size={16} /> },
  { id: "craft", label: "工房", icon: <Hammer size={16} /> },
  { id: "shop", label: "店", icon: <ShoppingBag size={16} /> },
  { id: "quests", label: "依頼", icon: <Trophy size={16} /> },
  { id: "codex", label: "図鑑", icon: <ScrollText size={16} /> },
  { id: "guild", label: "ギルド", icon: <Users size={16} /> },
  { id: "gacha", label: "ガチャ", icon: <Sparkles size={16} /> },
  { id: "data", label: "保存", icon: <Database size={16} /> }
];

const stationLabels: Record<Station, string> = {
  synthesis: "合成",
  forge: "鍛冶",
  alchemy: "錬成"
};

const categoryLabels: Record<Item["category"], string> = {
  consumable: "消費",
  material: "素材",
  weapon: "武器",
  armor: "防具",
  accessory: "装飾品",
  relic: "レリック",
  gem: "宝石",
  quest: "クエスト",
  pet: "ペット",
  mount: "マウント"
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
  Q: "#00bbf9",
  R: "#7ddc6f",
  S: "#f8a13f"
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
  town: [
    "..SS....SS..",
    ".SFFS..SFFS.",
    ".SFFS..SFFS.",
    ".SGGS..SGGS.",
    "SSGGSSSSGGSS",
    "SNNNNSSNNNNS",
    "SNAANSSNAANS",
    "SNNNNSSNNNNS",
    "SSSSSSSSSSSS",
    "..RRRRRRRR..",
    ".RRRRRRRRRR."
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
  const [saveStatus, setSaveStatus] = useState("");
  const [savedJson, setSavedJson] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const stats = getPlayerStats(state.player);
  const carriedItems = useMemo(() => inventoryItems(state.player), [state]);
  const learnedRecipes = useMemo(
    () => visibleRecipes(state.player.level),
    [state.player.level]
  );
  const hpPercent = percent(state.player.hp, stats.maxHp);
  const mpPercent = percent(state.player.mp, stats.maxMp);
  const expPercent = percent(state.player.exp, state.player.expToNext);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSavedJson(window.localStorage.getItem("pixel-relic-save") ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state.lastAction.kind !== "idle") {
      playTone(audioRef, state.lastAction.kind);
    }
  }, [state.lastAction.seed, state.lastAction.kind]);

  useEffect(() => {
    if (!state.autoBattle || state.phase !== "battle" || isPending) {
      return;
    }
    const timer = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("command", "autoBattle");
      formAction(formData);
    }, Math.max(420, 1100 / state.battleSpeed));
    return () => window.clearTimeout(timer);
  }, [formAction, isPending, state.autoBattle, state.battleSpeed, state.phase, state.turn]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<GameState["lastAction"]["kind"]>).detail;
      playTone(audioRef, detail ?? "town");
    };
    window.addEventListener("rpg-command-sound", handler);
    return () => window.removeEventListener("rpg-command-sound", handler);
  }, []);

  function saveGame() {
    window.localStorage.setItem("pixel-relic-save", JSON.stringify(state));
    setSavedJson(JSON.stringify(state));
    setSaveStatus("保存しました");
    playTone(audioRef, "town");
  }

  return (
    <main className="app-frame">
      <section className="game-shell" aria-label="Pixel Relic RPG">
        <header className="top-bar">
          <div>
            <p className="eyebrow">PIXEL RELIC</p>
            <h1>炉端の街アステル</h1>
          </div>
          <div className="resource-stack">
            <div className={state.db.connected ? "db-chip connected" : "db-chip"}>
              <Database size={12} />
              <span>{state.db.connected ? state.db.displayName ?? "DB保存ON" : "ゲスト未接続"}</span>
            </div>
            <div className="wallet" aria-label="所持金">
              <Coins size={16} />
              <strong>{state.player.gold}</strong>
              <span>G</span>
            </div>
            <div className="wallet stamina" aria-label="スタミナ">
              <Zap size={16} />
              <strong>{state.player.stamina}</strong>
              <span>/{state.player.maxStamina}</span>
            </div>
          </div>
        </header>

        <ScenePanel state={state} stats={stats} />

        <section className="status-strip">
          <div className="status-main">
            <div className="avatar-chip">R</div>
            <div>
              <p>{state.player.className}</p>
              <strong>Lv {state.player.level} / Rank {state.player.rank}</strong>
            </div>
          </div>
          <div className="meter-stack">
            <Meter label="HP" value={state.player.hp} max={stats.maxHp} percentValue={hpPercent} tone="hp" />
            <Meter label="MP" value={state.player.mp} max={stats.maxMp} percentValue={mpPercent} tone="mp" />
            <Meter label="EXP" value={state.player.exp} max={state.player.expToNext} percentValue={expPercent} tone="exp" />
          </div>
        </section>

        <section className="content-panel">
          {state.view === "home" && (
            <HomePanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "adventure" && (
            <AdventurePanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "character" && (
            <CharacterPanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "inventory" && (
            <InventoryPanel state={state} items={carriedItems} action={formAction} isPending={isPending} />
          )}
          {state.view === "equipment" && (
            <EquipmentPanel state={state} items={carriedItems} action={formAction} isPending={isPending} />
          )}
          {state.view === "craft" && (
            <CraftPanel state={state} recipes={learnedRecipes} action={formAction} isPending={isPending} />
          )}
          {state.view === "shop" && (
            <ShopPanel state={state} items={carriedItems} action={formAction} isPending={isPending} />
          )}
          {state.view === "quests" && <QuestPanel state={state} />}
          {state.view === "codex" && (
            <CodexPanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "guild" && (
            <GuildPanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "gacha" && (
            <GachaPanel state={state} action={formAction} isPending={isPending} />
          )}
          {state.view === "data" && (
            <DataPanel
              state={state}
              action={formAction}
              isPending={isPending}
              savedJson={savedJson}
              saveStatus={saveStatus}
              onSave={saveGame}
            />
          )}
        </section>

        <nav className="tab-bar wide bottom-nav" aria-label="街メニュー">
          {views.map((view) => (
            <CommandButton
              key={view.id}
              action={formAction}
              command="view"
              targetView={view.id}
              label={view.label}
              icon={view.icon}
              compact
              disabled={isPending || state.view === view.id}
              onCommand={() => playTone(audioRef, "town")}
            />
          ))}
        </nav>
      </section>
    </main>
  );
}

function ScenePanel({ state, stats }: { state: GameState; stats: ReturnType<typeof getPlayerStats> }) {
  const enemyPercent = percent(state.enemy.hp, state.enemy.maxHp);
  const battle = state.phase === "battle";
  const info = viewSceneInfo(state, stats);
  return (
    <section className={battle || state.view === "home" || state.view === "adventure" ? "scene-panel" : "scene-panel compact-scene"}>
      <div className="scene-meta">
        <span>DAY {state.day}</span>
        <span>{state.location}</span>
        <span>{phaseLabel(state.phase)} / x{state.battleSpeed}</span>
      </div>
      <div
        key={state.lastAction.seed}
        className={`battlefield ${battle ? "is-battle" : "is-town"} motion-${state.lastAction.kind}`}
        aria-label={battle ? "戦闘フィールド" : "街"}
      >
        <div className="sprite-wrap hero-sprite">
          <PixelSprite spriteId="hero" label={state.player.name} />
          <span className="sprite-name">{state.player.name}</span>
        </div>
        <div className="ground-line" />
        <div className="sprite-wrap enemy-sprite">
          <PixelSprite spriteId={battle ? state.enemy.sprite : info.spriteId} label={battle ? state.enemy.name : info.title} />
          <span className="sprite-name">{battle ? state.enemy.name : info.title}</span>
        </div>
      </div>
      {battle ? (
        <div className="enemy-card">
          <div>
            <p>{state.enemy.biome}</p>
            <h2>{state.enemy.name}</h2>
            <StatusTags effects={state.enemy.statusEffects} />
          </div>
          <div className="enemy-level">Lv {state.enemy.level}</div>
          <Meter label="ENEMY" value={state.enemy.hp} max={state.enemy.maxHp} percentValue={enemyPercent} tone="danger" />
        </div>
      ) : (
        <div className="enemy-card">
          <div>
            <p>{info.subtitle}</p>
            <h2>{info.title}</h2>
            <StatusTags effects={state.player.statusEffects} />
          </div>
          <div className="enemy-level">{info.badge}</div>
          <div className="town-summary">
            {info.metrics.map((metric) => (
              <span key={metric}>{metric}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function HomePanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <div className="section-title">
        <Castle size={15} />
        <span>街の行動</span>
      </div>
      <div className="command-grid city-grid">
        <CommandButton action={action} command="view" targetView="adventure" label="冒険へ" detail="フィールド/ダンジョン" icon={<Compass size={18} />} disabled={isPending} />
        <CommandButton action={action} command="view" targetView="character" label="プレイヤー" detail="育成/転職/覚醒" icon={<Zap size={18} />} disabled={isPending} />
        <CommandButton action={action} command="view" targetView="equipment" label="装備を見る" detail="精錬/宝石/耐久" icon={<Shield size={18} />} disabled={isPending} />
        <CommandButton action={action} command="view" targetView="shop" label="ショップ" detail="売買/経済" icon={<ShoppingBag size={18} />} disabled={isPending} />
        <CommandButton action={action} command="rest" label="宿屋" detail="40G / 全快" icon={<Bed size={18} />} disabled={isPending} />
        <CommandButton action={action} command="guestLogin" label="ゲストログイン" detail={state.db.connected ? "DB保存ON" : "DB保存開始"} icon={<Database size={18} />} disabled={isPending || state.db.connected} />
        <CommandButton action={action} command="claimLogin" label="ログイン" detail={state.loginBonusClaimedDay === state.day ? "受取済" : "ボーナス"} icon={<BadgeCheck size={18} />} disabled={isPending || state.loginBonusClaimedDay === state.day} />
        <CommandButton action={action} command="view" targetView="gacha" label="召喚所" detail={`天井 ${state.gachaPity}/12`} icon={<Sparkles size={18} />} disabled={isPending} />
        <CommandButton action={action} command="view" targetView="guild" label="ギルド" detail={`Lv ${state.guild.level}`} icon={<Users size={18} />} disabled={isPending} />
      </div>
      <section className="notice-board">
        <div className="section-title">
          <ScrollText size={15} />
          <span>NPC会話イベント</span>
        </div>
        <div className="choice-row">
          <CommandButton action={action} command="storyChoice" value="guild" label="ギルド長を助ける" detail="契約書ルート" icon={<Users size={16} />} disabled={isPending || state.storyFlags.guildRoute} />
          <CommandButton action={action} command="storyChoice" value="solo" label="単独調査する" detail="準備金ルート" icon={<Footprints size={16} />} disabled={isPending || state.storyFlags.independentRoute} />
        </div>
      </section>
    </div>
  );
}

function AdventurePanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      {state.phase === "battle" ? (
        <BattlePanel state={state} action={action} isPending={isPending} />
      ) : (
        <>
          <div className="section-title">
            <Compass size={15} />
            <span>マップ</span>
          </div>
          <div className="map-list">
            {MAP_AREAS.map((area) => (
              <article key={area.id} className="map-card">
                <div>
                  <strong>{area.name}</strong>
                  <p>{areaKindLabel(area.kind)} / 推奨階層 {area.floor}</p>
                  <p>{area.description}</p>
                </div>
                <CommandButton action={action} command="startAdventure" areaId={area.id} label="出発" detail={`ST ${area.stamina}`} icon={<Compass size={16} />} disabled={isPending || state.player.stamina < area.stamina} />
              </article>
            ))}
          </div>
          <section className="recipe-section">
            <div className="section-title">
              <Sparkles size={15} />
              <span>ワープ地点</span>
            </div>
            <div className="map-list">
              {WARP_POINTS.map((warp) => (
                <article key={warp.id} className="map-card">
                  <div>
                    <strong>{warp.name}</strong>
                    <p>開放 FLOOR {warp.unlockFloor} / {warp.cost}G</p>
                    <p>{warp.description}</p>
                  </div>
                  <CommandButton action={action} command="warp" value={warp.id} label="ワープ" icon={<Sparkles size={16} />} disabled={isPending || state.floor < warp.unlockFloor || state.player.gold < warp.cost} />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function BattlePanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  const consumables = inventoryItems(state.player).filter(
    (item) => item.category === "consumable"
  );
  const stats = getPlayerStats(state.player);
  const disabled = isPending || state.phase !== "battle";
  const activeSkills = SKILLS.filter((skill) => skill.kind !== "passive" && state.player.skills[skill.id]);

  return (
    <div className="panel-grid">
      <div className="battle-tools">
        <div className="choice-row">
          {[1, 2, 4].map((speed) => (
            <CommandButton key={speed} action={action} command="setSpeed" value={String(speed)} label={`${speed}倍`} icon={<Zap size={16} />} disabled={isPending || state.battleSpeed === speed} compact />
          ))}
          <CommandButton action={action} command="toggleAuto" label={state.autoBattle ? "Auto ON" : "Auto OFF"} icon={<Sparkles size={16} />} disabled={isPending} compact />
        </div>
      </div>
      <div className="command-grid">
        <CommandButton action={action} command="attack" label="通常攻撃" detail={`ATK ${stats.atk}`} icon={<Swords size={18} />} disabled={disabled} />
        <CommandButton action={action} command="autoBattle" label="オート進行" detail={`${state.battleSpeed}ターン`} icon={<ChevronRight size={18} />} disabled={disabled} />
        {activeSkills.map((skill) => (
          <CommandButton
            key={skill.id}
            action={action}
            command={skill.kind === "magic" ? "magic" : "skill"}
            skillId={skill.id}
            label={skill.name}
            detail={`MP ${skill.mpCost}`}
            icon={<span className="kanji-icon">{skill.icon}</span>}
            disabled={disabled || state.player.mp < skill.mpCost}
          />
        ))}
        <CommandButton action={action} command="guard" label="守る" detail={`DEF ${stats.def}`} icon={<Shield size={18} />} disabled={disabled} />
        <CommandButton action={action} command="flee" label="逃げる" detail={`AGI ${stats.agi}`} icon={<Footprints size={18} />} disabled={disabled} />
        <CommandButton action={action} command="returnTown" label="街へ戻る" detail="戦闘後" icon={<Home size={18} />} disabled={isPending || state.phase === "battle"} />
        <CommandButton action={action} command="next" label="次の敵" detail="連戦" icon={<ChevronRight size={18} />} disabled={isPending || state.phase === "battle"} />
      </div>
      <div className="quick-items">
        <div className="section-title">
          <PackageOpen size={15} />
          <span>戦闘アイテム</span>
        </div>
        <div className="item-action-list">
          {consumables.slice(0, 4).map((item) => (
            <CommandButton key={item.id} action={action} command="item" itemId={item.id} label={item.name} detail={`x${item.qty}`} icon={<span className="kanji-icon">{item.icon}</span>} disabled={isPending || (state.phase !== "battle" && !item.heal)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CharacterPanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  const stats = getPlayerStats(state.player);
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
      <div className="growth-board">
        <GrowthCard label="覚醒" value={state.player.awakening} command="awaken" detail="粉x2 + G" action={action} isPending={isPending} />
        <GrowthCard label="進化" value={state.player.evolution} command="evolve" detail="契約書" action={action} isPending={isPending} />
        <GrowthCard label="限界突破" value={state.player.limitBreak} command="limitBreak" detail="Lv3+" action={action} isPending={isPending} />
        <GrowthCard label="ランクアップ" value={state.player.rank} command="rankUp" detail="ST上限" action={action} isPending={isPending} />
      </div>
      <section className="recipe-section">
        <div className="section-title">
          <Zap size={15} />
          <span>転職</span>
        </div>
        <div className="card-grid">
          {CLASSES.map((job) => (
            <article key={job.id} className="mini-card">
              <strong>{job.name}</strong>
              <p>Lv {job.unlockLevel} / {job.cost}G / {job.skillId}</p>
              <CommandButton action={action} command="classChange" value={job.id} label={state.player.classId === job.id ? "現職" : "転職"} icon={<Zap size={16} />} disabled={isPending || state.player.classId === job.id || state.player.level < job.unlockLevel || state.player.gold < job.cost} />
            </article>
          ))}
        </div>
      </section>
      <section className="recipe-section">
        <div className="section-title">
          <WandSparkles size={15} />
          <span>スキルツリー</span>
        </div>
        <div className="inventory-list compact">
          {SKILLS.map((skill) => (
            <article key={skill.id} className="item-row">
              <div className="item-icon">{skill.icon}</div>
              <div className="item-copy">
                <div>
                  <strong>{skill.name} Lv {state.player.skills[skill.id] ?? 0}</strong>
                  <span>{skill.kind}</span>
                </div>
                <p>{skill.description}</p>
              </div>
              <CommandButton action={action} command={skill.kind === "passive" ? "unlockPassive" : "upgradeSkill"} skillId={skill.id} label={skill.kind === "passive" ? "習得" : "強化"} detail={`SP ${state.player.skillPoints}`} icon={<Sparkles size={16} />} disabled={isPending || state.player.skillPoints < 1 || state.player.level < skill.unlockLevel} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GrowthCard({
  label,
  value,
  command,
  detail,
  action,
  isPending
}: {
  label: string;
  value: number;
  command: string;
  detail: string;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <article className="mini-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <CommandButton action={action} command={command} label="実行" detail={detail} icon={<Sparkles size={16} />} disabled={isPending} />
    </article>
  );
}

function InventoryPanel({
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
      <ItemList state={state} items={items} action={action} isPending={isPending} mode="bag" />
    </div>
  );
}

function EquipmentPanel({
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
  const equipment = items.filter((item) => item.slot);
  return (
    <div className="panel-grid">
      <div className="slot-grid">
        {(["weapon", "armor", "accessory"] as const).map((slot) => {
          const item = getItem(state.player.equipment[slot] ?? "");
          const meta = item ? state.player.equipmentMeta[item.id] : undefined;
          return (
            <article key={slot} className="slot-card">
              <span>{slotLabel(slot)}</span>
              <strong>{item?.name ?? "未装備"}</strong>
              <p>{item ? equipmentMetaText(meta) : "バッグから装備を選べます。"}</p>
            </article>
          );
        })}
      </div>
      <div className="inventory-list compact">
        {equipment.map((item) => {
          const equipped = Object.values(state.player.equipment).includes(item.id);
          const meta = state.player.equipmentMeta[item.id];
          return (
            <article key={item.id} className={`item-row rarity-${item.rarity}`}>
              <div className="item-icon">{item.icon}</div>
              <div className="item-copy">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.slot ? slotLabel(item.slot) : ""}</span>
                </div>
                <p>{statsText(item)} / {equipmentMetaText(meta)}</p>
              </div>
              <div className="gear-actions multi">
                <CommandButton action={action} command="equip" itemId={item.id} label={equipped ? "装備中" : "装備"} icon={<Shield size={16} />} disabled={isPending || equipped} compact />
                <CommandButton action={action} command="refine" itemId={item.id} label="精錬" icon={<Sparkles size={16} />} disabled={isPending} compact />
                <CommandButton action={action} command="enhance" itemId={item.id} label="強化" icon={<Hammer size={16} />} disabled={isPending} compact />
                <CommandButton action={action} command="reroll" itemId={item.id} label="厳選" icon={<Gem size={16} />} disabled={isPending || inventoryCount(state.player, "aether-dust") < 1} compact />
                <CommandButton action={action} command="enchant" itemId={item.id} label="付与" icon={<WandSparkles size={16} />} disabled={isPending} compact />
                <CommandButton action={action} command="socket" itemId={item.id} value="ruby-gem" label="宝石" icon={<Gem size={16} />} disabled={isPending || !item.socketable || inventoryCount(state.player, "ruby-gem") < 1} compact />
                <CommandButton action={action} command="repair" itemId={item.id} label="修理" icon={<Boxes size={16} />} disabled={isPending} compact />
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
            {station === "alchemy" ? <Sparkles size={15} /> : <Hammer size={15} />}
            <span>{stationLabels[station]}</span>
          </div>
          <div className="recipe-list">
            {recipes.filter((recipe) => recipe.station === station).map((recipe) => {
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
                        <span key={stack.itemId}>{getItem(stack.itemId)?.name ?? stack.itemId} {inventoryCount(state.player, stack.itemId)}/{stack.qty}</span>
                      ))}
                    </div>
                  </div>
                  <div className="recipe-output">
                    <span>{output?.icon}</span>
                    <strong>x{recipe.output.qty}</strong>
                  </div>
                  <CommandButton action={action} command={station === "alchemy" ? "alchemy" : "craft"} recipeId={recipe.id} label={stationLabels[station]} icon={<Hammer size={16} />} disabled={isPending || !ready} />
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

function ShopPanel({
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
        <ShoppingBag size={15} />
        <span>ショップ</span>
      </div>
      <div className="inventory-list">
        {SHOP_ITEMS.map((shopItem) => {
          const item = ITEM_BY_ID[shopItem.itemId];
          return (
            <article key={shopItem.itemId} className={`item-row rarity-${item.rarity}`}>
              <div className="item-icon">{item.icon}</div>
              <div className="item-copy">
                <div>
                  <strong>{item.name}</strong>
                  <span>{categoryLabels[item.category]}</span>
                </div>
                <p>{item.description}</p>
              </div>
              <div className="item-count">{shopItem.price}G</div>
              <CommandButton action={action} command="buy" itemId={item.id} label="買う" icon={<Coins size={16} />} disabled={isPending || state.player.gold < shopItem.price} />
            </article>
          );
        })}
      </div>
      <ItemList state={state} items={items} action={action} isPending={isPending} mode="sell" />
    </div>
  );
}

function ItemList({
  state,
  items,
  action,
  isPending,
  mode
}: {
  state: GameState;
  items: Array<Item & { qty: number }>;
  action: (payload: FormData) => void;
  isPending: boolean;
  mode: "bag" | "sell";
}) {
  return (
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
          {mode === "bag" && item.category === "consumable" && (
            <CommandButton action={action} command="item" itemId={item.id} label="使う" detail={state.phase === "battle" ? "ターン" : "回復"} icon={<Heart size={16} />} disabled={isPending} />
          )}
          {mode === "sell" && (
            <CommandButton action={action} command="sell" itemId={item.id} label="売る" detail={`${Math.floor(item.value * 0.55)}G`} icon={<Coins size={16} />} disabled={isPending || Object.values(state.player.equipment).includes(item.id)} />
          )}
        </article>
      ))}
    </div>
  );
}

function QuestPanel({ state }: { state: GameState }) {
  return (
    <div className="panel-grid">
      {(["main", "sub", "daily", "event"] as Quest["type"][]).map((type) => (
        <section key={type} className="quest-list">
          <div className="section-title">
            <Trophy size={15} />
            <span>{questTypeLabel(type)}</span>
          </div>
          {state.quests.filter((quest) => quest.type === type).map((quest) => (
            <article key={quest.id} className={quest.completed ? "quest done" : "quest"}>
              <div>
                <strong>{quest.title}</strong>
                <p>{quest.description}</p>
                <p>{quest.rewardGold}G / {quest.rewardExp}EXP / {ITEM_BY_ID[quest.rewardItemId]?.name}</p>
              </div>
              <span>{quest.completed ? "DONE" : `${quest.progress}/${quest.target}`}</span>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function CodexPanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <section className="codex-list">
        <div className="section-title">
          <Gem size={15} />
          <span>モンスター図鑑</span>
        </div>
        {ENEMIES.map((enemy) => (
          <EnemyCodex key={enemy.id} enemy={enemy} discovered={state.discoveredEnemies.includes(enemy.id)} />
        ))}
      </section>
      <section className="codex-list">
        <div className="section-title">
          <Backpack size={15} />
          <span>アイテム図鑑</span>
        </div>
        <div className="drop-tags">
          {ITEMS.map((item) => (
            <span key={item.id} className={state.discoveredItems.includes(item.id) ? "" : "muted-tag"}>{state.discoveredItems.includes(item.id) ? item.name : "未発見"}</span>
          ))}
        </div>
      </section>
      <section className="codex-list">
        <div className="section-title">
          <BadgeCheck size={15} />
          <span>実績と称号</span>
        </div>
        <div className="card-grid">
          {ACHIEVEMENTS.map((achievement) => (
            <article key={achievement.id} className={state.achievements.includes(achievement.id) ? "mini-card done" : "mini-card"}>
              <strong>{achievement.title}</strong>
              <p>{achievement.description}</p>
            </article>
          ))}
        </div>
        <div className="drop-tags">
          {TITLES.map((title) => (
            <span key={title.id}>{state.titles.includes(title.id) ? `${title.name}: ${title.bonus}` : "未獲得"}</span>
          ))}
        </div>
        <div className="choice-row">
          {TITLES.filter((title) => state.titles.includes(title.id)).map((title) => (
            <CommandButton
              key={title.id}
              action={action}
              command="setTitle"
              value={title.id}
              label={title.name}
              detail={state.player.title === title.id ? "設定中" : title.bonus}
              icon={<BadgeCheck size={16} />}
              disabled={isPending || state.player.title === title.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function EnemyCodex({ enemy, discovered }: { enemy: EnemyTemplate; discovered: boolean }) {
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

function GuildPanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <div className="guild-banner">
        <Users size={28} />
        <div>
          <strong>{state.guild.name}</strong>
          <p>Lv {state.guild.level} / 貢献 {state.guild.contribution}</p>
        </div>
      </div>
      <div className="command-grid">
        <CommandButton action={action} command="guildDonate" label="寄付" detail="60G" icon={<Coins size={18} />} disabled={isPending || state.player.gold < 60} />
        <CommandButton action={action} command="trainPet" label="ペット訓練" detail={state.player.activePet ? ITEM_BY_ID[state.player.activePet]?.name : "未所持"} icon={<Heart size={18} />} disabled={isPending || !state.player.activePet} />
        <CommandButton action={action} command="trainMount" label="マウント訓練" detail={state.player.activeMount ? ITEM_BY_ID[state.player.activeMount]?.name : "未所持"} icon={<Footprints size={18} />} disabled={isPending || !state.player.activeMount} />
        <CommandButton action={action} command="view" targetView="quests" label="ミッション" detail="デイリー/イベント" icon={<Trophy size={18} />} disabled={isPending} />
      </div>
    </div>
  );
}

function GachaPanel({
  state,
  action,
  isPending
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div className="panel-grid">
      <div className="gacha-machine">
        <Sparkles size={34} />
        <strong>星落ち召喚</strong>
        <p>100G / 天井 {state.gachaPity}/12 / ペット、マウント、レジェンダリー装備あり</p>
        <CommandButton action={action} command="gacha" label="1回召喚" detail="100G" icon={<Sparkles size={18} />} disabled={isPending || state.player.gold < 100} />
      </div>
      <div className="drop-tags">
        <span>星落ちの剣</span>
        <span>星狼の幼獣</span>
        <span>空駆け馬</span>
        <span>紅玉ジェム</span>
      </div>
    </div>
  );
}

function DataPanel({
  state,
  action,
  isPending,
  savedJson,
  saveStatus,
  onSave
}: {
  state: GameState;
  action: (payload: FormData) => void;
  isPending: boolean;
  savedJson: string;
  saveStatus: string;
  onSave: () => void;
}) {
  return (
    <div className="panel-grid">
      <section className="db-status-card">
        <div>
          <div className="section-title">
            <Database size={15} />
            <span>DBセーブ</span>
          </div>
          <strong>{state.db.connected ? state.db.displayName ?? "ゲスト" : "ゲスト未ログイン"}</strong>
          <p>{state.db.message ?? (state.db.connected ? "Server Actions経由で自動保存中。" : "ゲストログインでNeonへ保存できます。")}</p>
        </div>
        <div className="db-save-meta">
          <span>{state.db.connected ? "ONLINE" : "LOCAL"}</span>
          <small>{state.db.lastSavedAt ? formatDateTime(state.db.lastSavedAt) : `Turn ${state.turn}`}</small>
          {state.db.saveVersion && <small>v{state.db.saveVersion}</small>}
        </div>
      </section>
      <div className="command-grid">
        <CommandButton action={action} command="guestLogin" label="ゲストログイン" detail={state.db.connected ? "接続済み" : "DB保存開始"} icon={<Database size={16} />} disabled={isPending || state.db.connected} />
        <button type="button" className="command-button" onClick={onSave}>
          <span className="button-icon"><Database size={16} /></span>
          <span className="button-copy"><strong>セーブ</strong><small>{saveStatus || `Turn ${state.turn}`}</small></span>
        </button>
        <form action={action} className="command-form">
          <input type="hidden" name="command" value="load" />
          <input type="hidden" name="stateJson" value={savedJson} />
          <button type="submit" className="command-button" disabled={isPending || !savedJson}>
            <span className="button-icon"><Database size={16} /></span>
            <span className="button-copy"><strong>ロード</strong><small>{savedJson ? "保存あり" : "保存なし"}</small></span>
          </button>
        </form>
      </div>
      <section className="battle-log">
        <div className="section-title">
          <ScrollText size={15} />
          <span>プレイ履歴</span>
        </div>
        <ol>
          {state.playHistory.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
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
          <span key={recipe.id}>Lv {recipe.unlockLevel} {recipe.name}</span>
        ))}
      </div>
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
  skillId,
  targetView,
  areaId,
  value,
  disabled,
  icon,
  compact,
  onCommand
}: CommandButtonProps) {
  return (
    <form action={action} className="command-form">
      <input type="hidden" name="command" value={command} />
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      {recipeId && <input type="hidden" name="recipeId" value={recipeId} />}
      {skillId && <input type="hidden" name="skillId" value={skillId} />}
      {targetView && <input type="hidden" name="targetView" value={targetView} />}
      {areaId && <input type="hidden" name="areaId" value={areaId} />}
      {value && <input type="hidden" name="value" value={value} />}
      <button
        type="submit"
        className={compact ? "command-button compact" : "command-button"}
        disabled={disabled}
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("rpg-command-sound", { detail: soundKind(command) })
          );
          onCommand?.();
        }}
      >
        <span className="button-icon">{icon}</span>
        <span className="button-copy">
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </button>
    </form>
  );
}

function soundKind(command: string): GameState["lastAction"]["kind"] {
  if (command === "attack" || command === "autoBattle") {
    return "attack";
  }
  if (command === "skill") {
    return "skill";
  }
  if (command === "magic") {
    return "magic";
  }
  if (command === "item") {
    return "item";
  }
  if (command === "gacha" || command === "craft" || command === "alchemy" || command === "reroll") {
    return "loot";
  }
  return "town";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function viewSceneInfo(
  state: GameState,
  stats: ReturnType<typeof getPlayerStats>
): {
  title: string;
  subtitle: string;
  badge: string;
  metrics: string[];
  spriteId: string;
} {
  const itemCount = Object.values(state.player.inventory).reduce(
    (sum, qty) => sum + qty,
    0
  );
  const completedQuests = state.quests.filter((quest) => quest.completed).length;
  const viewInfo: Record<GameView, {
    title: string;
    subtitle: string;
    badge: string;
    metrics: string[];
    spriteId: string;
  }> = {
    home: {
      title: "次の行動を選択",
      subtitle: "街ホーム",
      badge: `ATK ${stats.atk}`,
      metrics: [`DEF ${stats.def}`, `AGI ${stats.agi}`, `LUK ${stats.luck}`],
      spriteId: "town"
    },
    adventure: {
      title: "冒険準備",
      subtitle: "マップとワープ地点",
      badge: `ST ${state.player.stamina}`,
      metrics: [`FLOOR ${state.floor}`, `敵 ${state.discoveredEnemies.length}`, `速度 x${state.battleSpeed}`],
      spriteId: "town"
    },
    character: {
      title: `${state.player.className}の育成`,
      subtitle: "転職 / 覚醒 / スキルツリー",
      badge: `SP ${state.player.skillPoints}`,
      metrics: [`覚醒 ${state.player.awakening}`, `進化 ${state.player.evolution}`, `突破 ${state.player.limitBreak}`],
      spriteId: "hero"
    },
    inventory: {
      title: "バッグ管理",
      subtitle: "消費アイテム / 素材 / クエスト品",
      badge: `${itemCount}個`,
      metrics: [`素材 ${inventoryCategoryCount(state, "material")}`, `消費 ${inventoryCategoryCount(state, "consumable")}`, `宝石 ${inventoryCategoryCount(state, "gem")}`],
      spriteId: "town"
    },
    equipment: {
      title: "装備工房",
      subtitle: "精錬 / 厳選 / 宝石 / 耐久",
      badge: setBonusActive(state) ? "SET" : "GEAR",
      metrics: [`武器 ${gearName(state, "weapon")}`, `防具 ${gearName(state, "armor")}`, `飾 ${gearName(state, "accessory")}`],
      spriteId: "hero"
    },
    craft: {
      title: "合成と錬成",
      subtitle: "素材から装備と道具を作成",
      badge: `鍛 ${state.forgeRank.toFixed(1)}`,
      metrics: [`錬 ${state.alchemyRank.toFixed(1)}`, `レシピ ${visibleRecipes(state.player.level).length}`, `素材 ${inventoryCategoryCount(state, "material")}`],
      spriteId: "town"
    },
    shop: {
      title: "ショップ",
      subtitle: "売買と強化費用の準備",
      badge: `${state.player.gold}G`,
      metrics: [`商品 ${SHOP_ITEMS.length}`, `所持 ${itemCount}`, `宿 40G`],
      spriteId: "town"
    },
    quests: {
      title: "クエストボード",
      subtitle: "メイン / サブ / デイリー / イベント",
      badge: `${completedQuests}/${state.quests.length}`,
      metrics: [`Daily ${questProgress(state, "daily")}`, `Event ${questProgress(state, "event")}`, `報酬あり`],
      spriteId: "town"
    },
    codex: {
      title: "収集図鑑",
      subtitle: "モンスター / アイテム / 実績 / 称号",
      badge: `${state.achievements.length}実績`,
      metrics: [`敵 ${state.discoveredEnemies.length}/${ENEMIES.length}`, `品 ${state.discoveredItems.length}/${ITEMS.length}`, `称号 ${state.titles.length}`],
      spriteId: "town"
    },
    guild: {
      title: state.guild.name,
      subtitle: "MMO系ギルド / 貢献 / ペット訓練",
      badge: `Lv ${state.guild.level}`,
      metrics: [`貢献 ${state.guild.contribution}`, `ペット ${state.pets.length}`, `マウント ${state.mounts.length}`],
      spriteId: "town"
    },
    gacha: {
      title: "星落ち召喚",
      subtitle: "ソシャゲ系ガチャ / 天井 / レアドロップ",
      badge: `${state.gachaPity}/12`,
      metrics: [`100G`, `LEGEND`, `PET/MOUNT`],
      spriteId: "town"
    },
    data: {
      title: "データ管理",
      subtitle: "セーブ / ロード / プレイ履歴",
      badge: `Turn ${state.turn}`,
      metrics: [`履歴 ${state.playHistory.length}`, `実績 ${state.achievements.length}`, `Day ${state.day}`],
      spriteId: "town"
    }
  };
  return viewInfo[state.view];
}

function areaKindLabel(kind: "field" | "dungeon" | "town"): string {
  return {
    field: "フィールド",
    dungeon: "ダンジョン",
    town: "街"
  }[kind];
}

function inventoryCategoryCount(
  state: GameState,
  category: Item["category"]
): number {
  return Object.entries(state.player.inventory).reduce((sum, [itemId, qty]) => {
    return ITEM_BY_ID[itemId]?.category === category ? sum + qty : sum;
  }, 0);
}

function gearName(state: GameState, slot: EquipmentSlot): string {
  const itemId = state.player.equipment[slot];
  const item = itemId ? ITEM_BY_ID[itemId] : undefined;
  return item?.name ?? "未装備";
}

function setBonusActive(state: GameState): boolean {
  return (
    Object.values(state.player.equipment).filter(
      (itemId) => ITEM_BY_ID[itemId ?? ""]?.setId === "starfall"
    ).length >= 2
  );
}

function questProgress(state: GameState, type: Quest["type"]): string {
  const quests = state.quests.filter((quest) => quest.type === type);
  const completed = quests.filter((quest) => quest.completed).length;
  return `${completed}/${quests.length}`;
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
        <strong>{value}/{max}</strong>
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
    <div className={mini ? "pixel-sprite mini" : "pixel-sprite"} role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${rows[0].length}, 1fr)` }}>
      {rows.join("").split("").map((pixel, index) => (
        <span key={`${pixel}-${index}`} style={{ background: spritePalette[pixel] ?? "transparent" }} />
      ))}
    </div>
  );
}

function StatusTags({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) {
    return null;
  }
  return (
    <div className="drop-tags status-tags">
      {effects.map((effect) => (
        <span key={effect.kind}>{statusLabel(effect.kind)} {effect.turns}</span>
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
    town: "TOWN",
    battle: "BATTLE",
    explore: "EXPLORE",
    victory: "VICTORY",
    defeat: "DEFEAT"
  }[phase];
}

function slotLabel(slot: EquipmentSlot): string {
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

function equipmentMetaText(meta: GameState["player"]["equipmentMeta"][string] | undefined): string {
  if (!meta) {
    return "未強化";
  }
  const enchant = meta.enchant ? ` / ${meta.enchant.stat.toUpperCase()} +${meta.enchant.value}` : "";
  return `精錬 ${meta.refinement} / 耐久 ${meta.durability} / 宝石 ${meta.sockets.length}${enchant}`;
}

function questTypeLabel(type: Quest["type"]): string {
  return {
    main: "メインクエスト",
    sub: "サブクエスト",
    daily: "デイリーミッション",
    event: "イベント"
  }[type];
}

function statusLabel(kind: StatusEffect["kind"]): string {
  return {
    poison: "毒",
    paralysis: "麻痺",
    sleep: "睡眠",
    burn: "火傷"
  }[kind];
}

function playTone(audioRef: React.MutableRefObject<AudioContext | null>, kind: GameState["lastAction"]["kind"]) {
  if (typeof window === "undefined") {
    return;
  }
  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioCtor) {
    return;
  }
  audioRef.current ??= new AudioCtor();
  const context = audioRef.current;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequency = {
    idle: 180,
    town: 260,
    attack: 520,
    skill: 660,
    magic: 760,
    item: 420,
    enemy: 180,
    loot: 920
  }[kind];
  oscillator.type = kind === "magic" || kind === "loot" ? "triangle" : "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.035;
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.13);
}

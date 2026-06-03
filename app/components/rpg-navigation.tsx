"use client";

import Link from "next/link";
import {
  Backpack,
  Compass,
  Database,
  Hammer,
  Home,
  ScrollText,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Zap
} from "lucide-react";
import type { ReactNode } from "react";
import type { GameView } from "@/lib/game/types";

const views: Array<{ id: GameView; label: string; icon: ReactNode; href: string }> = [
  { id: "home", label: "街", icon: <Home size={16} />, href: "/" },
  { id: "adventure", label: "冒険", icon: <Compass size={16} />, href: "/adventure" },
  { id: "character", label: "育成", icon: <Zap size={16} />, href: "/character" },
  { id: "equipment", label: "装備", icon: <Shield size={16} />, href: "/equipment" },
  { id: "inventory", label: "バッグ", icon: <Backpack size={16} />, href: "/inventory" },
  { id: "craft", label: "工房", icon: <Hammer size={16} />, href: "/craft" },
  { id: "shop", label: "店", icon: <ShoppingBag size={16} />, href: "/shop" },
  { id: "quests", label: "依頼", icon: <Trophy size={16} />, href: "/quests" },
  { id: "codex", label: "図鑑", icon: <ScrollText size={16} />, href: "/codex" },
  { id: "guild", label: "ギルド", icon: <Users size={16} />, href: "/guild" },
  { id: "gacha", label: "ガチャ", icon: <Sparkles size={16} />, href: "/gacha" },
  { id: "data", label: "保存", icon: <Database size={16} />, href: "/data" }
];

export function BottomNav({
  currentView,
  isPending,
  onNavigate
}: {
  currentView: GameView;
  isPending: boolean;
  onNavigate: () => void;
}) {
  return (
    <nav className="tab-bar wide bottom-nav" aria-label="街メニュー">
      {views.map((view) => {
        const active = currentView === view.id;
        return (
          <Link
            key={view.id}
            href={view.href}
            aria-disabled={isPending || active}
            className={active ? "nav-link active" : "nav-link"}
            onClick={(event) => {
              if (isPending || active) {
                event.preventDefault();
                return;
              }
              onNavigate();
            }}
          >
            <span className="button-icon">{view.icon}</span>
            <span className="button-copy">
              <strong>{view.label}</strong>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

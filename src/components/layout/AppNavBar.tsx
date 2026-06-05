import React from "react";
import type { NavItem } from "../../hooks/useNavigation";
import type { TabId } from "../../types/ui";
import { CORE_TAB_KEYS } from "./navConfig";

interface Props {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  proNavItems: NavItem[];
}

/**
 * Barre de navigation du bas. N'affiche que les onglets "core"
 * (Saisie / Dashboard / Suivi). Les autres sont accessibles via le
 * menu burger (NavDrawer).
 */
export function AppNavBar({ activeTab, setActiveTab, proNavItems }: Props) {
  const coreItems = proNavItems.filter((item) => CORE_TAB_KEYS.includes(item.key));

  return (
    <nav data-testid="mobile-navbar" className="fixed bottom-6 left-6 right-6 z-[100]">
      <div
        className={
          "backdrop-blur-3xl border p-2 rounded-[35px] shadow-2xl flex gap-1 bg-[var(--color-surface)] border-[var(--color-border-primary)]"
        }
      >
        {coreItems.map((item: NavItem) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key);
                if (typeof item.onClick === "function") item.onClick();
              }}
              className={
                "flex-1 rounded-[28px] font-black uppercase tracking-widest flex flex-col items-center justify-center py-4 text-[10px] gap-0.5 transition-all duration-200 " +
                (isActive
                  ? `bg-gradient-to-br ${item.activeClass} text-white shadow-lg`
                  : "text-[var(--color-text-muted)]")
              }
            >
              <span className="text-[16px] leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

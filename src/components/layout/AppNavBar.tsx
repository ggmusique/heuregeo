import React from "react";
import type { NavItem } from "../../hooks/useNavigation";
import type { TabId } from "../../types/ui";
import { CORE_TAB_KEYS } from "./navConfig";
import { Button } from "../ui/Button";

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
          "backdrop-blur-card border p-2 rounded-[35px] shadow-modal flex gap-1 bg-[var(--color-surface)] border-[var(--color-border-primary)]"
        }
      >
        {coreItems.map((item: NavItem) => {
          const isActive = activeTab === item.key;
          return (
            <Button
              key={item.key}
              variant={isActive ? "primary" : "ghost"}
              size="md"
              fullWidth
              onClick={() => {
                setActiveTab(item.key);
                if (typeof item.onClick === "function") item.onClick();
              }}
              className="flex-1 rounded-[28px] font-medium uppercase tracking-widest flex flex-col items-center justify-center py-4 text-[10px] gap-0.5"
            >
              <span className="text-[16px] leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

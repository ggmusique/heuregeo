import React, { useEffect } from "react";
import { supabase } from "../../services/supabase";
import type { NavItem } from "../../hooks/useNavigation";
import type { TabId } from "../../types/ui";
import { CORE_TAB_KEYS } from "./navConfig";

interface Props {
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  proNavItems: NavItem[];
  isViewer: boolean;
}

/**
 * Menu burger : tiroir latéral droit contenant les onglets "secondaires"
 * (tout ce qui n'est pas dans CORE_TAB_KEYS) + la déconnexion pour un viewer.
 * Fonctionne sur smartphone, tablette et desktop.
 */
export function NavDrawer({ open, onClose, activeTab, setActiveTab, proNavItems, isViewer }: Props) {
  // Fermeture au clavier (Échap)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const overflowItems = proNavItems.filter((item) => !CORE_TAB_KEYS.includes(item.key));

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navigation"
      className="fixed inset-0 z-[600] flex justify-end"
    >
      {/* Fond cliquable */}
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-overlay"
      />

      {/* Panneau du tiroir */}
      <aside
        className="drawer relative h-full w-[80%] max-w-[320px] ml-auto flex flex-col gap-2 p-5 pt-8 overflow-y-auto shadow-modal border-l bg-[var(--color-surface)] border-[var(--color-border-primary)] transition-transform duration-300"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
            Menu
          </span>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform border bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text)]"
          >
            <span className="text-[18px] leading-none">✕</span>
          </button>
        </div>

        {overflowItems.map((item: NavItem) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setActiveTab(item.key);
                if (typeof item.onClick === "function") item.onClick();
                onClose();
              }}
              className={
                "w-full rounded-[22px] font-black uppercase tracking-widest flex items-center gap-3 px-4 py-4 text-[13px] transition-transform active:scale-[0.98] " +
                (isActive
                  ? `bg-gradient-to-br ${item.activeClass} text-white shadow-lg`
                  : "text-[var(--color-text)] bg-[var(--color-surface-offset)] border border-[var(--color-border)]")
              }
            >
              <span className="text-[20px] leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {isViewer && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-[22px] font-black uppercase tracking-widest flex items-center gap-3 px-4 py-4 text-[13px] mt-1 transition-transform active:scale-[0.98] text-[var(--color-text)] bg-[var(--color-surface-offset)] border border-[var(--color-border)]"
          >
            <span className="text-[20px] leading-none">🚪</span>
            <span>Déconnexion</span>
          </button>
        )}
      </aside>
    </div>
  );
}

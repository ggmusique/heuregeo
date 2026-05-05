import React from "react";
import { useDarkMode } from "../../contexts/DarkModeContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { supabase } from "../../services/supabase";
import type { NavItem } from "../../hooks/useNavigation";
import type { TabId } from "../../types/ui";

interface Props {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  proNavItems: NavItem[];
}

export function AppNavBar({ activeTab, setActiveTab, proNavItems }: Props) {
  const { darkMode } = useDarkMode();
  const { isViewer, isPro, canDashboard, canAgenda } = usePermissions();

  const isProNavigationMode = isPro && !isViewer;

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-[100]">
      {isProNavigationMode ? (
        <div
          className={
            "backdrop-blur-3xl border p-2 rounded-[35px] shadow-2xl flex gap-1 " +
            (darkMode ? "bg-[var(--color-surface)] border-yellow-500/30" : "bg-white/95 border-slate-200/80")
          }
        >
          {proNavItems.map((item: NavItem) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (typeof item.onClick === "function") item.onClick();
                }}
                className={
                  "flex-1 rounded-[28px] font-black uppercase tracking-widest flex flex-col items-center justify-center py-2 text-[9px] gap-0.5 transition-all duration-200 " +
                  (isActive
                    ? `bg-gradient-to-br ${item.activeClass} text-white shadow-lg`
                    : darkMode
                    ? "text-white/35"
                    : "text-slate-400")
                }
              >
                <span className="text-[14px] leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className={
            "backdrop-blur-3xl border p-2 rounded-[35px] shadow-2xl flex gap-1 " +
            (darkMode
              ? "bg-[var(--color-surface)] border-yellow-600/20"
              : "bg-white/95 border-slate-200/80")
          }
        >
          {!isViewer && (
            <button
              onClick={() => setActiveTab("saisie")}
              className={
                "flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " +
                (activeTab === "saisie"
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white"
                  : darkMode
                  ? "text-white/30"
                  : "text-slate-400")
              }
            >
              Saisie
            </button>
          )}
          {canDashboard && !isViewer && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className={
                "flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " +
                (activeTab === "dashboard"
                  ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white"
                  : darkMode
                  ? "text-white/30"
                  : "text-slate-400")
              }
            >
              Dashboard
            </button>
          )}
          <button
            onClick={() => setActiveTab("suivi")}
            className={
              "flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " +
              (activeTab === "suivi"
                ? "bg-gradient-to-br from-cyan-600 to-indigo-700 text-white"
                : darkMode
                ? "text-white/30"
                : "text-slate-400")
            }
          >
            Suivi
          </button>
          {!isViewer ? (
            <button
              onClick={() => setActiveTab("parametres")}
              className={
                "flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 " +
                (activeTab === "parametres"
                  ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
                  : darkMode
                  ? "text-white/30"
                  : "text-slate-400")
              }
            >
              <span>Parametres</span>
            </button>
          ) : (
            <button
              onClick={() => supabase.auth.signOut()}
              className={
                "flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 " +
                (darkMode ? "text-white/30" : "text-slate-400")
              }
            >
              <span>🚪</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

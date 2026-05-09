import React from "react";
import { useDarkMode } from "../../contexts/DarkModeContext";
import { ViewerBadge } from "../common/ViewerBadge";

interface Props {
  profile: any;
  isViewer: boolean;
  isPro: boolean;
  liveTime: string;
  APP_VERSION: string;
}

export function AppHeader({ profile, isViewer, isPro, liveTime, APP_VERSION }: Props) {
  const { darkMode, setDarkMode } = useDarkMode();

  return (
    <header
      className={
        "relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl border-b " +
        (darkMode ? "border-yellow-600/30" : "border-slate-200/80")
      }
    >
      <div
        className={
          "absolute inset-0 backdrop-blur-xl " +
          (darkMode
            ? "bg-[var(--color-surface)]"
            : "bg-gradient-to-br from-white via-slate-50 to-indigo-50/60")
        }
      />
      <div className="relative z-10 text-center">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={
            "absolute right-6 top-6 w-12 h-12 backdrop-blur-xl rounded-full flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-all border " +
            (darkMode ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-300")
          }
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
        <h1 className="relative text-[30px] font-black italic tracking-[0.1em] text-[var(--color-primary)] mb-2 drop-shadow-2xl font-['Playfair_Display']">
          {"HEURES DE " + (profile?.prenom?.trim()?.toUpperCase() || "GEO")}
        </h1>
        {isViewer && <ViewerBadge patronNom={profile?.nom || ""} />}
        {isPro && !isViewer && (
          <div className="text-center py-1">
            <span
              className={
                "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border " +
                (darkMode
                  ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                  : "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/60 text-[var(--color-primary)]")
              }
            >
              ✨ Pro
            </span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span
            className={
              "text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-0.5 rounded-full border " +
              (darkMode
                ? "border-[var(--color-primary)]/40 text-[var(--color-primary)]/70"
                : "border-[var(--color-primary)]/50 text-[var(--color-primary)]/80")
            }
          >
            v{APP_VERSION} ✓ OTA
          </span>
        </div>
        <div
          className={
            "flex items-center justify-center gap-2 " +
            (darkMode ? "text-white/90" : "text-slate-700")
          }
        >
          <span className="text-[17px] font-black tracking-tight">{liveTime}</span>
          <span className="text-[15px] font-medium opacity-80 lowercase">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>
    </header>
  );
}

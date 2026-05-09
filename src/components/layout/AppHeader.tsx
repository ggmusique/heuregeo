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
        "relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl border-b border-[var(--color-border-primary)]"
      }
    >
      <div
        className={
          "absolute inset-0 backdrop-blur-xl bg-[var(--color-surface)]"
        }
      />
      <div className="relative z-10 text-center">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={
            "absolute right-6 top-6 w-12 h-12 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text)]"
          }
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
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
                "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
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
            "flex items-center justify-center gap-2 text-[var(--color-text)]"
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

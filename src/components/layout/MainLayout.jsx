import React from "react";
import { tokens } from "../../utils/designTokens";

export function MainLayout({ children, profile, themeConfig, isDark, liveTime, isLoading, loadingMessage }) {
  return (
    <div className={isDark ? "dark bg-[#020818] text-white" : "light " + themeConfig.bg}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {themeConfig.overlay && <div className={"absolute inset-0 " + themeConfig.overlay} />}
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* Loading Overlay Premium */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#020818]/90 backdrop-blur-md">
          <h1 className="text-[#D4AF37] font-black text-2xl italic tracking-[0.2em] mb-4 animate-pulse">
            HEURES DE {profile?.prenom?.trim()?.toUpperCase() || "GEO"}
          </h1>
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#D4AF37] animate-[shimmer_1.5s_infinite]" style={{ width: '60%' }} />
          </div>
          <p className="mt-4 text-white/40 font-mono text-xs tracking-widest">{loadingMessage || "CHARGEMENT..."}</p>
        </div>
      )}

      {/* Header Simplifié */}
      <header className={"relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl border-b " + themeConfig.accentBorder}>
        <div className={"absolute inset-0 backdrop-blur-xl " + themeConfig.headerBg} />
        <div className="relative z-10 text-center">
          <h1 className="relative text-[30px] font-black italic tracking-[0.1em] text-[#D4AF37] mb-2 drop-shadow-2xl font-['Playfair_Display']">
            {"HEURES DE " + (profile?.prenom?.trim()?.toUpperCase() || "GEO")}
          </h1>
          <div className={"flex items-center justify-center gap-2 " + (isDark ? "text-white/90" : "text-slate-700")}>
            <span className="text-[17px] font-black tracking-tight">{liveTime}</span>
            <span className="text-[15px] font-medium opacity-80 lowercase">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative px-5 -mt-10 pb-32 z-10">
        {children}
      </main>
    </div>
  );
}

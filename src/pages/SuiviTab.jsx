import React, { useMemo, useState } from "react";
import { HistoriqueTab } from "./HistoriqueTab";
import { BilanTab } from "./BilanTab";
import { DashboardPanel } from "../components/dashboard/DashboardPanel";

export function SuiviTab({
  defaultView = "dashboard",
  darkMode = true,
  dashboardProps,
  historiqueProps,
  bilanProps,
}) {
  const [view, setView] = useState(
    defaultView === "bilan" ? "bilan" :
    defaultView === "historique" ? "historique" :
    "dashboard"
  );

  const tabs = useMemo(
    () => [
      { key: "dashboard", label: "📊 Dashboard" },
      { key: "historique", label: "Historique" },
      { key: "bilan", label: "Bilan" },
    ],
    []
  );

  return (
    <section className="space-y-4">
      <div className={"rounded-2xl border p-2 backdrop-blur-xl flex gap-2 " + (darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm")}>
        {tabs.map((tab) => {
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={
                "flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all " +
                (isActive ? "bg-indigo-600 text-white" : (darkMode ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-800"))
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {view === "dashboard" && (
        <DashboardPanel
          missions={dashboardProps.missions}
          fraisDivers={dashboardProps.fraisDivers}
          listeAcomptes={dashboardProps.listeAcomptes}
          patrons={dashboardProps.patrons}
          clients={dashboardProps.clients}
          lieux={dashboardProps.lieux}
          profile={dashboardProps.profile}
          darkMode={dashboardProps.darkMode}
          kmSettings={dashboardProps.kmSettings}
          domicileLatLng={dashboardProps.domicileLatLng}
        />
      )}
      {view === "historique" && <HistoriqueTab {...historiqueProps} />}
      {view === "bilan" && <BilanTab {...bilanProps} />}
    </section>
  );
}

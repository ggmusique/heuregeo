import React, { useEffect, useMemo, useState } from "react";
import { HistoriqueTab } from "./HistoriqueTab";
import { BilanTab } from "./BilanTab";

export function SuiviTab({
  defaultView = "historique",
  darkMode = true,
  historiqueProps,
  bilanProps,
}) {
  const [view, setView] = useState(defaultView);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const tabs = useMemo(
    () => [
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

      {view === "historique" && <HistoriqueTab {...historiqueProps} />}
      {view === "bilan" && <BilanTab {...bilanProps} />}
    </section>
  );
}

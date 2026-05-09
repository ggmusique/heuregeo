import React, { useMemo, useState, lazy, Suspense } from "react";
import { usePermissions } from "../contexts/PermissionsContext";

const HistoriqueTab = lazy(() =>
  import("./HistoriqueTab").then((m) => ({ default: m.HistoriqueTab }))
);
const BilanTab = lazy(() =>
  import("./BilanTab").then((m) => ({ default: m.BilanTab }))
);

const LazyFallback = () => (
  <div className="flex justify-center py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-yellow-500 border-t-transparent" />
  </div>
);

interface Props {
  defaultView?: string;
  historiqueProps: any;
  bilanProps: any;
  onNavigateDashboard?: () => void;
}

export function SuiviTab({
  defaultView = "historique",
  historiqueProps,
  bilanProps,
  onNavigateDashboard,
}: Props) {
  const { isViewer, viewerPatronId, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canFacture } = usePermissions();
  const [view, setView] = useState(
    defaultView === "bilan" ? "bilan" : "historique"
  );

  const tabs = useMemo(
    () => [
      { key: "historique", label: "Historique" },
      { key: "bilan", label: "Bilan" },
    ],
    []
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border p-2 backdrop-blur-xl flex gap-2 border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {onNavigateDashboard && (
          <button
            onClick={onNavigateDashboard}
            className="flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            📊 Dashboard
          </button>
        )}
        {tabs.map((tab) => {
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={
                "flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all " +
                (isActive ? "bg-[var(--color-accent-violet)] text-[var(--color-bg)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {view === "historique" && (
        <Suspense fallback={<LazyFallback />}>
          <HistoriqueTab
            {...historiqueProps}
            isViewer={isViewer}
            viewerPatronId={viewerPatronId}
          />
        </Suspense>
      )}
      {view === "bilan" && (
        <Suspense fallback={<LazyFallback />}>
          <BilanTab
            {...bilanProps}
            isViewer={isViewer}
            canBilanMois={canBilanMois}
            canBilanAnnee={canBilanAnnee}
            canExportPDF={canExportPDF}
            canExportExcel={canExportExcel}
            canExportCSV={canExportCSV}
            canFacture={canFacture}
          />
        </Suspense>
      )}
    </section>
  );
}

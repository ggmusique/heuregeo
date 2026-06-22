import React, { useMemo, useState, lazy, Suspense } from "react";
import { usePermissions } from "../contexts/PermissionsContext";
import { ReserveTab } from "./ReserveTab";
import { BilanTab } from "./BilanTab";

const HistoriqueTab = lazy(() =>
  import("./HistoriqueTab").then((m) => ({ default: m.HistoriqueTab }))
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
}: Props) {
  const { contract, isViewer, viewerPatronId, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canFacture } = usePermissions();
  const canShowReserveTab = contract.visibility.suivi.showReserveTab;
  const [view, setView] = useState(
    defaultView === "bilan" ? "bilan" : defaultView === "reserve" && canShowReserveTab ? "reserve" : "historique"
  );

  const tabs = useMemo(
    () => [
      ...(canShowReserveTab ? [{ key: "reserve", label: "Réserve heures" }] : []),
      { key: "historique", label: "Historique" },
      { key: "bilan", label: "Bilan" },
    ],
    [canShowReserveTab]
  );

  return (
    <section className="space-y-4">
      <div
        className={
          "grid gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-modal " +
          (canShowReserveTab ? "grid-cols-3" : "grid-cols-2")
        }
      >
        {tabs.map((tab) => {
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={
                "min-h-11 rounded-[var(--radius-lg)] px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-colors " +
                (isActive ? "bg-[var(--color-accent-violet)] text-[var(--color-bg)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {view === "reserve" && (
        <ReserveTab
          patronId={bilanProps?.bilanPatronId ?? null}
          patronName={bilanProps?.getPatronNom?.(bilanProps?.bilanPatronId ?? null)}
          quotaHours={contract.hoursPerWeek}
        />
      )}
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
        <BilanTab
          {...bilanProps}
          onOpenReserve={canShowReserveTab ? () => setView("reserve") : undefined}
          isViewer={isViewer}
          isProContractEnabled={contract.source.isPro}
          canBilanMois={canBilanMois}
          canBilanAnnee={canBilanAnnee}
          canExportPDF={canExportPDF}
          canExportExcel={canExportExcel}
          canExportCSV={canExportCSV}
          canFacture={canFacture}
        />
      )}
    </section>
  );
}

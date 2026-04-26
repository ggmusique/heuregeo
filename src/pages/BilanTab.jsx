import React, { useMemo } from "react";
import { formatEuro, formatDateFR } from "../utils/formatters";
import { MissionCard } from "../components/mission/MissionCard";
import { WeekPicker } from "../components/common/bilan/WeekPicker";
import { useLabels } from "../contexts/LabelsContext";
import { BilanPanel } from "../components/stats/BilanPanel";

export const BilanTab = ({
  bilan,
  bilanPatronId,
  currentWeek,
  missionsThisWeek,
  darkMode,
  patrons,
  getPatronNom,
  getPatronColor,
  onMarquerCommePaye,
  onFraisEdit,
  onFraisDelete,
  onMissionEdit,
  onMissionDelete,
  profile,
  isViewer,
  canBilanMois = true,
  canBilanAnnee = true,
  canExportPDF = true,
  canExportExcel = true,
  canExportCSV = true,
  canFacture = false,
  saveProfile = null,
  kmSettings = null,
  kmFraisThisWeek = null,
  domicileLatLng = null,
  onRecalculerFraisKm = null,
}) => {
  const L = useLabels();
  const exportBilanContent = useMemo(() => {
    if (kmSettings?.km_enable === true) return bilan.bilanContent;
    return {
      ...bilan.bilanContent,
      fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
    };
  }, [bilan.bilanContent, kmSettings?.km_enable]);

  const sortedBilanMissions = useMemo(() => {
    if (!bilan.bilanContent?.filteredData) return [];
    return [...bilan.bilanContent.filteredData].sort(
      (a, b) => new Date(a.date_iso) - new Date(b.date_iso)
    );
  }, [bilan.bilanContent?.filteredData]);

  if (!bilan.showBilan) {
    return (
      <div className="animate-in slide-in-from-right duration-400">
        <div className="mb-12 space-y-4">
          <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center">
            Rapports & Bilans
          </p>
          <button
            onClick={() => {
              bilan.setShowBilan(false);
              bilan.setShowPeriodModal(true);
            }}
            className={"w-full py-6 bg-gradient-to-r from-[#C9A84C] to-[#A07830] rounded-3xl font-black text-[14px] uppercase shadow-xl active:scale-95 transition-all " +
              (darkMode ? "text-white" : "text-slate-800")}
          >
            Rapport bilan
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em]">
            Semaine en cours (S{currentWeek})
          </p>

          {missionsThisWeek.length === 0 ? (
            <p className="text-center text-[13px] opacity-60 py-8">
              Aucune mission cette semaine...
            </p>
          ) : (
            [...missionsThisWeek]
              .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso))
              .map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onEdit={isViewer ? null : onMissionEdit}
                  onDelete={isViewer ? null : onMissionDelete}
                  patronNom={getPatronNom(m.patron_id)}
                  patronColor={getPatronColor(m.patron_id)}
                />
              ))
          )}

          {/* ── BLOC FRAIS KM – Semaine en cours ── */}
          {kmSettings?.km_enable === true && missionsThisWeek.length > 0 && (
            kmFraisThisWeek?.items?.length > 0 ? (
              <div className={"mt-2 p-4 rounded-[25px] border backdrop-blur-md " +
                (darkMode ? "bg-[#0A1628]/60 border-blue-600/20" : "bg-white/80 border-blue-200")}>
                <p className={"text-[10px] font-black uppercase mb-3 tracking-[0.2em] " +
                  (darkMode ? "text-blue-400/70" : "text-blue-600")}>
                  🚗 Frais kilométriques
                </p>
                <div className="space-y-2 mb-3">
                  {kmFraisThisWeek.items.filter((item) => item.amount !== null).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div>
                        <span className={"font-bold " + (darkMode ? "text-white/80" : "text-slate-700")}>{formatDateFR(item.date)}</span>
                        <span className={"ml-2 " + (darkMode ? "text-white/50" : "text-slate-400")}>{item.labelLieuOuClient}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-300/80 text-xs">{Math.round(item.kmTotal)} km</span>
                        <span className="font-bold text-blue-300 ml-2">{formatEuro(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                  {kmFraisThisWeek.items.filter((item) => item.amount === null).map((item, i) => (
                    <div key={`missing-${i}`} className={"text-sm italic " + (darkMode ? "text-white/40" : "text-slate-400")}>
                      {formatDateFR(item.date)} — {item.labelLieuOuClient}
                    </div>
                  ))}
                </div>
                {kmFraisThisWeek.totalAmount > 0 && (
                  <div className={"pt-2 border-t flex justify-between " + (darkMode ? "border-white/10" : "border-slate-200")}>
                    <span className={"text-sm " + (darkMode ? "text-white/60" : "text-slate-500")}>{Math.round(kmFraisThisWeek.totalKm)} km total</span>
                    <span className="font-black text-blue-300">{formatEuro(kmFraisThisWeek.totalAmount)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={"mt-2 p-4 rounded-[25px] border text-sm italic " +
                (darkMode ? "bg-[#0A1628]/40 border-blue-600/10 text-white/40" : "bg-blue-50/60 border-blue-100 text-slate-400")}>
                🚗 Frais kilométriques —{" "}
                {!domicileLatLng
                  ? "adresse domicile manquante ou non géocodée (vérifiez Paramètres → Km)"
                  : "coordonnées GPS manquantes pour les lieux de mission"}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <button
        onClick={() => bilan.setShowBilan(false)}
        className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase opacity-50"
      >
        ← Retour
      </button>

      {/* Navigation de période */}
      <div className="flex justify-end mb-4">
        <WeekPicker
          value={bilan.bilanPeriodValue}
          weeks={bilan.availablePeriods}
          onChange={bilan.handleWeekChange}
          onPrevious={bilan.gotoPreviousWeek}
          onNext={bilan.gotoNextWeek}
          hasPrevious={bilan.hasPreviousWeek}
          hasNext={bilan.hasNextWeek}
        />
      </div>

      <BilanPanel
        bilanContent={bilan.bilanContent}
        bilanPeriodType={bilan.bilanPeriodType}
        bilanPaye={bilan.bilanPaye}
        sortedMissions={sortedBilanMissions}
        onMarquerCommePaye={onMarquerCommePaye}
        isViewer={isViewer}
        canExportExcel={canExportExcel}
        canExportPDF={canExportPDF}
        canExportCSV={canExportCSV}
        canFacture={canFacture}
        onExportExcel={async () => {
          if (!canExportExcel) return;
          const { exportToExcel } = await import("../utils/exportUtils");
          exportToExcel(exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue,
            exportBilanContent.titre, exportBilanContent.fraisDivers, profile, L);
        }}
        onExportPDF={async () => {
          if (!canExportPDF) return;
          const { exportToPDFPro } = await import("../utils/exportPDF_Pro");
          exportToPDFPro(exportBilanContent, bilan.bilanPeriodType, bilan.bilanPaye,
            bilan.bilanPeriodValue, profile, L);
        }}
        onExportCSV={async () => {
          if (!canExportCSV) return;
          const { exportToCSV } = await import("../utils/exportUtils");
          exportToCSV(exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue, false, L);
        }}
        onExportCSVWithFrais={async () => {
          if (!canExportCSV) return;
          const { exportToCSV } = await import("../utils/exportUtils");
          exportToCSV(exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue, true, L);
        }}
        onExportFacture={async () => {
          const { generateFacture } = await import("../utils/generateFacture");
          const patron = patrons.find((p) => p.id === bilanPatronId) || null;
          await generateFacture(exportBilanContent, bilan.bilanPeriodType,
            bilan.bilanPeriodValue, profile, patron, saveProfile, L);
        }}
        onFraisEdit={onFraisEdit}
        onFraisDelete={onFraisDelete}
        kmSettings={kmSettings}
        onRecalculerFraisKm={onRecalculerFraisKm}
        isRecalculatingKm={bilan.isRecalculatingKm}
        domicileLatLng={domicileLatLng}
      />
    </div>
  );
};


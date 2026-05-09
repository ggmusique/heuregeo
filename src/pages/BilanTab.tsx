import React, { useMemo } from "react";
import { formatEuro, formatDateFR } from "../utils/formatters";
import { MissionCard } from "../components/mission/MissionCard";
import { WeekPicker } from "../components/common/bilan/WeekPicker";
import { useLabels } from "../contexts/LabelsContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { BilanPanel } from "../components/stats/BilanPanel";
import type { Mission, Patron, FraisDivers } from "../types/entities";
import type { UserProfile } from "../types/profile";
import type { KmSettings, KmFraisResult } from "../hooks/useKmDomicile";
import type { UseBilanReturn } from "../hooks/useBilan";

interface Props {
  bilan: UseBilanReturn;
  bilanPatronId: string | null;
  currentWeek: number;
  missionsThisWeek: Mission[];
  patrons: Patron[];
  getPatronNom: (id: string | null) => string;
  getPatronColor: (id: string | null) => string;
  onMarquerCommePaye?: () => void;
  onFraisEdit?: (frais: FraisDivers) => void;
  onFraisDelete?: (frais: FraisDivers) => void;
  onMissionEdit?: (mission: Mission) => void;
  onMissionDelete?: (id: string) => void;
  profile: UserProfile | null;
  isViewer?: boolean;
  canBilanMois?: boolean;
  canBilanAnnee?: boolean;
  canExportPDF?: boolean;
  canExportExcel?: boolean;
  canExportCSV?: boolean;
  canFacture?: boolean;
  saveProfile?: ((updates: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>) | null;
  kmSettings?: KmSettings | null;
  kmFraisThisWeek?: KmFraisResult | null;
  domicileLatLng?: { lat: number; lng: number } | null;
  onRecalculerFraisKm?: (() => void) | null;
}

export const BilanTab = ({
  bilan,
  bilanPatronId,
  currentWeek,
  missionsThisWeek,
  patrons,
  getPatronNom,
  getPatronColor,
  onMarquerCommePaye,
  onFraisEdit,
  onFraisDelete,
  onMissionEdit,
  onMissionDelete,
  profile,
  // permissions can come from props (passed by SuiviTab) or fallback to context
  isViewer: isViewerProp,
  canBilanMois: canBilanMoisProp,
  canBilanAnnee: canBilanAnneeProp,
  canExportPDF: canExportPDFProp,
  canExportExcel: canExportExcelProp,
  canExportCSV: canExportCSVProp,
  canFacture: canFactureProp,
  saveProfile = null,
  kmSettings = null,
  kmFraisThisWeek = null,
  domicileLatLng = null,
  onRecalculerFraisKm = null,
}: Props) => {
  const { darkMode } = useDarkMode();
  const perms = usePermissions();
  const isViewer    = isViewerProp    !== undefined ? isViewerProp    : perms.isViewer;
  const canBilanMois  = canBilanMoisProp  !== undefined ? canBilanMoisProp  : perms.canBilanMois;
  const canBilanAnnee = canBilanAnneeProp !== undefined ? canBilanAnneeProp : perms.canBilanAnnee;
  const canExportPDF  = canExportPDFProp  !== undefined ? canExportPDFProp  : perms.canExportPDF;
  const canExportExcel= canExportExcelProp!== undefined ? canExportExcelProp: perms.canExportExcel;
  const canExportCSV  = canExportCSVProp  !== undefined ? canExportCSVProp  : perms.canExportCSV;
  const canFacture    = canFactureProp    !== undefined ? canFactureProp    : perms.canFacture;
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
      (a: Mission, b: Mission) => new Date(a.date_iso ?? "").getTime() - new Date(b.date_iso ?? "").getTime()
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
            className={"w-full py-6 bg-gradient-to-r from-[var(--color-primary)] to-[color-mix(in_srgb,var(--color-primary)_60%,#000)] rounded-3xl font-black text-[14px] uppercase shadow-xl active:scale-95 transition-all " +
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
              .sort((a: Mission, b: Mission) => new Date(a.date_iso ?? "").getTime() - new Date(b.date_iso ?? "").getTime())
              .map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onEdit={isViewer ? undefined : onMissionEdit}
                  onDelete={isViewer ? undefined : onMissionDelete}
                  patronNom={getPatronNom(m.patron_id)}
                  patronColor={getPatronColor(m.patron_id)}
                />
              ))
          )}

          {/* ── BLOC FRAIS KM – Semaine en cours ── */}
          {kmSettings?.km_enable === true && missionsThisWeek.length > 0 && (
            kmFraisThisWeek !== null && kmFraisThisWeek.items.length > 0 ? (
              <div className={"mt-2 p-4 rounded-[25px] border backdrop-blur-md " +
                (darkMode ? "bg-[var(--color-bg)]/60 border-blue-600/20" : "bg-white/80 border-blue-200")}>
                <p className={"text-[10px] font-black uppercase mb-3 tracking-[0.2em] " +
                  (darkMode ? "text-blue-400/70" : "text-blue-600")}>
                  🚗 Frais kilométriques
                </p>
                <div className="space-y-2 mb-3">
                  {kmFraisThisWeek.items.filter((item) => item.amount !== null).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div>
                        <span className={"font-bold " + (darkMode ? "text-white/80" : "text-slate-700")}>{formatDateFR(item.date ?? "")}</span>
                        <span className={"ml-2 " + (darkMode ? "text-white/50" : "text-slate-400")}>{item.labelLieuOuClient}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-300/80 text-xs">{Math.round(item.kmTotal ?? 0)} km</span>
                        <span className="font-bold text-blue-300 ml-2">{formatEuro(item.amount ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                  {kmFraisThisWeek.items.filter((item) => item.amount === null).map((item, i) => (
                    <div key={`missing-${i}`} className={"text-sm italic " + (darkMode ? "text-white/40" : "text-slate-400")}>
                    {formatDateFR(item.date ?? "")} — {item.labelLieuOuClient}
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
                (darkMode ? "bg-[var(--color-bg)]/40 border-blue-600/10 text-white/40" : "bg-blue-50/60 border-blue-100 text-slate-400")}>
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
          onChange={(w) => bilan.handleWeekChange(String(w))}
          onPrevious={bilan.gotoPreviousWeek}
          onNext={bilan.gotoNextWeek}
          hasPrevious={bilan.hasPreviousWeek}
          hasNext={bilan.hasNextWeek}
        />
      </div>

      <BilanPanel
        bilanContent={bilan.bilanContent}
        bilanPeriodType={bilan.bilanPeriodType as "semaine" | "mois" | "annee" | undefined}
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
          // Wrap saveProfile to match generateFacture's (data: any) => Promise<void> signature
          // and safely handle the null case (no-op when saveProfile is unavailable).
          const sp = saveProfile
            ? async (data: Partial<UserProfile>) => { await saveProfile(data); }
            : async () => {};
          await generateFacture(exportBilanContent, bilan.bilanPeriodType,
            bilan.bilanPeriodValue, profile, patron, sp, L);
        }}
        onFraisEdit={onFraisEdit}
        onFraisDelete={onFraisDelete}
        kmSettings={kmSettings}
        onRecalculerFraisKm={onRecalculerFraisKm ?? undefined}
        isRecalculatingKm={bilan.isRecalculatingKm}
        domicileLatLng={domicileLatLng}
      />
    </div>
  );
};


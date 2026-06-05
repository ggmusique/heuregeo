import React, { useEffect, useMemo, useState } from "react";
import { MissionCard } from "../components/mission/MissionCard";
import { RapportBilanVisualV1 } from "../components/bilan/RapportBilanVisualV1";
import { WhatsAppSecureModal } from "../components/common/WhatsAppSecureModal";
import { formatDateFR, formatEuro } from "../utils/formatters";
import { sanitizeErrorForDisplay } from "../utils/sanitize";
import { buildPdfFilename } from "../utils/pdfFilename";
import { computePeriodDates } from "../lib/bilanPeriods";
import { useLabels } from "../contexts/LabelsContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { calculateWeeklyBilan } from "../features/contracts";
import { useReserve } from "../features/contracts/reserve";
import type { Mission, Patron, FraisDivers } from "../types/entities";
import type { UserProfile } from "../types/profile";
import type { KmFraisResult, KmSettings } from "../hooks/useKmDomicile";
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
  isProContractEnabled?: boolean;
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
  onOpenReserve?: (() => void) | null;
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
  isViewer: isViewerProp,
  isProContractEnabled: isProContractEnabledProp,
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
  onOpenReserve = null,
}: Props) => {
  const perms = usePermissions();
  const L = useLabels();
  const isViewer = isViewerProp !== undefined ? isViewerProp : perms.isViewer;
  const isProContractEnabled = isProContractEnabledProp !== undefined ? isProContractEnabledProp : perms.isPro;
  const canExportPDF = canExportPDFProp !== undefined ? canExportPDFProp : perms.canExportPDF;
  const canExportExcel = canExportExcelProp !== undefined ? canExportExcelProp : perms.canExportExcel;
  const canExportCSV = canExportCSVProp !== undefined ? canExportCSVProp : perms.canExportCSV;
  const canFacture = canFactureProp !== undefined ? canFactureProp : perms.canFacture;
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isWhatsAppSubmitting, setIsWhatsAppSubmitting] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const reserve = useReserve(bilanPatronId);

  const exportBilanContent = useMemo(() => {
    const workedHours = Number(bilan.bilanContent?.totalH ?? 0);
    const averageHourlyRate = Number(bilan.bilanContent?.contractSummary?.averageHourlyRate ?? 0);
    const summary = bilan.bilanContent?.contractSummary;
    const metrics = summary
      ? {
          workedHours: Number(summary.workedHours ?? workedHours),
          quotaHours: Number(summary.quotaHours ?? perms.contract.hoursPerWeek),
          payableHours: Number(summary.payableHours ?? 0),
          reserveHours: Number(summary.reserveHours ?? 0),
          overtimeHours: Number(summary.quotaOverflowHours ?? 0),
          quotaOverflowHours: Number(summary.quotaOverflowHours ?? 0),
        }
      : calculateWeeklyBilan({ workedHours }, perms.contract);
    const surplusGrossAmount = Number(
      summary?.surplusGrossAmount ?? Math.max(0, metrics.payableHours * averageHourlyRate),
    );
    const acompteAppliedAmount = Number(bilan.bilanContent?.totalAcomptes ?? 0);
    const fraisRemboursablesAmount = Number(bilan.bilanContent?.totalFrais ?? 0);
    const fraisDeductiblesAmount = 0;
    const appTotalAmount = Math.max(0, surplusGrossAmount - acompteAppliedAmount + fraisRemboursablesAmount - fraisDeductiblesAmount);

    const reserveMovements = reserve.movements.slice(0, 20).map((movement) => ({
      id: movement.id,
      date: movement.movement_date,
      type: movement.movement_type,
      source: movement.movement_source,
      deltaHours: Number(movement.delta_hours),
      comment: movement.comment,
      missionId: movement.mission_id,
    }));

    const contractSummary = {
      mode: perms.contract.source.mode,
      quotaHours: metrics.quotaHours,
      workedHours: metrics.workedHours,
      contractualExternalHours: Math.min(metrics.workedHours, metrics.quotaHours),
      surplusHours: metrics.quotaOverflowHours,
      payableHours: metrics.payableHours,
      reserveHours: metrics.reserveHours,
      quotaOverflowHours: metrics.quotaOverflowHours,
      surplusRule: perms.contract.surplusRule,
      surplusSplitPct: perms.contract.surplusSplitPct,
      averageHourlyRate,
      surplusGrossAmount,
      acompteAppliedAmount,
      fraisRemboursablesAmount,
      fraisDeductiblesAmount,
      appTotalAmount,
      externalPaymentLabel: "payé par source externe",
      contractType: perms.contract.contractType,
      reserveBalanceHours: reserve.balanceHours,
    };

    const content = {
      ...bilan.bilanContent,
      reserveMovements,
      contractSummary,
    };

    if (kmSettings?.km_enable === true) return content;

    return {
      ...content,
      fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
    };
  }, [
    bilan.bilanContent,
    kmSettings?.km_enable,
    reserve.movements,
    reserve.balanceHours,
    perms.contract.source.mode,
    perms.contract,
  ]);

  const sortedBilanMissions = useMemo(() => {
    if (!bilan.bilanContent?.filteredData) return [];
    return [...bilan.bilanContent.filteredData].sort(
      (a: Mission, b: Mission) => new Date(a.date_iso ?? "").getTime() - new Date(b.date_iso ?? "").getTime(),
    );
  }, [bilan.bilanContent?.filteredData]);

  const periodOptions = useMemo(
    () => bilan.availablePeriods.map((periodValue) => ({
      value: String(periodValue),
      label: bilan.formatPeriodLabel(periodValue),
      helper: "Période disponible",
    })),
    [bilan.availablePeriods, bilan],
  );

  const contractMetrics = useMemo(() => {
    const summary = bilan.bilanContent?.contractSummary;
    if (summary) {
      return {
        workedHours: Number(summary.workedHours ?? 0),
        quotaHours: Number(summary.quotaHours ?? perms.contract.hoursPerWeek),
        payableHours: Number(summary.payableHours ?? 0),
        reserveHours: Number(summary.reserveHours ?? 0),
        overtimeHours: Number(summary.quotaOverflowHours ?? 0),
        quotaOverflowHours: Number(summary.quotaOverflowHours ?? 0),
      };
    }

    const workedHours = Number(bilan.bilanContent?.totalH ?? 0);
    return calculateWeeklyBilan({ workedHours }, perms.contract);
  }, [bilan.bilanContent?.contractSummary, bilan.bilanContent?.totalH, perms.contract]);

  useEffect(() => {
    if (bilan.bilanPeriodType !== "semaine") return;
    if (!perms.contract.source.isPro) return;
    if (!bilan.bilanPeriodValue) return;
    const activeSince = profile?.features?.contract_active_since ?? null;
    if (activeSince) {
      const { finPeriode } = computePeriodDates(bilan.bilanPeriodType, String(bilan.bilanPeriodValue));
      if (finPeriode < activeSince) return;
    }

    void reserve.syncWeeklySettlement({
      periodValue: String(bilan.bilanPeriodValue),
      workedHours: contractMetrics.workedHours,
      quotaHours: contractMetrics.quotaHours,
      reserveEnabled: perms.contract.reserveEnabled,
      overflowRule: perms.contract.overflowRule,
      surplusSplitPct: perms.contract.surplusSplitPct,
    });
  }, [
    bilan.bilanPeriodType,
    bilan.bilanPeriodValue,
    contractMetrics.workedHours,
    contractMetrics.quotaHours,
    perms.contract.source.isPro,
    perms.contract.reserveEnabled,
    perms.contract.overflowRule,
    perms.contract.surplusSplitPct,
    profile?.features?.contract_active_since,
    reserve.syncWeeklySettlement,
  ]);

  const handleSecureWhatsAppShare = async (password: string) => {
    setWhatsAppError(null);
    setIsWhatsAppSubmitting(true);

    try {
      const { generatePDFProArrayBuffer } = await import("../utils/exportPDF_Pro");
      const { securePdf } = await import("../utils/securePdf");
      const { shareWhatsAppFile } = await import("../utils/shareWhatsApp");

      const pdfInput = {
        bilanContent: exportBilanContent,
        periodType: bilan.bilanPeriodType,
        estPaye: bilan.bilanPaye,
        periodValue: bilan.bilanPeriodValue,
        profile,
        labels: L,
      };

      const sourcePdfBytes = generatePDFProArrayBuffer(pdfInput);
      const secureBytes = await securePdf({
        sourcePdfBytes,
        password,
        regenerateEncryptedPdf: (pwd) => generatePDFProArrayBuffer({ ...pdfInput, password: pwd }),
      });

      const filename = buildPdfFilename(
        profile?.prenom,
        profile?.nom,
        bilan.bilanPeriodType,
        bilan.bilanPeriodValue,
      );
      const secureBuffer = secureBytes.buffer.slice(
        secureBytes.byteOffset,
        secureBytes.byteOffset + secureBytes.byteLength,
      ) as ArrayBuffer;
      const file = new File([secureBuffer], filename, { type: "application/pdf" });

      await shareWhatsAppFile(
        file,
        "Bonjour, voici votre PDF securise. Partagez le mot de passe via un canal separe.",
      );

      setIsWhatsAppModalOpen(false);
    } catch (error) {
      setWhatsAppError(sanitizeErrorForDisplay(error));
    } finally {
      setIsWhatsAppSubmitting(false);
    }
  };

  if (!bilan.showBilan) {
    return (
      <div className="animate-in slide-in-from-right duration-400">
        <div className="mb-12 space-y-4">
          <p className="px-2 text-center text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Rapports & Bilans
          </p>
          <button
            type="button"
            onClick={() => {
              bilan.setShowBilan(false);
              bilan.setShowPeriodModal(true);
            }}
            className="w-full rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--color-primary)] to-[color-mix(in_srgb,var(--color-primary)_60%,black)] py-6 text-[14px] font-black uppercase text-[var(--color-text)] shadow-modal transition-transform active:scale-[0.98]"
          >
            Rapport bilan
          </button>
        </div>

        <div className="space-y-4">
          <p className="px-2 text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Semaine en cours (S{currentWeek})
          </p>

          {missionsThisWeek.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-text-muted)]">
              Aucune mission cette semaine...
            </p>
          ) : (
            [...missionsThisWeek]
              .sort((a: Mission, b: Mission) => new Date(a.date_iso ?? "").getTime() - new Date(b.date_iso ?? "").getTime())
              .map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onEdit={isViewer ? undefined : onMissionEdit}
                  onDelete={isViewer ? undefined : onMissionDelete}
                  patronNom={getPatronNom(mission.patron_id)}
                  patronColor={getPatronColor(mission.patron_id)}
                />
              ))
          )}

          {kmSettings?.km_enable === true && missionsThisWeek.length > 0 && (
            kmFraisThisWeek !== null && kmFraisThisWeek.items.length > 0 ? (
              <div className="mt-2 rounded-[25px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent-cyan)]">
                  Frais kilometriques
                </p>
                <div className="mb-3 space-y-2">
                  {kmFraisThisWeek.items.filter((item) => item.amount !== null).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-[var(--color-text)]">{formatDateFR(item.date ?? "")}</span>
                        <span className="ml-2 text-[var(--color-text-muted)]">{item.labelLieuOuClient}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[var(--color-accent-cyan)]">{Math.round(item.kmTotal ?? 0)} km</span>
                        <span className="ml-2 font-bold text-[var(--color-accent-cyan)]">{formatEuro(item.amount ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                  {kmFraisThisWeek.items.filter((item) => item.amount === null).map((item, index) => (
                    <div key={`missing-${index}`} className="text-sm italic text-[var(--color-text-muted)]">
                      {formatDateFR(item.date ?? "")} - {item.labelLieuOuClient}
                    </div>
                  ))}
                </div>
                {kmFraisThisWeek.totalAmount > 0 && (
                  <div className="flex justify-between border-t border-[var(--color-border)] pt-2">
                    <span className="text-sm text-[var(--color-text-muted)]">{Math.round(kmFraisThisWeek.totalKm)} km total</span>
                    <span className="font-black text-[var(--color-accent-cyan)]">{formatEuro(kmFraisThisWeek.totalAmount)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 rounded-[25px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm italic text-[var(--color-text-muted)]">
                Frais kilometriques -{" "}
                {!domicileLatLng
                  ? "adresse domicile manquante ou non geocodee (verifiez Parametres -> Km)"
                  : "coordonnees GPS manquantes pour les lieux de mission"}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <RapportBilanVisualV1
        title={bilan.bilanContent?.titre || `Semaine ${bilan.bilanPeriodValue}`}
        subtitle={bilan.formatPeriodLabel(bilan.bilanPeriodValue)}
        onBack={() => bilan.setShowBilan(false)}
        onOpenGroupedPeriod={(periodType, periodValue) => {
          bilan.setBilanPeriodType(periodType);
          bilan.handleWeekChange(periodValue);
        }}
        periodOptions={periodOptions}
        selectedPeriodValue={String(bilan.bilanPeriodValue)}
        onSelectPeriod={(periodValue) => bilan.handleWeekChange(periodValue)}
        isProContractEnabled={isProContractEnabled}
        contractMetrics={contractMetrics}
        bilanContent={bilan.bilanContent}
        bilanPeriodType={bilan.bilanPeriodType}
        bilanPaye={bilan.bilanPaye}
        sortedMissions={sortedBilanMissions}
        isViewer={isViewer}
        canExportExcel={canExportExcel}
        canExportPDF={canExportPDF}
        canExportCSV={canExportCSV}
        canFacture={canFacture}
        onMarquerCommePaye={onMarquerCommePaye}
        onExportExcel={async () => {
          if (!canExportExcel) return;
          const { exportToExcel } = await import("../utils/exportUtils");
          exportToExcel(
            exportBilanContent,
            bilan.bilanPeriodType,
            bilan.bilanPeriodValue,
            exportBilanContent.titre,
            exportBilanContent.fraisDivers,
            profile,
            L,
          );
        }}
        onExportPDF={async () => {
          if (!canExportPDF) return;
          const { exportToPDFPro } = await import("../utils/exportPDF_Pro");
          exportToPDFPro(
            exportBilanContent,
            bilan.bilanPeriodType,
            bilan.bilanPaye,
            bilan.bilanPeriodValue,
            profile,
            L,
          );
        }}
        onExportWhatsAppSecure={() => {
          if (!canExportPDF) return;
          setWhatsAppError(null);
          setIsWhatsAppModalOpen(true);
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
          const sp = saveProfile
            ? async (data: Partial<UserProfile>) => {
                await saveProfile(data);
              }
            : async () => {};
          await generateFacture(
            exportBilanContent,
            bilan.bilanPeriodType,
            bilan.bilanPeriodValue,
            profile,
            patron,
            sp,
            L,
          );
        }}
        onFraisEdit={onFraisEdit}
        onFraisDelete={onFraisDelete}
        onRecalculerFraisKm={onRecalculerFraisKm ?? undefined}
        onOpenReserve={onOpenReserve ?? undefined}
        isRecalculatingKm={bilan.isRecalculatingKm}
        reserveBalanceHours={reserve.balanceHours}
        reserveWithdrawnHoursThisWeek={
          reserve.movements
            .filter((m) => m.movement_type === "deficit_cover" && m.period_value === String(bilan.bilanPeriodValue))
            .reduce((sum, m) => sum + Math.abs(Number(m.delta_hours)), 0)
        }
        onWithdrawFromReserve={async (hours: number) => {
          const periodValue = String(bilan.bilanPeriodValue);
          await reserve.addMovement({
            movementType: "deficit_cover",
            source: "user",
            deltaHours: -hours,
            periodType: "semaine",
            periodValue,
            comment: `Comblement déficit contrat — semaine ${periodValue}`,
          });
        }}
      />

      <WhatsAppSecureModal
        open={isWhatsAppModalOpen}
        isSubmitting={isWhatsAppSubmitting}
        errorMessage={whatsAppError}
        onClose={() => {
          if (isWhatsAppSubmitting) return;
          setIsWhatsAppModalOpen(false);
        }}
        onSubmit={handleSecureWhatsAppShare}
      />
    </div>
  );
};

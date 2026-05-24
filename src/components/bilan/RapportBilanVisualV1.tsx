import React, { useMemo, useState } from "react";
import { Banknote, Check, ChevronDown, Clock3, MapPin, PiggyBank, TrendingUp } from "lucide-react";
import { WeatherIcon } from "../common/WeatherIcon";
import { formatDateFR, formatEuro } from "../../utils/formatters";
import type { FraisDivers } from "../../types/entities";
import type { BilanContent, BilanGroupedRow, MissionWithWeather } from "../../types/bilan";
import type { ContractCalculationResult } from "../../features/contracts";

interface RapportBilanVisualV1Props {
  title: string;
  subtitle: string;
  onBack: () => void;
  onOpenGroupedPeriod?: (periodType: string, periodValue: string) => void;
  periodOptions?: PeriodOption[];
  selectedPeriodValue?: string;
  onSelectPeriod?: (periodValue: string) => void;
  isProContractEnabled?: boolean;
  contractMetrics?: ContractCalculationResult;
  bilanContent?: BilanContent;
  bilanPeriodType?: string;
  bilanPaye?: boolean;
  sortedMissions?: MissionWithWeather[];
  isViewer?: boolean;
  canExportPDF?: boolean;
  canExportExcel?: boolean;
  canExportCSV?: boolean;
  canFacture?: boolean;
  onMarquerCommePaye?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onExportWhatsAppSecure?: () => void;
  onExportCSV?: () => void;
  onExportCSVWithFrais?: () => void;
  onExportFacture?: () => void;
  onFraisEdit?: (frais: FraisDivers) => void;
  onFraisDelete?: (frais: FraisDivers) => void;
  onRecalculerFraisKm?: () => void;
  isRecalculatingKm?: boolean;
}

type PeriodOption = {
  value: string;
  label: string;
  helper: string;
};

type MissionMock = {
  id: string;
  dateLabel: string;
  title: string;
  client: string;
  city: string;
  startAt: string;
  endAt: string;
  hours: number;
  amount: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "19", label: "Semaine 19", helper: "du 5 mai au 11 mai 2025" },
  { value: "2025-05", label: "Mai 2025", helper: "vue mensuelle" },
  { value: "2025", label: "Année 2025", helper: "vue annuelle" },
];

const MOCK_MISSIONS: MissionMock[] = [
  {
    id: "m-1",
    dateLabel: "Lundi 5 mai",
    title: "Renfort couverture toiture",
    client: "Atelier Martin",
    city: "Tours",
    startAt: "08:00",
    endAt: "12:30",
    hours: 4.5,
    amount: 112,
  },
  {
    id: "m-2",
    dateLabel: "Mardi 6 mai",
    title: "Pose velux atelier",
    client: "Habitat Loire",
    city: "Joue-les-Tours",
    startAt: "13:30",
    endAt: "18:00",
    hours: 4.5,
    amount: 118,
  },
  {
    id: "m-3",
    dateLabel: "Jeudi 8 mai",
    title: "Etancheite balcon",
    client: "SCI Camelia",
    city: "Saint-Avertin",
    startAt: "07:45",
    endAt: "12:15",
    hours: 4.5,
    amount: 124,
  },
  {
    id: "m-4",
    dateLabel: "Vendredi 9 mai",
    title: "Controle final et reprises",
    client: "Renov Plus",
    city: "Chambray-les-Tours",
    startAt: "13:00",
    endAt: "18:00",
    hours: 5,
    amount: 146,
  },
];

function getGroupedPaymentTone(group: BilanGroupedRow) {
  if (group.paymentStatus === "paid") {
    return {
      container: "border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]",
      detail: "text-[var(--color-accent-green)]",
    };
  }
  if (group.paymentStatus === "partial") {
    return {
      container: "border-[var(--color-accent-cyan)]/35 bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]",
      detail: "text-[var(--color-accent-cyan)]",
    };
  }
  if (group.paymentStatus === "unpaid") {
    return {
      container: "border-[var(--color-accent-amber)]/35 bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)]",
      detail: "text-[var(--color-accent-amber)]",
    };
  }
  return {
    container: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
    detail: "text-[var(--color-text-muted)]",
  };
}

export function RapportBilanVisualV1({
  title,
  subtitle,
  onBack,
  onOpenGroupedPeriod,
  periodOptions,
  selectedPeriodValue,
  onSelectPeriod,
  isProContractEnabled = true,
  contractMetrics,
  bilanContent,
  bilanPeriodType = "semaine",
  bilanPaye = false,
  sortedMissions,
  isViewer = false,
  canExportPDF = true,
  canExportExcel = true,
  canExportCSV = true,
  canFacture = false,
  onMarquerCommePaye,
  onExportExcel,
  onExportPDF,
  onExportWhatsAppSecure,
  onExportCSV,
  onExportCSVWithFrais,
  onExportFacture,
  onFraisEdit,
  onFraisDelete,
  onRecalculerFraisKm,
  isRecalculatingKm = false,
}: RapportBilanVisualV1Props) {
  const [periodOpen, setPeriodOpen] = useState(false);
  const [showAcompteDetails, setShowAcompteDetails] = useState(false);
  const [showFraisDetails, setShowFraisDetails] = useState(false);
  const [expandedSummaryKey, setExpandedSummaryKey] = useState<string | null>(null);

  const activePeriodOptions = periodOptions && periodOptions.length > 0 ? periodOptions : PERIOD_OPTIONS;
  const activePeriodValue = selectedPeriodValue || activePeriodOptions[0]?.value || PERIOD_OPTIONS[0].value;
  const activePeriod =
    activePeriodOptions.find((option) => option.value === activePeriodValue) ||
    activePeriodOptions[0] ||
    PERIOD_OPTIONS[0];

  const hasRealBilanData = Boolean(bilanContent?.titre);
  const allPeriodMissions = sortedMissions && sortedMissions.length > 0
    ? sortedMissions
    : (hasRealBilanData ? bilanContent?.filteredData || [] : []);
  const isWeekView = bilanPeriodType === "semaine";
  const isMonthView = bilanPeriodType === "mois";
  const isYearView = bilanPeriodType === "annee";
  const missionsData = isWeekView ? allPeriodMissions : [];
  const groupedRows = !isWeekView ? bilanContent?.groupedData || [] : [];

  const totalGross = hasRealBilanData
    ? Number(bilanContent?.totalE ?? 0)
    : MOCK_MISSIONS.reduce((sum, mission) => sum + mission.amount, 0);

  const totalWorked = hasRealBilanData
    ? Number(bilanContent?.totalH ?? 0)
    : MOCK_MISSIONS.reduce((sum, mission) => sum + mission.hours, 0);

  const resolvedContractMetrics = useMemo(() => {
    if (contractMetrics) return contractMetrics;
    if (!hasRealBilanData) {
      return {
        workedHours: totalWorked,
        quotaHours: 8,
        payableHours: 5,
        reserveHours: 3,
        overtimeHours: 0,
        quotaOverflowHours: 0,
      };
    }
    const quotaHours = 8;
    const payableHours = isProContractEnabled ? Math.min(totalWorked, quotaHours) : totalWorked;
    const reserveHours = isProContractEnabled ? Math.max(0, quotaHours - totalWorked) : 0;
    const quotaOverflowHours = isProContractEnabled ? Math.max(0, totalWorked - quotaHours) : 0;
    return {
      workedHours: totalWorked,
      quotaHours,
      payableHours,
      reserveHours,
      overtimeHours: quotaOverflowHours,
      quotaOverflowHours,
    };
  }, [contractMetrics, hasRealBilanData, isProContractEnabled, totalWorked]);

  const totalFrais = Number(bilanContent?.totalFrais ?? 0);
  const totalAcomptes = Number(bilanContent?.totalAcomptes ?? 0);
  const acompteConsommePeriode = Number(bilanContent?.acompteConsommePeriode ?? 0);
  const acompteRecuPeriode = Number(bilanContent?.acomptesDansPeriode ?? 0);
  const soldeAcompteAvant = Number(bilanContent?.soldeAcomptesAvant ?? 0);
  const soldeAcompteApres = Number(bilanContent?.soldeAcomptesApres ?? 0);
  const resteAPercevoir = Number(bilanContent?.resteAPercevoir ?? 0);
  const impayePrecedent = Number(bilanContent?.impayePrecedent ?? 0);

  const showResteKpi = !bilanPaye && resteAPercevoir > 0;
  const showReserveKpi = isProContractEnabled;

  const hasFraisList = (bilanContent?.fraisDivers?.length ?? 0) > 0;
  const hasAcompteSection =
    soldeAcompteAvant > 0 ||
    soldeAcompteApres > 0 ||
    acompteRecuPeriode > 0 ||
    totalAcomptes > 0;

  const resteAcompte = Math.max(0, soldeAcompteApres);
  const acompteRecuLabel = acompteRecuPeriode > 0 ? `+${formatEuro(acompteRecuPeriode)}` : formatEuro(0);
  const acompteConsommeLabel = acompteConsommePeriode > 0 ? `-${formatEuro(acompteConsommePeriode)}` : formatEuro(0);

  const displayTitle = title || activePeriod.label;
  const periodRangeLabel = useMemo(() => {
    const source = allPeriodMissions.length > 0 ? allPeriodMissions : [];
    if (source.length === 0) return subtitle || activePeriod.helper;
    const dates = source
      .map((mission) => mission.date_iso || mission.date_mission)
      .filter((date): date is string => Boolean(date))
      .map((date) => new Date(date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) return subtitle || activePeriod.helper;
    const start = dates[0];
    const end = dates[dates.length - 1];
    const startLabel = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const endLabel = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `du ${startLabel} au ${endLabel}`;
  }, [activePeriod.helper, missionsData, subtitle]);

  const secondaryKpis = [
    showResteKpi ? { key: "reste", label: "Reste à percevoir", value: formatEuro(resteAPercevoir), tone: "green" as const, icon: <Banknote size={16} /> } : null,
    impayePrecedent > 0 ? { key: "impaye", label: "Impayé précédent", value: formatEuro(impayePrecedent), tone: "cyan" as const, icon: <Banknote size={16} /> } : null,
  ].filter((kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi));

  const missionLabelByDate = useMemo(() => {
    const index = new Map<string, string>();
    for (const mission of allPeriodMissions) {
      const key = mission.date_iso || mission.date_mission || "";
      if (!key || index.has(key)) continue;
      index.set(key, mission.client || mission.lieu || "Mission liée");
    }
    return index;
  }, [allPeriodMissions]);

  const groupedSectionMeta = isMonthView
    ? {
        eyebrow: "Vue mensuelle",
        title: "Semaines du mois",
        subtitle: "Synthèse compacte par semaine, avec ouverture du détail sur place.",
        totalLabel: "Total mois",
      }
    : {
        eyebrow: "Vue annuelle",
        title: "Mois de l'année",
        subtitle: "Synthèse premium par mois, avec accès direct au détail mensuel.",
        totalLabel: "Total année",
      };

  return (
    <section className="w-full px-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-4 lg:px-6 xl:mx-auto xl:w-[94vw] xl:px-0 2xl:w-[95vw] min-[1920px]:w-[96vw]">
      <header className="mb-4 grid grid-cols-1 gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-modal sm:grid-cols-[auto_1fr_auto] sm:items-center lg:mb-5 lg:p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-max items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <span aria-hidden="true">←</span>
          Retour
        </button>

        <div className="text-left sm:text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Rapport bilan</p>
          <h1 className="mt-0.5 text-2xl font-black leading-none text-[var(--color-text)] lg:text-3xl">{displayTitle}</h1>
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-dim)]">{periodRangeLabel}</p>
        </div>

        <div className="relative justify-self-start sm:justify-self-end">
          <button
            type="button"
            aria-expanded={periodOpen}
            aria-label="Changer la période"
            onClick={() => setPeriodOpen((value) => !value)}
            className="flex min-w-[10rem] items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface-hover)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-primary)]"
          >
            <span>
              <span className="block text-xs font-black text-[var(--color-text)]">{activePeriod.label}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Période</span>
            </span>
            <ChevronDown className={"text-[var(--color-primary)] transition-transform " + (periodOpen ? "rotate-180" : "")} size={16} />
          </button>

          {periodOpen && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[15rem] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-modal">
              {activePeriodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  onClick={() => {
                    onSelectPeriod?.(option.value);
                    setPeriodOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <span>
                    <span className="block text-sm font-black text-[var(--color-text)]">{option.label}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{option.helper}</span>
                  </span>
                  {activePeriodValue === option.value && <Check className="text-[var(--color-primary)]" size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-12 lg:gap-4 xl:gap-5">
        <div className="grid grid-cols-2 gap-2.5 lg:col-span-8 lg:grid-cols-4 lg:gap-3 xl:gap-4">

          {/* 1. Heure semaine */}
          <PremiumKpi label="Heure semaine" value={`${Math.round(totalWorked * 10) / 10}h`} icon={<Clock3 size={18} />} tone="primary" compact />

          {/* 2. Heure supplémentaire */}
          {isProContractEnabled && (
            <PremiumKpi
              label="Heure supplémentaire"
              value={`${Math.round(resolvedContractMetrics.quotaOverflowHours * 10) / 10}h`}
              icon={<TrendingUp size={18} />}
              tone="cyan"
              compact
            />
          )}

          {/* 3. Heure payable — carte héro amber gold */}
          {isProContractEnabled && (
          <article className="group relative col-span-2 lg:col-span-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-accent-amber)]/30 bg-[var(--color-surface)] p-3.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-amber)_10%,transparent),0_10px_30px_-16px_color-mix(in_srgb,var(--color-accent-amber)_30%,transparent)] transform-gpu [will-change:transform] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--color-accent-amber)]/68 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-amber)_26%,transparent),0_28px_60px_-18px_color-mix(in_srgb,var(--color-accent-amber)_62%,transparent)] active:translate-y-0.5 lg:min-h-[9rem] lg:p-4 xl:min-h-[10rem]">
            {/* Always-on amber halo — visible en permanence */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.58] transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_65%_at_8%_0%,color-mix(in_srgb,var(--color-accent-amber)_38%,transparent),transparent_62%)]" />
            </div>
            {/* Top accent bar lumineux */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent-amber)] to-transparent opacity-85" aria-hidden="true" />
            <div className="relative mb-4 flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-amber)]/18 text-[var(--color-accent-amber)] shadow-[0_0_16px_color-mix(in_srgb,var(--color-accent-amber)_35%,transparent)]">
                <Clock3 size={17} />
              </div>
            </div>
            <p className="relative text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Heure payable</p>
            <p
              aria-label={`Heure payable ${Math.round(resolvedContractMetrics.payableHours * 10) / 10}h`}
              className="relative mt-1 text-3xl font-black leading-none text-[var(--color-text)] [text-shadow:0_0_28px_color-mix(in_srgb,var(--color-accent-amber)_52%,transparent)] motion-safe:animate-[pulse_6s_ease-in-out_infinite] lg:text-[2.2rem]"
            >
              {Math.round(resolvedContractMetrics.payableHours * 10) / 10}h
            </p>
            <p className="relative mt-2 text-xs text-[var(--color-text-dim)]">Calcul contrat selon quota hebdomadaire</p>
          </article>
          )}

          {/* 4. Total brut */}
          <PremiumKpi label="Total brut" value={formatEuro(totalGross)} icon={<Banknote size={18} />} tone="green" className="col-span-2 lg:col-span-1" compact />

          {secondaryKpis.map((kpi) => (
            <PremiumKpi
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              tone={kpi.tone}
              className="col-span-1"
              compact
            />
          ))}
        </div>

        <section className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-3.5 shadow-modal lg:col-span-4 lg:p-4">
          <div className="pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_82%_62%_at_15%_0%,color-mix(in_srgb,var(--color-accent-green)_22%,transparent),transparent_65%)]" />
          </div>
          <div className="relative space-y-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3">
              {bilanPaye ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent-green)]">Statut paiement</p>
                  <p className="text-lg font-black text-[var(--color-accent-green)]">Payé</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Reste à percevoir</p>
                    <p className="text-xl font-black text-[var(--color-accent-orange)]">{formatEuro(resteAPercevoir)}</p>
                  </div>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={onMarquerCommePaye}
                      className="mt-2 w-full rounded-[var(--radius-pill)] border border-[var(--color-accent-red)]/45 bg-[var(--color-accent-red)]/70 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]"
                    >
                      Marquer comme payé
                    </button>
                  )}
                </>
              )}
            </div>

            {showReserveKpi && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]">
                      <PiggyBank size={15} />
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Réserve</p>
                  </div>
                  <p className="text-base font-black text-[var(--color-accent-green)]">+{Math.round(resolvedContractMetrics.reserveHours * 10) / 10}h en réserve</p>
                </div>
                {onRecalculerFraisKm && (
                  <button
                    type="button"
                    onClick={onRecalculerFraisKm}
                    disabled={isRecalculatingKm}
                    className="mt-2 rounded-[var(--radius-pill)] border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent-green)] disabled:opacity-45"
                  >
                    {isRecalculatingKm ? "Recalcul" : "Voir réserve"}
                  </button>
                )}
              </div>
            )}

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-2.5">
              <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                <ExportAction compact label={canExportExcel ? "Excel" : "Excel lock"} disabled={!canExportExcel} onClick={onExportExcel} />
                <ExportAction compact label={canExportPDF ? "PDF" : "PDF lock"} disabled={!canExportPDF} onClick={onExportPDF} />
                <ExportAction compact label={canExportPDF ? "WhatsApp sécurisé" : "WhatsApp lock"} disabled={!canExportPDF} onClick={onExportWhatsAppSecure} />
                <ExportAction compact label={canExportCSV ? "CSV missions" : "CSV lock"} disabled={!canExportCSV} onClick={onExportCSV} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {(bilanPeriodType === "semaine" && (hasAcompteSection || hasFraisList || canFacture || (hasFraisList && canExportCSV))) && (
        <section className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-4" data-testid="section-acompte-frais">
          {hasAcompteSection && (
            <article data-testid="section-acompte-card" className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4 shadow-modal">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Acompte</p>
                  <p className="mt-1 text-lg font-black text-[var(--color-accent-cyan)]">{formatEuro(resteAcompte)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAcompteDetails((value) => !value)}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  {showAcompteDetails ? "Masquer" : "Détails"}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--color-text-muted)]">💳 Acompte disponible précédent</span>
                  <span className="font-black text-[var(--color-text)]">{formatEuro(soldeAcompteAvant)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--color-text-muted)]">📥 Reçus cette période</span>
                  <span className="font-black text-[var(--color-accent-cyan)]">{acompteRecuLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--color-text-muted)]">✂️ Consommé cette période</span>
                  <span className="font-black text-[var(--color-accent-orange)]">{acompteConsommeLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--color-text-muted)]">Solde restant à reporter</span>
                  <span className="font-black text-[var(--color-accent-green)]">{formatEuro(resteAcompte)}</span>
                </div>
              </div>

              {showAcompteDetails && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-3">
                  <CompactMetric label="Total acompte cumulé" value={formatEuro(totalAcomptes > 0 ? totalAcomptes : acompteRecuPeriode)} tone="cyan" />
                  <CompactMetric label="Après période" value={formatEuro(soldeAcompteApres)} tone="green" />
                  <div className="col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    <p className="font-bold text-[var(--color-text)]">Historique acompte</p>
                    <p className="mt-1">Date période: {periodRangeLabel}</p>
                    <p className="mt-1">Mission liée: {missionsData[0]?.client || missionsData[0]?.lieu || "Non rattachée"}</p>
                  </div>
                </div>
              )}
            </article>
          )}

          {hasFraisList && (
            <article data-testid="section-frais-card" className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4 shadow-modal">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Frais</p>
                  <p className="mt-1 text-lg font-black text-[var(--color-accent-amber)]">{formatEuro(totalFrais)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFraisDetails((value) => !value)}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  {showFraisDetails ? "Masquer" : "Détails"}
                </button>
              </div>

              <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                {(bilanContent?.fraisDivers?.length ?? 0)} ligne(s) de frais associées à la période.
              </div>

              {showFraisDetails && (
                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                  {[...(bilanContent?.fraisDivers || [])]
                    .sort((a, b) => new Date(a.date_frais ?? "").getTime() - new Date(b.date_frais ?? "").getTime())
                    .map((frais) => (
                      <div key={frais.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--color-text)]">{frais.description}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{formatDateFR(frais.date_frais ?? "")}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[var(--color-text-dim)]">
                            {frais.date_frais && missionLabelByDate.get(frais.date_frais)
                              ? `Mission liée: ${missionLabelByDate.get(frais.date_frais)}`
                              : "Mission liée: non rattachée"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <p className="text-xs font-black text-[var(--color-accent-amber)]">+{formatEuro(frais.montant)}</p>
                          {!isViewer && (
                            <>
                              <button
                                type="button"
                                onClick={() => onFraisEdit?.(frais)}
                                className="rounded-[var(--radius-pill)] border border-[var(--color-accent-cyan)]/35 bg-[var(--color-accent-cyan)]/10 px-2 py-1 text-[10px] font-black uppercase text-[var(--color-accent-cyan)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onFraisDelete?.(frais)}
                                className="rounded-[var(--radius-pill)] border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 px-2 py-1 text-[10px] font-black uppercase text-[var(--color-accent-red)]"
                              >
                                Del
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                  {(hasFraisList && canExportCSV) && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <ExportAction compact label="CSV + frais" disabled={!canExportCSV} onClick={onExportCSVWithFrais} />
                      {canFacture && <ExportAction compact label="Facture" onClick={onExportFacture} />}
                    </div>
                  )}
                </div>
              )}
            </article>
          )}
        </section>
      )}

      <section data-testid="section-missions" className="mt-4 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4 shadow-modal lg:mt-5 lg:p-5 xl:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{isWeekView ? "Activite reelle" : groupedSectionMeta.eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--color-text)] lg:text-3xl xl:text-4xl">{isWeekView ? "Missions de la semaine" : groupedSectionMeta.title}</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{isWeekView ? "Historique detaille des interventions et montants" : groupedSectionMeta.subtitle}</p>
          </div>
          <div className="hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-right lg:block">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{isWeekView ? "Total missions" : groupedSectionMeta.totalLabel}</p>
            <p className="mt-1 text-xl font-black text-[var(--color-text)]">{formatEuro(totalGross)}</p>
          </div>
        </div>

        {isWeekView ? (
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 xl:gap-5 min-[1920px]:grid-cols-4 min-[1920px]:gap-6">
          {(missionsData.length > 0 ? missionsData : MOCK_MISSIONS).map((mission) => {
            const missionDate = "date_iso" in mission ? mission.date_iso || mission.date_mission : null;
            const pauseMinutes = "pause" in mission ? Number(mission.pause || 0) : 0;
            const weatherCode = "weather" in mission ? mission.weather?.icon || "" : "";
            const weatherDesc = "weather" in mission ? mission.weather?.desc || "" : "";
            const weatherTemp =
              "weather" in mission && mission.weather
                ? Math.round((Number(mission.weather.tempMin ?? 0) + Number(mission.weather.tempMax ?? 0)) / 2)
                : null;

            return (
            <article
              key={mission.id || `${missionDate || "date"}-${mission.client || "client"}`}
              className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 transform-gpu transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-primary)] hover:shadow-[0_8px_24px_-10px_color-mix(in_srgb,var(--color-primary)_22%,transparent)] lg:p-5 xl:min-h-[14.5rem] xl:p-6"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    {"dateLabel" in mission
                      ? mission.dateLabel
                      : formatDateFR(missionDate || "")}
                  </p>
                  <h3 className="mt-1 text-base font-black text-[var(--color-text)] lg:text-lg">
                    {"title" in mission ? mission.title : mission.lieu || mission.client || "Mission"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">{mission.client || "Client non renseigné"}</p>
                </div>
                <div className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/15 px-2.5 py-1 text-sm font-black text-[var(--color-primary)]">
                  {"amount" in mission ? `${mission.amount}€` : formatEuro(mission.montant || 0)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
                <div className="inline-flex items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                  <Clock3 size={13} />
                  <span className="font-bold text-[var(--color-text)]">
                    {"startAt" in mission ? mission.startAt : mission.debut} - {"endAt" in mission ? mission.endAt : mission.fin}
                  </span>
                </div>
                <div className="inline-flex items-center justify-between gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                  <span className="font-black text-[var(--color-text)]">{"hours" in mission ? mission.hours : Math.round((mission.duree || 0) * 10) / 10}h</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">duree</span>
                </div>
                <div className="col-span-2 inline-flex items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                  <MapPin size={13} />
                  <span className="font-bold text-[var(--color-text)]">{"city" in mission ? mission.city : mission.lieu || "Lieu non renseigné"}</span>
                </div>

                <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="inline-flex min-h-9 items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text)]">
                    {pauseMinutes > 0 ? `Pause · ${pauseMinutes} min` : "Aucune pause"}
                  </div>

                  {weatherCode && (
                    <div className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border-cyan)]/35 bg-[var(--color-accent-cyan)]/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent-cyan)_14%,transparent)]">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)]">
                        <WeatherIcon code={resolveWeatherCode(weatherCode)} className="h-3 w-3" />
                      </span>
                      {weatherTemp !== null && <span className="font-black text-[var(--color-text)]">{weatherTemp}°C</span>}
                      {weatherDesc && <span className="truncate text-[var(--color-text-muted)]">{weatherDesc}</span>}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );})}
        </div>
        ) : (
        <div className="grid gap-2.5 xl:gap-3">
          {groupedRows.map((group, index) => {
            const groupKey = `${group.label}-${index}`;
            const isExpanded = expandedSummaryKey === groupKey;
            const paymentTone = getGroupedPaymentTone(group);
            const topActivities = Array.from(
              new Set(
                group.missions
                  .map((mission) => mission.client || mission.lieu || "Mission")
                  .filter(Boolean),
              ),
            ).slice(0, 3);
            const activityPreview = topActivities.length > 0
              ? topActivities.join(" • ")
              : "Aperçu activité à détailler";
            const detailTargetValue = group.periodValue || group.missions[0]?.date_iso?.slice(0, 7) || group.missions[0]?.date_mission?.slice(0, 7) || "";

            return (
              <article
                key={groupKey}
                className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3.5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-primary)] hover:shadow-[0_8px_24px_-10px_color-mix(in_srgb,var(--color-primary)_18%,transparent)] lg:p-4"
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden="true">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_82%_62%_at_10%_0%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_68%)]" />
                </div>

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                      {isMonthView ? "Semaine" : "Mois"}
                    </p>
                    <h3 className="mt-0.5 text-base font-black text-[var(--color-text)] lg:text-lg">{group.label}</h3>
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-dim)]">
                      {activityPreview}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/15 px-2.5 py-1 text-sm font-black text-[var(--color-primary)]">
                    {formatEuro(group.e)}
                  </div>
                </div>

                <div className="relative mt-3 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    <p className="text-[10px] font-black uppercase tracking-wider">Heures</p>
                    <p className="mt-0.5 text-sm font-black text-[var(--color-text)]">{`${Math.round(group.h * 10) / 10}h`}</p>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    <p className="text-[10px] font-black uppercase tracking-wider">Activité</p>
                    <p className="mt-0.5 text-sm font-black text-[var(--color-text)]">{group.missions.length} mission{group.missions.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className={`rounded-[var(--radius-lg)] border px-3 py-2 text-xs ${paymentTone.container}`}>
                    <p className="text-[10px] font-black uppercase tracking-wider">Statut paiement</p>
                    <p className="mt-0.5 text-sm font-black">{group.paymentLabel || "Sans bilan"}</p>
                    {group.paymentRemaining !== undefined && group.paymentRemaining > 0 && (
                      <p className={`mt-0.5 text-[10px] font-bold ${paymentTone.detail}`}>{formatEuro(group.paymentRemaining)} restant</p>
                    )}
                  </div>
                </div>

                <div className="relative mt-3 flex flex-wrap gap-2">
                  {isMonthView && (
                    <button
                      type="button"
                      onClick={() => setExpandedSummaryKey((value) => (value === groupKey ? null : groupKey))}
                      className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]"
                    >
                      {isExpanded ? "Masquer semaine" : "Ouvrir la semaine"}
                    </button>
                  )}

                  {isYearView && detailTargetValue && onOpenGroupedPeriod && (
                    <button
                      type="button"
                      onClick={() => onOpenGroupedPeriod("mois", detailTargetValue)}
                      className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]"
                    >
                      Ouvrir le mois
                    </button>
                  )}
                </div>

                {isMonthView && isExpanded && (
                  <div className="relative mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                    {group.missions.slice(0, 4).map((mission) => (
                      <div
                        key={mission.id}
                        className="flex items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[var(--color-text)]">{mission.client || mission.lieu || "Mission"}</p>
                          <p className="text-[var(--color-text-muted)]">{formatDateFR(mission.date_iso || mission.date_mission || "")}</p>
                        </div>
                        <span className="font-black text-[var(--color-primary)]">{formatEuro(mission.montant || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        )}
      </section>
    </section>
  );
}

function PremiumKpi({
  label,
  value,
  icon,
  tone,
  compact = false,
  className = "",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "cyan" | "green";
  compact?: boolean;
  className?: string;
}) {
  const cfg = {
    primary: {
      iconCls:
        "bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_22%,transparent)] group-hover:bg-[var(--color-primary)]/24 group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_38%,transparent)]",
      radialCls:
        "bg-[radial-gradient(ellipse_88%_60%_at_10%_0%,color-mix(in_srgb,var(--color-primary)_30%,transparent),transparent_65%)]",
      borderCls: "border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/58",
      shadowCls:
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary)_6%,transparent),0_8px_24px_-14px_color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary)_18%,transparent),0_24px_54px_-18px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]",
      valueCls: "[text-shadow:0_0_22px_color-mix(in_srgb,var(--color-primary)_38%,transparent)]",
      barCls: "via-[var(--color-primary)]",
    },
    cyan: {
      iconCls:
        "bg-[var(--color-accent-cyan)]/12 text-[var(--color-accent-cyan)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent-cyan)_22%,transparent)] group-hover:bg-[var(--color-accent-cyan)]/24 group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent-cyan)_38%,transparent)]",
      radialCls:
        "bg-[radial-gradient(ellipse_88%_60%_at_10%_0%,color-mix(in_srgb,var(--color-accent-cyan)_30%,transparent),transparent_65%)]",
      borderCls: "border-[var(--color-accent-cyan)]/20 hover:border-[var(--color-accent-cyan)]/58",
      shadowCls:
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-cyan)_6%,transparent),0_8px_24px_-14px_color-mix(in_srgb,var(--color-accent-cyan)_20%,transparent)] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-cyan)_18%,transparent),0_24px_54px_-18px_color-mix(in_srgb,var(--color-accent-cyan)_55%,transparent)]",
      valueCls: "[text-shadow:0_0_22px_color-mix(in_srgb,var(--color-accent-cyan)_38%,transparent)]",
      barCls: "via-[var(--color-accent-cyan)]",
    },
    green: {
      iconCls:
        "bg-[var(--color-accent-green)]/12 text-[var(--color-accent-green)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent-green)_22%,transparent)] group-hover:bg-[var(--color-accent-green)]/24 group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent-green)_38%,transparent)]",
      radialCls:
        "bg-[radial-gradient(ellipse_88%_60%_at_10%_0%,color-mix(in_srgb,var(--color-accent-green)_30%,transparent),transparent_65%)]",
      borderCls: "border-[var(--color-accent-green)]/20 hover:border-[var(--color-accent-green)]/58",
      shadowCls:
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-green)_6%,transparent),0_8px_24px_-14px_color-mix(in_srgb,var(--color-accent-green)_20%,transparent)] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-green)_18%,transparent),0_24px_54px_-18px_color-mix(in_srgb,var(--color-accent-green)_55%,transparent)]",
      valueCls: "[text-shadow:0_0_22px_color-mix(in_srgb,var(--color-accent-green)_38%,transparent)]",
      barCls: "via-[var(--color-accent-green)]",
    },
  }[tone];

  return (
    <article
      className={
        "group relative overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--color-surface)] transform-gpu [will-change:transform] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 " +
        (compact ? "p-3 lg:min-h-[7.2rem] lg:p-3.5" : "p-4 lg:min-h-[11rem] lg:p-5 xl:min-h-[12rem]") +
        " " +
        cfg.borderCls +
        " " +
        cfg.shadowCls +
        " " +
        className
      }
    >
      {/* Always-on radial halo — visible à faible opacité, s'intensifie au hover */}
      <div
        className={"pointer-events-none absolute inset-0 opacity-[0.40] transition-opacity duration-300 group-hover:opacity-[0.92] " + cfg.radialCls}
        aria-hidden="true"
      />
      {/* Ligne d'accent en haut de la carte */}
      <div
        className={"absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-65 " + cfg.barCls}
        aria-hidden="true"
      />
      {/* Icône avec glow */}
      <div
        className={
          "relative mb-3 flex items-center justify-center rounded-[var(--radius-lg)] transition-[transform,background-color,box-shadow] duration-300 group-hover:scale-110 " +
          (compact ? "h-8 w-8" : "h-10 w-10") +
          " " +
          cfg.iconCls
        }
      >
        {icon}
      </div>
      <p className="relative text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p
        className={
          "relative mt-1 font-black leading-none text-[var(--color-text)] motion-safe:animate-[pulse_7.5s_ease-in-out_infinite] " +
          (compact ? "text-xl lg:text-2xl" : "text-3xl lg:text-[2.2rem] xl:text-[2.5rem]") +
          " " +
          cfg.valueCls
        }
      >
        {value}
      </p>
    </article>
  );
}

function resolveWeatherCode(code: string): string {
  if (!code) return "02d";
  if (["01d", "02d", "09d", "11d", "13d"].includes(code)) return code;
  if (code.startsWith("01")) return "01d";
  if (code.startsWith("02") || code.startsWith("03") || code.startsWith("04")) return "02d";
  if (code.startsWith("09") || code.startsWith("10")) return "09d";
  if (code.startsWith("11")) return "11d";
  if (code.startsWith("13")) return "13d";
  return "02d";
}

function ExportAction({
  label,
  onClick,
  disabled = false,
  compact = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={
        "rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] font-black uppercase tracking-wider text-[var(--color-text)] transition-colors hover:border-[var(--color-border-primary)] disabled:opacity-35 " +
        (compact ? "min-h-9 px-2 text-[9px]" : "min-h-11 px-3 text-[10px]")
      }
    >
      {label}
    </button>
  );
}

function CompactMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "green";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className={"mt-1 text-sm font-black " + (tone === "cyan" ? "text-[var(--color-accent-cyan)]" : "text-[var(--color-accent-green)]")}>{value}</p>
    </div>
  );
}

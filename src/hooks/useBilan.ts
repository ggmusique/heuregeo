import { useState, useCallback, useEffect } from "react";
import { getCurrentUserOrNull } from "../services/authService";
import { normalizeBilanForWrite, computeStatutPaye, computeConsommeCettePeriode, computeWeeklyAcompteState, computeStandardAcompteState } from "../lib/bilanEngine";
import { fetchWeeklyBilansHistory, fetchAcompteAllocationsByPatron, fetchWeeklyAcompteMetrics, fetchBilanByPeriodAndPatron, insertBilanRow, updateBilanRowById } from "../services/bilanRepository";
import { buildAllocByWeek, normalizeHistoriqueRows, splitHistoriqueRows } from "../lib/bilanHistory";
import { PERIOD_TYPES } from "../constants/bilanPeriods";
import { computePeriodeIndex, computePeriodDates, buildGroupedData } from "../lib/bilanPeriods";
import { logBilanError } from "../utils/bilanLogger";
import type { Mission, FraisDivers } from "../types/entities";
import type { HistoriqueData } from "./useHistorique";
import { useBilanPeriod } from "./useBilanPeriod";
import { enrichWithWeather } from "./useBilanWeather";
import { computeKmItems, useBilanKm } from "./useBilanKm";
import { useBilanDB } from "./useBilanDB";

export { normalizeBilanForWrite as normalizeBilanRow };

// ─── Re-exports types (compatibilité import existants) ────────────────────────

export type { BilanKmItem, BilanKmResult, MissionWithWeather, BilanGroupedRow, BilanContent } from "../types/bilan";
export type { RebuildResult, RepairResult } from "./useBilanDB";
export type { UseBilanParams, UseBilanReturn } from "./useBilanTypes";

// ─── Constante ────────────────────────────────────────────────────────────────

const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBilan({
  missions,
  fraisDivers,
  patrons = [],
  getMissionsByWeek,
  getMissionsByPeriod,
  getFraisByWeek,
  getTotalFrais,
  getSoldeAvant,
  getAcomptesDansPeriode,
  getTotalAcomptesJusqua,
  triggerAlert,
  kmSettings = null,
  domicileLatLng = null,
  lieux = [],
}: import("./useBilanTypes").UseBilanParams): import("./useBilanTypes").UseBilanReturn {
  const [showBilan, setShowBilan] = useState<boolean>(false);
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [bilanPaye, setBilanPaye] = useState<boolean>(false);
  const [bilanContent, setBilanContent] = useState<import("../types/bilan").BilanContent>({
    titre: "", totalE: 0, totalH: 0, filteredData: [], groupedData: [], totalFrais: 0,
    fraisDivers: [], impayePrecedent: 0, resteCettePeriode: 0, resteAPercevoir: 0,
    soldeAcomptesAvant: 0, soldeAcomptesApres: 0, acomptesDansPeriode: 0, totalAcomptes: 0,
    acompteConsommePeriode: 0, selectedPatronId: null, selectedPatronNom: "Tous les patrons (Global)",
    fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
  });

  const period = useBilanPeriod({ missions });
  const { bilanPeriodType, bilanPeriodValue } = period;

  const effectivePatronId = (pId: string | null | undefined) => pId || GLOBAL_PATRON_ID;
  const isGlobalPatronId = (pId: string | null | undefined) => !pId || pId === GLOBAL_PATRON_ID;
  const resolvePatronNom = (pId: string | null | undefined) => {
    if (isGlobalPatronId(pId)) return "Global";
    return patrons.find((x) => x.id === pId)?.nom || "Inconnu";
  };

  const db = useBilanDB({
    bilanPeriodType, bilanPeriodValue, bilanContent, patrons, triggerAlert,
    setBilanPaye, getMissionsByPeriod, getFraisByWeek, getTotalFrais,
  });

  const genererBilan = useCallback(
    async (patronId: string | null = null, clientId: string | null = null): Promise<boolean | void> => {
      if (!bilanPeriodValue) { triggerAlert?.("Sélectionnez une période."); return false; }
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getSoldeAvant) {
        triggerAlert?.("⚠️ getSoldeAvant manquant (useAcomptes)."); return false;
      }
      let runPatronId: string | null = patronId ?? bilanContent.selectedPatronId ?? null;
      try {
        const pId = effectivePatronId(runPatronId);
        const user = await getCurrentUserOrNull();
        if (!user) { triggerAlert?.("Utilisateur non connecté."); return false; }

        const filtered: Mission[] = getMissionsByPeriod(bilanPeriodType, bilanPeriodValue, runPatronId)
          .filter((m) => !clientId || m.client_id === clientId)
          .sort((a, b) => new Date(a.date_iso!).getTime() - new Date(b.date_iso!).getTime());

        const totalMissions = filtered.reduce((s, m) => s + (m.montant || 0), 0);
        const totalH = filtered.reduce((s, m) => s + (m.duree || 0), 0);
        const groupedData = buildGroupedData(filtered, bilanPeriodType);

        let fraisFiltres: FraisDivers[] = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(parseInt(bilanPeriodValue, 10), runPatronId);
        }
        const totalFrais = getTotalFrais(fraisFiltres);
        const { debutPeriode, finPeriode } = computePeriodDates(bilanPeriodType, bilanPeriodValue);
        const caBrutPeriode = totalMissions + totalFrais;

        if (caBrutPeriode === 0 && filtered.length === 0) {
          triggerAlert?.(`⚠️ Aucune mission pour ${resolvePatronNom(runPatronId) || "ce patron"} en ${period.formatCurrentPeriodLabel(bilanPeriodValue)}`);
          setShowPeriodModal(false); setShowBilan(false); return false;
        }

        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await db.getImpayePrecedent(parseInt(bilanPeriodValue, 10), runPatronId);
        }

        let resteCettePeriode = 0, resteAPercevoir = 0, soldeAvantPeriode = 0;
        let soldeApresPeriode = 0, acompteConsomme = 0, acompteConsommePeriode = 0;
        const acomptesDansPeriode = bilanPeriodType === PERIOD_TYPES.SEMAINE
          ? getAcomptesDansPeriode(debutPeriode, finPeriode, runPatronId) : 0;
        let acomptesDansPeriodeCalc = acomptesDansPeriode;

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const weekNum = parseInt(bilanPeriodValue, 10);
          const metrics = await fetchWeeklyAcompteMetrics({ patronId: pId, weekNum, debutPeriode, finPeriode });
          const { allocCetteSemaine, totalAlloueJusqua, totalAlloueAvant,
            acompteConsommePeriode: acp, acomptesCumules, acomptesDansPeriode: adp } = metrics;
          acompteConsommePeriode = acp;
          acomptesDansPeriodeCalc = adp;
          const ws = computeWeeklyAcompteState({
            allocCetteSemaine, totalAlloueJusqua, totalAlloueAvant, acomptesCumules,
            acomptesDansPeriode: acomptesDansPeriodeCalc, impayePrecedent, caBrutPeriode,
          });
          acompteConsomme = ws.acompteConsomme; soldeAvantPeriode = ws.soldeAvantPeriode;
          soldeApresPeriode = ws.soldeApresPeriode; resteCettePeriode = ws.resteCettePeriode;
          resteAPercevoir = ws.resteAPercevoir;
        } else {
          soldeAvantPeriode = getSoldeAvant(debutPeriode, runPatronId);
          const ss = computeStandardAcompteState({ soldeAvantPeriode, acomptesDansPeriode, caBrutPeriode });
          acompteConsomme = ss.acompteConsomme; resteCettePeriode = ss.resteCettePeriode;
          resteAPercevoir = ss.resteAPercevoir; soldeApresPeriode = ss.soldeApresPeriode;
        }

        const consommeCettePeriode = computeConsommeCettePeriode({
          bilanPeriodType, periodTypes: PERIOD_TYPES, acomptesDansPeriodeCalc,
          soldeAvantPeriode, acomptesDansPeriode, soldeApresPeriode,
        });
        const statutPaye = await db.getStatutPaiement(runPatronId);
        const patronNom = patrons.find((p) => p.id === runPatronId)?.nom || "Tous les patrons (Global)";

        let filteredWithWeather: import("../types/bilan").MissionWithWeather[] = filtered;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE && filtered.length > 0) {
          filteredWithWeather = await enrichWithWeather(filtered, lieux, domicileLatLng);
        }

        let fraisKm: import("../types/bilan").BilanKmResult = { items: [], totalKm: 0, totalAmount: 0 };
        const effectiveDomicile = domicileLatLng ?? (
          Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
            ? { lat: kmSettings!.km_domicile_lat as number, lng: kmSettings!.km_domicile_lng as number }
            : null
        );
        if (kmSettings?.km_enable === true && bilanPeriodType === PERIOD_TYPES.SEMAINE && effectiveDomicile?.lat && effectiveDomicile?.lng) {
          fraisKm = computeKmItems(filtered, lieux, kmSettings, effectiveDomicile);
          resteAPercevoir = Math.max(0, resteAPercevoir + fraisKm.totalAmount);
          resteCettePeriode = resteAPercevoir;
        }

        const content: import("../types/bilan").BilanContent = {
          titre: period.formatCurrentPeriodLabel(bilanPeriodValue),
          totalE: caBrutPeriode, totalH, filteredData: filteredWithWeather, groupedData,
          totalFrais: bilanPeriodType === PERIOD_TYPES.SEMAINE ? totalFrais : 0,
          fraisDivers: bilanPeriodType === PERIOD_TYPES.SEMAINE ? fraisFiltres : [],
          acompteConsommePeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acompteConsommePeriode : 0,
          totalAcomptes: bilanPeriodType === PERIOD_TYPES.SEMAINE ? consommeCettePeriode : 0,
          acomptesDansPeriode: bilanPeriodType === PERIOD_TYPES.SEMAINE ? acomptesDansPeriode : 0,
          resteCettePeriode, resteAPercevoir, impayePrecedent,
          soldeAcomptesAvant: soldeAvantPeriode, soldeAcomptesApres: soldeApresPeriode,
          selectedPatronId: runPatronId, selectedPatronNom: patronNom,
          fraisKilometriques: fraisKm, lieux,
        };

        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const isPaid = computeStatutPaye(statutPaye, resteCettePeriode);

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const safe = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
          content.resteAPercevoir = content.resteCettePeriode = safe(resteCettePeriode);
        }

        setBilanContent(content); setBilanPaye(isPaid); setShowPeriodModal(false); setShowBilan(true);

        if (!isGlobalPatronId(patronId)) {
          const existing = await fetchBilanByPeriodAndPatron({
            periodeType: bilanPeriodType, periodeValue: bilanPeriodValue, patronId: pId, columns: "id",
          });
          if (!existing?.id) {
            await insertBilanRow({
              user_id: user.id, periode_type: bilanPeriodType, periode_value: bilanPeriodValue,
              periode_index: periodeIndex, patron_id: pId, ca_brut_periode: caBrutPeriode,
              paye: false, date_paiement: null, acompte_consomme: acompteConsomme,
              reste_a_percevoir: resteCettePeriode,
            });
          } else {
            await updateBilanRowById(existing.id, {
              ca_brut_periode: caBrutPeriode, periode_index: periodeIndex,
              acompte_consomme: acompteConsomme, reste_a_percevoir: isPaid ? 0 : resteCettePeriode,
            });
          }
        }
      } catch (err) {
        logBilanError("generation_bilan", err, { patronId: runPatronId || null, periodType: bilanPeriodType, periodValue: bilanPeriodValue });
        triggerAlert?.("Erreur lors de la génération du bilan."); return false;
      }
    },
    [bilanPeriodValue, bilanPeriodType, getMissionsByPeriod, getFraisByWeek, getTotalFrais,
      getSoldeAvant, getAcomptesDansPeriode, db.getImpayePrecedent, db.getAcomptesUtilisesAvantPeriode,
      getTotalAcomptesJusqua, db.getStatutPaiement, period.formatCurrentPeriodLabel,
      triggerAlert, patrons, kmSettings, domicileLatLng, lieux]
  );

  const { isRecalculatingKm, recalculerFraisKm } = useBilanKm({
    kmSettings, domicileLatLng, lieux, triggerAlert, genererBilan,
    bilanPeriodValue, filteredMissions: bilanContent.filteredData,
  });

  useEffect(() => {
    if (showBilan && bilanPeriodValue) genererBilan(bilanContent.selectedPatronId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPeriodValue]);

  const fetchHistoriqueBilans = useCallback(
    async (patronId: string | null = null): Promise<HistoriqueData> => {
      const pId = effectivePatronId(patronId);
      try {
        const user = await getCurrentUserOrNull();
        if (!user) return { impayes: [], payes: [], all: [] };
        const data = await fetchWeeklyBilansHistory({ patronId: pId });
        const allocs = await fetchAcompteAllocationsByPatron({ patronId: pId });
        const rows = normalizeHistoriqueRows(data, buildAllocByWeek(allocs), resolvePatronNom);
        return splitHistoriqueRows(rows);
      } catch {
        triggerAlert?.("Erreur chargement historique");
        return { impayes: [], payes: [], all: [] };
      }
    },
    [patrons, triggerAlert]
  );

  const autoPayerBilans = useCallback(
    async (patronId: string, montantAcompte: number): Promise<boolean> => {
      console.warn("autoPayerBilans est neutralisé: utiliser apply_acompte côté DB", { patronId, montantAcompte });
      triggerAlert?.("ℹ️ Auto-paiement front désactivé (source de vérité côté DB).");
      return false;
    },
    [triggerAlert]
  );

  return {
    showBilan, setShowBilan, showPeriodModal, setShowPeriodModal,
    bilanPeriodType: period.bilanPeriodType, setBilanPeriodType: period.setBilanPeriodType,
    bilanPeriodValue: period.bilanPeriodValue, setBilanPeriodValue: period.setBilanPeriodValue,
    availablePeriods: period.availablePeriods,
    bilanPaye, bilanContent,
    formatPeriodLabel: period.formatCurrentPeriodLabel,
    calculerPeriodesDisponibles: period.calculerPeriodesDisponibles,
    genererBilan, marquerCommePaye: db.marquerCommePaye, autoPayerBilans,
    fetchHistoriqueBilans,
    gotoPreviousWeek: period.gotoPreviousWeek, gotoNextWeek: period.gotoNextWeek,
    hasPreviousWeek: period.hasPreviousWeek, hasNextWeek: period.hasNextWeek,
    handleWeekChange: period.handleWeekChange,
    recalculerFraisKm, isRecalculatingKm,
    rebuildBilans: db.rebuildBilans, repairBilansDB: db.repairBilansDB,
  };
}

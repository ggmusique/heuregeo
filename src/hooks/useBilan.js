/**
 * useBilan.js — Hook orchestrateur pour la génération et la gestion des bilans.
 *
 * Ce hook compose les sous-modules spécialisés :
 *   - bilanConstants   : constantes et helpers purs partagés
 *   - useBilanAcomptes : calculs d'acomptes et d'impayés
 *   - useBilanWeather  : enrichissement météo historique
 *   - useBilanKm       : calcul et persistance frais kilométriques
 *   - useBilanHistory  : historique bilans + opérations admin
 *
 * Tous les appels Supabase passent par les services API
 * (bilansApi, allocationsApi, fraisKmApi) — plus d'import direct de supabase.
 *
 * L'interface publique est strictement identique à l'ancienne version
 * pour garantir la compatibilité avec App.jsx et les composants existants.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { getWeekNumber } from "../utils/dateUtils";
import { computeStatutPaye, normalizeBilanForWrite } from "../lib/bilanEngine";

// Services API (remplacent les appels Supabase directs)
import { upsertBilanPeriode, markBilanPaye } from "../services/api/bilansApi";

// Sous-modules
import {
  GLOBAL_PATRON_ID,
  BILANS_TABLE,
  PERIOD_TYPES,
  effectivePatronId,
  isGlobalPatronId,
  resolvePatronNom,
  computePeriodeIndex,
  computePeriodeDates,
} from "./bilan/bilanConstants";
import { useBilanAcomptes } from "./bilan/useBilanAcomptes";
import { enrichMissionsWithWeather } from "./bilan/useBilanWeather";
import { useBilanKm, computeFraisKm } from "./bilan/useBilanKm";
import { useBilanHistory } from "./bilan/useBilanHistory";

// Ré-export pour compatibilité (utilisé dans les exports)
export { normalizeBilanForWrite as normalizeBilanRow };

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
}) {
  // ─── État local ────────────────────────────────────────────────
  const [showBilan, setShowBilan] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [bilanPeriodType, setBilanPeriodType] = useState("semaine");
  const [bilanPeriodValue, setBilanPeriodValue] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [bilanPaye, setBilanPaye] = useState(false);

  const [bilanContent, setBilanContent] = useState({
    titre: "",
    totalE: 0,
    totalH: 0,
    filteredData: [],
    groupedData: [],
    totalFrais: 0,
    fraisDivers: [],
    impayePrecedent: 0,
    resteCettePeriode: 0,
    resteAPercevoir: 0,
    soldeAcomptesAvant: 0,
    soldeAcomptesApres: 0,
    acomptesDansPeriode: 0,
    totalAcomptes: 0,
    acompteConsommePeriode: 0,
    selectedPatronId: null,
    selectedPatronNom: "Tous les patrons (Global)",
    fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
  });

  // ─── Sous-hooks ────────────────────────────────────────────────
  const acomptesHook = useBilanAcomptes({ bilanPeriodType, bilanPeriodValue });
  const kmHook = useBilanKm({ triggerAlert });
  const historyHook = useBilanHistory({
    patrons,
    triggerAlert,
    getMissionsByPeriod,
    getFraisByWeek,
    getTotalFrais,
    getImpayePrecedent: acomptesHook.getImpayePrecedent,
  });

  // ─── Helpers de formatage ──────────────────────────────────────
  const formatPeriodLabel = useCallback(
    (val) => {
      if (!val) return "";
      const sVal = val.toString();
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) return `Semaine ${sVal}`;
      if (bilanPeriodType === PERIOD_TYPES.MOIS && sVal.includes("-")) {
        const [y, m] = sVal.split("-");
        return new Date(y, m - 1)
          .toLocaleString("fr-FR", { month: "long", year: "numeric" })
          .toUpperCase();
      }
      return sVal;
    },
    [bilanPeriodType]
  );

  // ─── Calcul des périodes disponibles ───────────────────────────
  const calculerPeriodesDisponibles = useCallback(() => {
    const periods = new Set();
    missions.forEach((m) => {
      const mDate = m?.date_mission || m?.date_iso;
      if (!mDate) return;
      const d = new Date(mDate);
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
        periods.add(getWeekNumber(d));
      } else if (bilanPeriodType === PERIOD_TYPES.MOIS) {
        periods.add(mDate.substring(0, 7));
      } else if (bilanPeriodType === PERIOD_TYPES.ANNEE) {
        periods.add(mDate.substring(0, 4));
      }
    });
    const sorted = Array.from(periods).sort(
      (a, b) =>
        computePeriodeIndex(bilanPeriodType, b) -
        computePeriodeIndex(bilanPeriodType, a)
    );
    setAvailablePeriods(sorted);
    if (sorted.length > 0) {
      setBilanPeriodValue(sorted[0].toString());
    }
  }, [missions, bilanPeriodType]);

  // ─── Re-génération auto quand la période change ────────────────
  useEffect(() => {
    if (showBilan && bilanPeriodValue) {
      genererBilan(bilanContent.selectedPatronId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPeriodValue]);

  // ─── Génération du bilan ───────────────────────────────────────
  const genererBilan = useCallback(
    async (patronId = null, clientId = null) => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return false;
      }
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE && !getSoldeAvant) {
        triggerAlert?.("⚠️ getSoldeAvant manquant (useAcomptes).");
        return false;
      }

      try {
        const runPatronId =
          patronId ?? bilanContent.selectedPatronId ?? null;
        const pId = effectivePatronId(runPatronId);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return false;
        }

        // ── Missions filtrées ──
        const filtered = getMissionsByPeriod(
          bilanPeriodType,
          bilanPeriodValue,
          runPatronId
        )
          .filter((m) => !clientId || m.client_id === clientId)
          .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso));

        const totalMissions = filtered.reduce(
          (sum, m) => sum + (m.montant || 0),
          0
        );
        const totalH = filtered.reduce(
          (sum, m) => sum + (m.duree || 0),
          0
        );

        // ── Données groupées (mois/année) ──
        let groupedData = [];
        if (bilanPeriodType === PERIOD_TYPES.MOIS && filtered.length > 0) {
          const weekMap = new Map();
          filtered.forEach((m) => {
            const weekNum = getWeekNumber(new Date(m.date_iso));
            if (!weekMap.has(weekNum)) {
              weekMap.set(weekNum, {
                weekNumber: weekNum,
                totalHeures: 0,
                totalMontant: 0,
                missions: [],
              });
            }
            const week = weekMap.get(weekNum);
            week.totalHeures += m.duree || 0;
            week.totalMontant += m.montant || 0;
            week.missions.push(m);
          });
          groupedData = Array.from(weekMap.values())
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((week) => ({
              label: `Semaine ${week.weekNumber}`,
              h: week.totalHeures,
              e: week.totalMontant,
              missions: week.missions,
            }));
        }
        if (bilanPeriodType === PERIOD_TYPES.ANNEE && filtered.length > 0) {
          const monthMap = new Map();
          filtered.forEach((m) => {
            const monthKey = m.date_iso.substring(0, 7);
            if (!monthMap.has(monthKey)) {
              monthMap.set(monthKey, {
                monthKey,
                totalHeures: 0,
                totalMontant: 0,
                missions: [],
              });
            }
            const month = monthMap.get(monthKey);
            month.totalHeures += m.duree || 0;
            month.totalMontant += m.montant || 0;
            month.missions.push(m);
          });
          groupedData = Array.from(monthMap.values())
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
            .map((month) => {
              const [year, monthNum] = month.monthKey.split("-");
              const monthLabel = new Date(year, parseInt(monthNum) - 1)
                .toLocaleString("fr-FR", { month: "long" })
                .toUpperCase();
              return {
                label: monthLabel,
                h: month.totalHeures,
                e: month.totalMontant,
                missions: month.missions,
              };
            });
        }

        // ── Frais divers ──
        let fraisFiltres = [];
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          fraisFiltres = getFraisByWeek(
            parseInt(bilanPeriodValue, 10),
            runPatronId
          );
        }
        const totalFrais = getTotalFrais(fraisFiltres);

        // ── Dates de la période ──
        const { debutPeriode, finPeriode } = computePeriodeDates(
          bilanPeriodType,
          bilanPeriodValue
        );

        const caBrutPeriode = totalMissions + totalFrais;

        if (caBrutPeriode === 0 && filtered.length === 0) {
          triggerAlert?.(
            `⚠️ Aucune mission pour ${
              resolvePatronNom(runPatronId, patrons) || "ce patron"
            } en ${formatPeriodLabel(bilanPeriodValue)}`
          );
          setShowPeriodModal(false);
          setShowBilan(false);
          return false;
        }

        // ── Impayés précédents ──
        let impayePrecedent = 0;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          impayePrecedent = await acomptesHook.getImpayePrecedent(
            parseInt(bilanPeriodValue, 10),
            runPatronId
          );
        }

        // ── Calculs acomptes ──
        let resteCettePeriode = 0;
        let resteAPercevoir = 0;
        let soldeAvantPeriode = 0;
        let soldeApresPeriode = 0;
        let acompteConsomme = 0;
        let acompteConsommePeriode = 0;

        const acomptesDansPeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? getAcomptesDansPeriode(debutPeriode, finPeriode, runPatronId)
            : 0;

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const weekNum = parseInt(bilanPeriodValue, 10);

          const acompteData =
            await acomptesHook.fetchAcompteDataForWeek({
              pId,
              weekNum,
              debutPeriode,
              finPeriode,
            });

          acompteConsomme = acompteData.allocCetteSemaine;
          acompteConsommePeriode = acompteData.acompteConsommePeriode;
          soldeAvantPeriode = Math.max(
            0,
            acompteData.acomptesCumules -
              acompteData.totalAlloueAvant -
              acompteData.acomptesDansPeriode
          );
          soldeApresPeriode = Math.max(
            0,
            acompteData.acomptesCumules -
              acompteData.totalAlloueJusqua
          );

          const detteTotale = impayePrecedent + caBrutPeriode;
          resteCettePeriode = Math.max(
            0,
            detteTotale - acompteConsomme
          );
          resteAPercevoir = resteCettePeriode;
        } else {
          soldeAvantPeriode = getSoldeAvant(debutPeriode, runPatronId);
          const acomptesDansPeriodeLocal = getAcomptesDansPeriode(
            debutPeriode,
            finPeriode,
            runPatronId
          );
          const acompteDisponible =
            soldeAvantPeriode + acomptesDansPeriodeLocal;
          acompteConsomme = Math.min(acompteDisponible, caBrutPeriode);
          resteCettePeriode = caBrutPeriode - acompteConsomme;
          resteAPercevoir = resteCettePeriode;
          soldeApresPeriode = acompteDisponible - acompteConsomme;
        }

        const consommeCettePeriode =
          bilanPeriodType === PERIOD_TYPES.SEMAINE
            ? acomptesDansPeriode > 0
              ? acomptesDansPeriode
              : 0
            : Math.max(
                0,
                soldeAvantPeriode + acomptesDansPeriode - soldeApresPeriode
              );

        const statutPaye = await acomptesHook.getStatutPaiement(runPatronId);

        const selectedPatron = runPatronId
          ? patrons.find((p) => p.id === runPatronId)
          : null;
        const patronNom = selectedPatron
          ? selectedPatron.nom
          : "Tous les patrons (Global)";

        // ── Météo ──
        let filteredWithWeather = filtered;
        if (bilanPeriodType === PERIOD_TYPES.SEMAINE && filtered.length > 0) {
          filteredWithWeather = await enrichMissionsWithWeather({
            missions: filtered,
            lieux,
            domicileLatLng,
          });
        }

        // ── Frais kilométriques ──
        const fraisKm = computeFraisKm({
          missions: filtered,
          lieux,
          kmSettings,
          domicileLatLng,
        });

        if (
          kmSettings?.km_enable === true &&
          bilanPeriodType === PERIOD_TYPES.SEMAINE &&
          fraisKm.totalAmount > 0
        ) {
          resteAPercevoir = Math.max(
            0,
            resteAPercevoir + fraisKm.totalAmount
          );
          resteCettePeriode = resteAPercevoir;
        }

        // ── Construction du contenu ──
        const content = {
          titre: formatPeriodLabel(bilanPeriodValue),
          totalE: caBrutPeriode,
          totalH,
          filteredData: filteredWithWeather,
          groupedData,
          totalFrais:
            bilanPeriodType === PERIOD_TYPES.SEMAINE ? totalFrais : 0,
          fraisDivers:
            bilanPeriodType === PERIOD_TYPES.SEMAINE ? fraisFiltres : [],
          acompteConsommePeriode:
            bilanPeriodType === PERIOD_TYPES.SEMAINE
              ? acompteConsommePeriode
              : 0,
          totalAcomptes:
            bilanPeriodType === PERIOD_TYPES.SEMAINE
              ? consommeCettePeriode
              : 0,
          acomptesDansPeriode:
            bilanPeriodType === PERIOD_TYPES.SEMAINE
              ? acomptesDansPeriode
              : 0,
          resteCettePeriode,
          resteAPercevoir,
          impayePrecedent,
          soldeAcomptesAvant: soldeAvantPeriode,
          soldeAcomptesApres: soldeApresPeriode,
          selectedPatronId: runPatronId,
          selectedPatronNom: patronNom,
          fraisKilometriques: fraisKm,
          lieux,
        };

        const periodeIndex = computePeriodeIndex(
          bilanPeriodType,
          bilanPeriodValue
        );
        const isPaid = computeStatutPaye(statutPaye, resteCettePeriode);

        if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
          const safeNumber = (v) =>
            Number.isFinite(Number(v)) ? Number(v) : 0;
          const resteNetFinal = safeNumber(resteCettePeriode);
          content.resteAPercevoir = resteNetFinal;
          content.resteCettePeriode = resteNetFinal;
        }

        setBilanContent(content);
        setBilanPaye(isPaid);
        setShowPeriodModal(false);
        setShowBilan(true);

        // ── Persistance DB (via bilansApi) ──
        if (!isGlobalPatronId(patronId)) {
          await upsertBilanPeriode({
            userId: user.id,
            periodeType: bilanPeriodType,
            periodeValue: bilanPeriodValue,
            periodeIndex,
            patronId: pId,
            caBrutPeriode,
            paye: false,
            datePaiement: null,
            acompteConsomme,
            resteAPercevoir: resteCettePeriode,
          });
        }
      } catch (err) {
        console.error("❌ ERREUR GENERATION BILAN:", err);
        triggerAlert?.("Erreur lors de la génération du bilan.");
        return false;
      }
    },
    [
      bilanPeriodValue,
      bilanPeriodType,
      bilanContent.selectedPatronId,
      getMissionsByPeriod,
      getFraisByWeek,
      getTotalFrais,
      getSoldeAvant,
      getAcomptesDansPeriode,
      acomptesHook,
      formatPeriodLabel,
      triggerAlert,
      patrons,
      kmSettings,
      domicileLatLng,
      lieux,
    ]
  );

  // ─── Marquer comme payé ────────────────────────────────────────
  const marquerCommePaye = useCallback(
    async (patronId = null) => {
      try {
        const pId = effectivePatronId(patronId);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        const caBrutPeriode = Number(bilanContent.totalE) || 0;
        const periodeIndex = computePeriodeIndex(
          bilanPeriodType,
          bilanPeriodValue
        );

        await markBilanPaye({
          periodeType: bilanPeriodType,
          periodeValue: bilanPeriodValue,
          patronId: pId,
          userId: user.id,
          caBrutPeriode,
        });

        setBilanPaye(true);
        triggerAlert?.("✅ Marqué comme payé !");
        return true;
      } catch {
        triggerAlert?.("Erreur : opération échouée");
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue, bilanContent, triggerAlert]
  );

  // ─── Auto-paiement neutralisé ─────────────────────────────────
  const autoPayerBilans = useCallback(
    async (patronId, montantAcompte) => {
      console.warn(
        "autoPayerBilans est neutralisé: utiliser apply_acompte côté DB",
        { patronId, montantAcompte }
      );
      triggerAlert?.(
        "ℹ️ Auto-paiement front désactivé (source de vérité côté DB)."
      );
      return false;
    },
    [triggerAlert]
  );

  // ─── Recalcul frais KM (delegate) ─────────────────────────────
  const recalculerFraisKm = useCallback(
    async (patronId = null) => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return;
      }
      return kmHook.recalculerFraisKm({
        patronId,
        missionsList: bilanContent.filteredData,
        lieux,
        kmSettings,
        domicileLatLng,
        genererBilan,
      });
    },
    [
      bilanPeriodValue,
      bilanContent.filteredData,
      kmHook,
      lieux,
      kmSettings,
      domicileLatLng,
      triggerAlert,
      genererBilan,
    ]
  );

  // ─── Navigation entre semaines ─────────────────────────────────
  const gotoPreviousWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex < availablePeriods.length - 1) {
      setBilanPeriodValue(availablePeriods[currentIndex + 1]);
    }
  }, [availablePeriods, bilanPeriodValue]);

  const gotoNextWeek = useCallback(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex > 0) {
      setBilanPeriodValue(availablePeriods[currentIndex - 1]);
    }
  }, [availablePeriods, bilanPeriodValue]);

  const hasPreviousWeek = useMemo(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex < availablePeriods.length - 1;
  }, [availablePeriods, bilanPeriodValue]);

  const hasNextWeek = useMemo(() => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex > 0;
  }, [availablePeriods, bilanPeriodValue]);

  const handleWeekChange = useCallback((newValue) => {
    setBilanPeriodValue(newValue);
  }, []);

  // ─── Interface publique (identique à l'ancienne version) ───────
  return {
    showBilan,
    setShowBilan,
    showPeriodModal,
    setShowPeriodModal,
    bilanPeriodType,
    setBilanPeriodType,
    bilanPeriodValue,
    setBilanPeriodValue,
    availablePeriods,
    bilanPaye,
    bilanContent,
    formatPeriodLabel,
    calculerPeriodesDisponibles,
    genererBilan,
    marquerCommePaye,
    autoPayerBilans,
    fetchHistoriqueBilans: historyHook.fetchHistoriqueBilans,
    gotoPreviousWeek,
    gotoNextWeek,
    hasPreviousWeek,
    hasNextWeek,
    handleWeekChange,
    recalculerFraisKm,
    isRecalculatingKm: kmHook.isRecalculatingKm,
    rebuildBilans: historyHook.rebuildBilans,
    repairBilansDB: historyHook.repairBilansDB,
  };
}

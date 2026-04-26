/**
 * useBilanAcomptes.js — Calculs d'acomptes et d'impayés pour les bilans.
 *
 * Extrait de useBilan.js : toute la logique de calcul
 * liée aux acomptes, allocations et statuts de paiement.
 *
 * Les appels Supabase passent par les services API
 * (bilansApi, allocationsApi) — plus d'import direct de supabase.
 */

import { useCallback } from "react";
import { supabase } from "../../services/supabase";
import { computeStatutPaye } from "../../lib/bilanEngine";
import {
  GLOBAL_PATRON_ID,
  BILANS_TABLE,
  PERIOD_TYPES,
  effectivePatronId,
} from "./bilanConstants";

// Services API
import { fetchBilanStatutPaiement, fetchBilansImpayesAvant } from "../../services/api/bilansApi";
import {
  fetchAllocationsByWeek,
  fetchAllocationsUpToWeek,
  fetchAllocationsBeforeWeek,
  fetchAllocationsInPeriod,
  fetchAllAllocations,
  fetchAcomptesCumules,
  fetchAcomptesInPeriod,
} from "../../services/api/allocationsApi";

/**
 * Hook pour les calculs d'acomptes liés aux bilans.
 *
 * @param {object} params
 * @param {string} params.bilanPeriodType - Type de période courant
 * @param {string} params.bilanPeriodValue - Valeur de période courante
 */
export function useBilanAcomptes({ bilanPeriodType, bilanPeriodValue }) {
  /**
   * Récupère le statut de paiement d'un bilan depuis la DB.
   * @param {string|null} patronId
   * @returns {Promise<boolean>}
   */
  const getStatutPaiement = useCallback(
    async (patronId = null) => {
      const pId = effectivePatronId(patronId);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return false;

        const row = await fetchBilanStatutPaiement({
          periodeType: bilanPeriodType,
          periodeValue: bilanPeriodValue,
          patronId: pId,
        });

        if (!row) return false;
        const reste = parseFloat(row?.reste_a_percevoir ?? 0);
        return computeStatutPaye(row?.paye, reste);
      } catch (err) {
        console.error("Erreur getStatutPaiement:", err);
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue]
  );

  /**
   * Calcule l'impayé cumulé sur les semaines précédentes.
   * @param {number} currentWeek
   * @param {string|null} patronId
   * @returns {Promise<number>}
   */
  const getImpayePrecedent = useCallback(
    async (currentWeek, patronId = null) => {
      const pId = effectivePatronId(patronId);
      const currentIndex = parseInt(currentWeek, 10) || 0;
      if (currentIndex < 2) return 0;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return 0;

        const bilans = await fetchBilansImpayesAvant({
          patronId: pId,
          weekIndex: currentIndex,
        });

        if (!bilans || bilans.length === 0) return 0;

        const allocs = await fetchAllAllocations({ patronId: pId });

        const allocByWeek = {};
        (allocs || []).forEach((a) => {
          const idx = a.periode_index;
          allocByWeek[idx] =
            (allocByWeek[idx] || 0) + (parseFloat(a.amount) || 0);
        });

        const impayePrecedent = bilans.reduce((sum, r) => {
          const ca = parseFloat(r.ca_brut_periode || 0);
          const alloue = allocByWeek[r.periode_index] || 0;
          const resteReel = Math.max(0, ca - alloue);
          return sum + resteReel;
        }, 0);

        return impayePrecedent;
      } catch (err) {
        console.error("Erreur getImpayePrecedent:", err);
        return 0;
      }
    },
    []
  );

  /**
   * Récupère le total des acomptes alloués avant une semaine donnée.
   * @param {number} weekNum
   * @param {string|null} patronId
   * @returns {Promise<number>}
   */
  const getAcomptesUtilisesAvantPeriode = useCallback(
    async (weekNum, patronId = null) => {
      if (!weekNum) return 0;
      const pId = effectivePatronId(patronId);
      try {
        const data = await fetchAllocationsBeforeWeek({
          patronId: pId,
          weekIndex: parseInt(weekNum, 10),
        });
        return (data || []).reduce(
          (sum, row) => sum + (parseFloat(row?.amount) || 0),
          0
        );
      } catch (err) {
        console.error("Erreur getAcomptesUtilisesAvantPeriode:", err);
        return 0;
      }
    },
    []
  );

  /**
   * Récupère toutes les données d'acomptes et d'allocutions pour une semaine
   * (utilisé dans genererBilan pour le mode SEMAINE).
   *
   * @param {object} params
   * @param {string} params.pId - Patron ID effectif
   * @param {number} params.weekNum
   * @param {string} params.debutPeriode
   * @param {string} params.finPeriode
   * @returns {Promise<object>}
   */
  const fetchAcompteDataForWeek = useCallback(
    async ({ pId, weekNum, debutPeriode, finPeriode }) => {
      // Allocations de cette semaine
      const allocsCetteSemaine = await fetchAllocationsByWeek({
        patronId: pId,
        weekIndex: weekNum,
      });
      const allocCetteSemaine = (allocsCetteSemaine || []).reduce(
        (sum, a) => sum + (parseFloat(a.amount) || 0),
        0
      );

      // Allocations jusqu'à cette semaine (inclus)
      const allocsJusqua = await fetchAllocationsUpToWeek({
        patronId: pId,
        weekIndex: weekNum,
      });
      const totalAlloueJusqua = (allocsJusqua || []).reduce(
        (sum, a) => sum + (parseFloat(a.amount) || 0),
        0
      );

      // Allocations avant cette semaine (exclu)
      const allocsAvant = await fetchAllocationsBeforeWeek({
        patronId: pId,
        weekIndex: weekNum,
      });
      const totalAlloueAvant = (allocsAvant || []).reduce(
        (sum, a) => sum + (parseFloat(a.amount) || 0),
        0
      );

      // Allocations créées dans la période (par date created_at)
      const periodStartIso = new Date(
        `${debutPeriode}T00:00:00`
      ).toISOString();
      const periodEndExclusive = new Date(`${finPeriode}T00:00:00`);
      periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);

      const allocsCreatedInPeriod = await fetchAllocationsInPeriod({
        patronId: pId,
        periodStartIso,
        periodEndIso: periodEndExclusive.toISOString(),
      });

      const acompteConsommePeriode = (allocsCreatedInPeriod || []).reduce(
        (sum, a) => sum + (parseFloat(a.amount) || 0),
        0
      );

      // Acomptes cumulés jusqu'à finPeriode
      const acomptesCumulesRows = await fetchAcomptesCumules({
        patronId: pId,
        dateFin: finPeriode,
      });

      // Acomptes dans la période
      const acomptesPeriodeRows = await fetchAcomptesInPeriod({
        patronId: pId,
        dateDebut: debutPeriode,
        dateFin: finPeriode,
      });

      const acomptesCumules = (acomptesCumulesRows || []).reduce(
        (sum, a) => sum + (parseFloat(a.montant) || 0),
        0
      );
      const acomptesDansPeriode = (acomptesPeriodeRows || []).reduce(
        (sum, a) => sum + (parseFloat(a.montant) || 0),
        0
      );

      return {
        allocCetteSemaine,
        totalAlloueJusqua,
        totalAlloueAvant,
        acompteConsommePeriode,
        acomptesCumules,
        acomptesDansPeriode,
      };
    },
    []
  );

  return {
    getStatutPaiement,
    getImpayePrecedent,
    getAcomptesUtilisesAvantPeriode,
    fetchAcompteDataForWeek,
  };
}

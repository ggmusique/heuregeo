/**
 * useBilanHistory.js — Historique des bilans et opérations d'administration.
 *
 * Extrait de useBilan.js : fetchHistoriqueBilans, rebuildBilans, repairBilansDB.
 *
 * Les appels Supabase passent par les services API
 * (bilansApi, allocationsApi) — plus d'import direct de supabase
 * pour les opérations CRUD.
 */

import { useCallback } from "react";
import { supabase } from "../../services/supabase";
import {
  BILANS_TABLE,
  PERIOD_TYPES,
  effectivePatronId,
  resolvePatronNom,
} from "./bilanConstants";

// Services API
import {
  fetchBilansHistorique,
  fetchBilanIdByPeriode,
  createBilan,
  updateBilan,
  fetchBilansForRepair,
  repairBilanRow,
} from "../../services/api/bilansApi";
import { fetchAllAllocations } from "../../services/api/allocationsApi";

/**
 * Hook pour l'historique et l'administration des bilans.
 *
 * @param {object} params
 * @param {Array} params.patrons - Liste des patrons (pour résolution de nom)
 * @param {Function} params.triggerAlert
 * @param {Function} params.getMissionsByPeriod
 * @param {Function} params.getFraisByWeek
 * @param {Function} params.getTotalFrais
 * @param {Function} params.getImpayePrecedent
 */
export function useBilanHistory({
  patrons = [],
  triggerAlert,
  getMissionsByPeriod,
  getFraisByWeek,
  getTotalFrais,
  getImpayePrecedent,
}) {
  /**
   * Charge l'historique des bilans pour un patron.
   * @param {string|null} patronId
   * @returns {Promise<{impayes: Array, payes: Array, all: Array}>}
   */
  const fetchHistoriqueBilans = useCallback(
    async (patronId = null) => {
      const pId = effectivePatronId(patronId);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { impayes: [], payes: [], all: [] };

        const data = await fetchBilansHistorique({ patronId: pId });
        const allocs = await fetchAllAllocations({ patronId: pId });

        // Somme des allocations par semaine
        const allocByWeek = {};
        (allocs || []).forEach((a) => {
          const idx = a.periode_index;
          allocByWeek[idx] =
            (allocByWeek[idx] || 0) + (parseFloat(a.amount) || 0);
        });

        const rows = (data || []).map((r) => {
          const patron_nom = resolvePatronNom(r.patron_id, patrons);

          // Si déjà marqué payé en DB, on lui fait confiance
          if (r.paye === true) {
            return { ...r, patron_nom, paye: true, reste_a_percevoir: 0 };
          }

          // Pour les non payés, calcul depuis les allocations réelles
          const ca = parseFloat(r.ca_brut_periode || 0);
          const alloue = allocByWeek[r.periode_index] || 0;
          const resteReel = Math.max(0, ca - alloue);
          const payeNormalise = resteReel <= 0.01;

          return {
            ...r,
            patron_nom,
            paye: payeNormalise,
            reste_a_percevoir: resteReel,
          };
        });

        const impayes = rows
          .filter((r) => r.paye === false)
          .sort(
            (a, b) => Number(b.periode_value) - Number(a.periode_value)
          );
        const payes = rows
          .filter((r) => r.paye === true)
          .sort(
            (a, b) => Number(b.periode_value) - Number(a.periode_value)
          );

        return { impayes, payes, all: rows };
      } catch {
        triggerAlert?.("Erreur chargement historique");
        return { impayes: [], payes: [], all: [] };
      }
    },
    [patrons, triggerAlert]
  );

  /**
   * Reconstruit les bilans pour une plage de semaines.
   * @param {string|null} patronId
   * @param {number} startWeek
   * @param {number} endWeek
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const rebuildBilans = useCallback(
    async (patronId, startWeek, endWeek) => {
      const pId = effectivePatronId(patronId);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user)
          return { success: false, message: "Utilisateur non connecté" };

        let rebuilt = 0;

        for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
          const filtered = getMissionsByPeriod(
            PERIOD_TYPES.SEMAINE,
            String(weekNum),
            patronId
          );
          const totalMissions = filtered.reduce(
            (sum, m) => sum + (m.montant || 0),
            0
          );
          const fraisFiltres = getFraisByWeek(weekNum, patronId);
          const totalFrais = getTotalFrais(fraisFiltres);
          const caBrutPeriode = totalMissions + totalFrais;

          const existingBilan = await fetchBilanIdByPeriode({
            periodeType: PERIOD_TYPES.SEMAINE,
            periodeValue: String(weekNum),
            patronId: pId,
          });

          if (!existingBilan?.id) {
            await createBilan({
              user_id: user.id,
              periode_type: PERIOD_TYPES.SEMAINE,
              periode_value: String(weekNum),
              periode_index: weekNum,
              patron_id: pId,
              ca_brut_periode: caBrutPeriode,
              paye: false,
              date_paiement: null,
              acompte_consomme: 0,
              reste_a_percevoir: caBrutPeriode,
            });
          } else {
            await updateBilan(existingBilan.id, {
              ca_brut_periode: caBrutPeriode,
              periode_index: weekNum,
            });
          }

          rebuilt++;
        }

        return {
          success: true,
          message: `${rebuilt} semaine(s) reconstruite(s) (S${startWeek}→S${endWeek})`,
        };
      } catch (err) {
        console.error("❌ Erreur rebuildBilans:", err);
        return { success: false, message: err?.message || "Erreur rebuild" };
      }
    },
    [getMissionsByPeriod, getFraisByWeek, getTotalFrais, getImpayePrecedent]
  );

  /**
   * Répare les incohérences dans la table bilans_status_v2.
   * @param {string|null} patronId
   * @returns {Promise<{success: boolean, message: string, fixed: number, skipped: number}>}
   */
  const repairBilansDB = useCallback(async (patronId) => {
    const pId = effectivePatronId(patronId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return {
          success: false,
          message: "Non connecté",
          fixed: 0,
          skipped: 0,
        };

      const bilans = await fetchBilansForRepair({ patronId: pId });

      if (!bilans || bilans.length === 0) {
        return {
          success: true,
          message: "Aucune ligne à réparer",
          fixed: 0,
          skipped: 0,
        };
      }

      const allocs = await fetchAllAllocations({ patronId: pId });

      const allocByWeek = {};
      (allocs || []).forEach((a) => {
        const idx = a.periode_index;
        allocByWeek[idx] =
          (allocByWeek[idx] || 0) + (parseFloat(a.amount) || 0);
      });

      let fixed = 0;
      let skipped = 0;

      for (const bilan of bilans) {
        const ca = parseFloat(bilan.ca_brut_periode || 0);
        const alloueReel = allocByWeek[bilan.periode_index] || 0;
        const resteReel = Math.max(0, ca - alloueReel);
        const payeReel = bilan.paye === true || resteReel <= 0.01;

        const acompteConsommeInDB = parseFloat(bilan.acompte_consomme || 0);
        const resteInDB = parseFloat(bilan.reste_a_percevoir || 0);

        const needsFix =
          Math.abs(acompteConsommeInDB - alloueReel) > 0.01 ||
          Math.abs(resteInDB - (payeReel ? 0 : resteReel)) > 0.01;

        if (!needsFix) {
          skipped++;
          continue;
        }

        const updatePayload = {
          acompte_consomme: alloueReel,
          reste_a_percevoir: payeReel ? 0 : resteReel,
          paye: payeReel,
        };
        if (payeReel && !bilan.paye) {
          updatePayload.date_paiement = new Date().toISOString();
        }

        try {
          await repairBilanRow(bilan.id, updatePayload);
          fixed++;
        } catch (updateError) {
          console.error("repairBilansDB update error", {
            id: bilan.id,
            error: updateError,
          });
        }
      }

      return {
        success: true,
        message: `Réparation terminée : ${fixed} ligne(s) corrigée(s), ${skipped} déjà correcte(s)`,
        fixed,
        skipped,
      };
    } catch (err) {
      console.error("repairBilansDB error:", err);
      return {
        success: false,
        message: err?.message || "Erreur inconnue",
        fixed: 0,
        skipped: 0,
      };
    }
  }, []);

  return {
    fetchHistoriqueBilans,
    rebuildBilans,
    repairBilansDB,
  };
}

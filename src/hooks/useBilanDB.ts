import { useCallback, Dispatch, SetStateAction } from "react";
import { getCurrentUserOrNull } from "../services/authService";
import {
  fetchLatestBilanStatus,
  fetchUnpaidWeeklyBilansBefore,
  fetchAcompteAllocationsBefore,
  fetchAcompteAmountsBefore,
  fetchAcompteAllocationsByPatron,
  fetchWeeklyBilansForRepair,
  fetchBilanByPeriodAndPatron,
  insertBilanRow,
  updateBilanRowById,
} from "../services/bilanRepository";
import { buildAllocByWeek } from "../lib/bilanHistory";
import { computeStatutPaye } from "../lib/bilanEngine";
import { computePeriodeIndex } from "../lib/bilanPeriods";
import { computeRepairDecision } from "../lib/bilanRepair";
import { PERIOD_TYPES } from "../constants/bilanPeriods";
import type { Mission, FraisDivers, Patron } from "../types/entities";
import type { BilanContent } from "../types/bilan";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RebuildResult {
  success: boolean;
  message: string;
}

export interface RepairResult {
  success: boolean;
  message: string;
  fixed: number;
  skipped: number;
}

interface UseBilanDBParams {
  bilanPeriodType: string;
  bilanPeriodValue: string;
  bilanContent: BilanContent;
  patrons: Patron[];
  triggerAlert: ((msg: string) => void) | undefined;
  setBilanPaye: Dispatch<SetStateAction<boolean>>;
  getMissionsByPeriod: (
    periodType: string,
    periodValue: string | number,
    patronId?: string | null,
    year?: number
  ) => Mission[];
  getFraisByWeek: (weekNumber: number, patronId?: string | null) => FraisDivers[];
  getTotalFrais: (fraisList?: FraisDivers[]) => number;
}

export interface UseBilanDBReturn {
  getStatutPaiement: (patronId?: string | null) => Promise<boolean>;
  getImpayePrecedent: (currentWeek: number, patronId?: string | null) => Promise<number>;
  getAcomptesUtilisesAvantPeriode: (weekNum: number, patronId?: string | null) => Promise<number>;
  marquerCommePaye: (patronId?: string | null) => Promise<boolean>;
  rebuildBilans: (
    patronId: string | null,
    startWeek: number,
    endWeek: number
  ) => Promise<RebuildResult>;
  repairBilansDB: (patronId: string | null) => Promise<RepairResult>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";

const effectivePatronId = (patronId: string | null | undefined): string =>
  patronId ? patronId : GLOBAL_PATRON_ID;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBilanDB({
  bilanPeriodType,
  bilanPeriodValue,
  bilanContent,
  triggerAlert,
  setBilanPaye,
  getMissionsByPeriod,
  getFraisByWeek,
  getTotalFrais,
}: UseBilanDBParams): UseBilanDBReturn {
  const getStatutPaiement = useCallback(
    async (patronId: string | null = null): Promise<boolean> => {
      const pId = effectivePatronId(patronId);
      try {
        const user = await getCurrentUserOrNull();
        if (!user) return false;
        const row = await fetchLatestBilanStatus({
          periodeType: bilanPeriodType,
          periodeValue: bilanPeriodValue,
          patronId: pId,
        });
        if (!row) return false;
        const reste = parseFloat(String(row?.reste_a_percevoir ?? 0));
        return computeStatutPaye(row?.paye, reste);
      } catch (err) {
        console.error("Erreur getStatutPaiement:", err);
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue]
  );

  const getImpayePrecedent = useCallback(
    async (currentWeek: number, patronId: string | null = null): Promise<number> => {
      const pId = effectivePatronId(patronId);
      const currentIndex = currentWeek || 0;
      if (currentIndex < 2) return 0;

      try {
        const user = await getCurrentUserOrNull();
        if (!user) return 0;

        const bilans = await fetchUnpaidWeeklyBilansBefore({
          patronId: pId,
          beforePeriodeIndex: currentIndex,
        });
        if (!bilans || bilans.length === 0) return 0;

        const allocs = await fetchAcompteAllocationsBefore({
          patronId: pId,
          beforePeriodeIndex: currentIndex,
        });

        const allocByWeek = buildAllocByWeek(allocs);

        const impayePrecedent = bilans.reduce((sum: number, r: Record<string, unknown>) => {
          const ca = parseFloat(String(r.ca_brut_periode || 0));
          const alloue =
            (allocByWeek as Record<string | number, number>)[
              r.periode_index as string | number
            ] || 0;
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

  const getAcomptesUtilisesAvantPeriode = useCallback(
    async (weekNum: number, patronId: string | null = null): Promise<number> => {
      if (!weekNum) return 0;
      const pId = effectivePatronId(patronId);
      try {
        const data = await fetchAcompteAmountsBefore({
          patronId: pId,
          beforePeriodeIndex: weekNum,
        });
        return (data || []).reduce(
          (sum: number, row: Record<string, unknown>) =>
            sum + (parseFloat(String(row?.amount)) || 0),
          0
        );
      } catch (err) {
        console.error("Erreur getAcomptesUtilisesAvantPeriode:", err);
        return 0;
      }
    },
    []
  );

  const marquerCommePaye = useCallback(
    async (patronId: string | null = null): Promise<boolean> => {
      try {
        const pId = effectivePatronId(patronId);
        const user = await getCurrentUserOrNull();
        if (!user) throw new Error("Utilisateur non connecté");

        const periodeIndex = computePeriodeIndex(bilanPeriodType, bilanPeriodValue);
        const existingBilan = await fetchBilanByPeriodAndPatron({
          periodeType: bilanPeriodType,
          periodeValue: bilanPeriodValue,
          patronId: pId,
          columns: "id, ca_brut_periode",
        });

        if (!existingBilan?.id) {
          const caBrutPeriode = Number(bilanContent.totalE) || 0;
          await insertBilanRow({
            user_id: user.id,
            periode_type: bilanPeriodType,
            periode_value: bilanPeriodValue,
            periode_index: periodeIndex,
            patron_id: pId,
            ca_brut_periode: caBrutPeriode,
            paye: true,
            date_paiement: new Date().toISOString(),
            reste_a_percevoir: 0,
            acompte_consomme: 0,
          });
        } else {
          await updateBilanRowById(existingBilan.id, {
            paye: true,
            date_paiement: new Date().toISOString(),
            reste_a_percevoir: 0,
          });
        }

        setBilanPaye(true);
        triggerAlert?.("✅ Marqué comme payé !");
        return true;
      } catch {
        triggerAlert?.("Erreur : opération échouée");
        return false;
      }
    },
    [bilanPeriodType, bilanPeriodValue, bilanContent, triggerAlert, setBilanPaye]
  );

  const rebuildBilans = useCallback(
    async (
      patronId: string | null,
      startWeek: number,
      endWeek: number
    ): Promise<RebuildResult> => {
      const pId = effectivePatronId(patronId);
      try {
        const user = await getCurrentUserOrNull();
        if (!user) return { success: false, message: "Utilisateur non connecté" };

        let rebuilt = 0;

        for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
          const filtered = getMissionsByPeriod(
            PERIOD_TYPES.SEMAINE,
            String(weekNum),
            patronId
          );
          const totalMissions = filtered.reduce((sum, m) => sum + (m.montant || 0), 0);
          const fraisFiltres = getFraisByWeek(weekNum, patronId);
          const totalFrais = getTotalFrais(fraisFiltres);
          const caBrutPeriode = totalMissions + totalFrais;

          const existingBilan = await fetchBilanByPeriodAndPatron({
            periodeType: PERIOD_TYPES.SEMAINE,
            periodeValue: String(weekNum),
            patronId: pId,
            columns: "id",
          });

          if (!existingBilan?.id) {
            await insertBilanRow({
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
            await updateBilanRowById(existingBilan.id, {
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
        return {
          success: false,
          message: (err as Error)?.message || "Erreur rebuild",
        };
      }
    },
    [getMissionsByPeriod, getFraisByWeek, getTotalFrais]
  );

  const repairBilansDB = useCallback(
    async (patronId: string | null): Promise<RepairResult> => {
      const pId = effectivePatronId(patronId);
      try {
        const user = await getCurrentUserOrNull();
        if (!user)
          return { success: false, message: "Non connecté", fixed: 0, skipped: 0 };

        const bilans = await fetchWeeklyBilansForRepair({ patronId: pId });
        if (!bilans || bilans.length === 0) {
          return { success: true, message: "Aucune ligne à réparer", fixed: 0, skipped: 0 };
        }

        const allocs = await fetchAcompteAllocationsByPatron({ patronId: pId });
        const allocByWeek = buildAllocByWeek(allocs);

        let fixed = 0;
        let skipped = 0;

        for (const bilan of bilans) {
          const decision = computeRepairDecision(bilan, allocByWeek);

          if (!decision.needsFix) {
            skipped++;
            continue;
          }

          const updatePayload: {
            acompte_consomme: number;
            reste_a_percevoir: number;
            paye: boolean;
            date_paiement?: string;
          } = { ...decision.payload };
          if (decision.payeReel && !bilan.paye) {
            updatePayload.date_paiement = new Date().toISOString();
          }

          try {
            await updateBilanRowById(bilan.id, updatePayload);
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
          message: (err as Error)?.message || "Erreur inconnue",
          fixed: 0,
          skipped: 0,
        };
      }
    },
    []
  );

  return {
    getStatutPaiement,
    getImpayePrecedent,
    getAcomptesUtilisesAvantPeriode,
    marquerCommePaye,
    rebuildBilans,
    repairBilansDB,
  };
}

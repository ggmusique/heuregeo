import { useState, useCallback, useMemo, useRef } from "react";
import * as missionsApi from "../services/api/missionsApi";
import { useLabels } from "../contexts/LabelsContext";
import { getWeekAndYear } from "../utils/dateUtils";
import type { Mission } from "../types/entities";

// ─── Types publics ────────────────────────────────────────────────────────────

export interface UseMissionsReturn {
  missions: Mission[];
  loading: boolean;
  clientsUniques: string[];
  lieuxUniques: string[];
  fetchMissions: () => Promise<Mission[] | void>;
  createMission: (missionData: Partial<Mission>) => Promise<Mission>;
  updateMission: (id: string, missionData: Partial<Mission>) => Promise<Mission>;
  deleteMission: (id: string) => Promise<void>;
  bulkCreateMissions: (validMissions: Partial<Mission>[]) => Promise<void>;
  getMissionsByWeek: (weekNumber: number, patronId?: string | null, year?: number) => Mission[];
  getMissionsByPeriod: (periodType: string, periodValue: string | number, patronId?: string | null, year?: number) => Mission[];
  getMissionsByPatron: (patronId?: string | null) => Mission[];
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/**

 * Vérifie si une mission en chevauchement existe déjà sur le même jour.
 * Retourne la mission en conflit ou null.
 * excludeId : ignorer cette mission (mode édition).
 */
const findOverlappingMission = (missions: Mission[], data: Partial<Mission>, excludeId: string | null = null): Mission | null => {
  if (!data.date_iso || !data.debut || !data.fin) return null;
  const [hD, mD] = data.debut.split(":").map(Number);
  const [hF, mF] = data.fin.split(":").map(Number);
  const newStart = hD * 60 + mD;
  const newEnd   = hF * 60 + mF;
  return missions.find((m) => {
    if (excludeId && m.id === excludeId) return false;
    const mDate = m.date_mission || m.date_iso;
    if (mDate !== data.date_iso) return false;
    if (!m.debut || !m.fin) return false;
    const [hS, mS] = m.debut.split(":").map(Number);
    const [hE, mE] = m.fin.split(":").map(Number);
    const existStart = hS * 60 + mS;
    const existEnd   = hE * 60 + mE;
    return newStart < existEnd && existStart < newEnd;
  }) || null;
};

/**
 * Valide les données d'une mission avant envoi en base.
 * Retourne un message d'erreur ou null si tout est valide.
 */
const validateMissionData = (data: Partial<Mission> | null, L: Record<string, string>): string | null => {
  if (!data) return "Données manquantes.";
  if (!data.client_id) return `${L.client} obligatoire.`;
  if (!data.lieu_id) return `${L.lieu} obligatoire.`;
  if (!data.patron_id) return `${L.patron} obligatoire.`;
  if (!data.debut || !data.fin) return "Horaires incomplets.";
  const [hD, mD] = data.debut.split(":").map(Number);
  const [hF, mF] = data.fin.split(":").map(Number);
  const minutesDebut = hD * 60 + mD;
  const minutesFin = hF * 60 + mF;
  if (minutesFin <= minutesDebut) return "L'heure de fin doit être après le début.";
  const grossDuration = minutesFin - minutesDebut;
  if ((data.pause || 0) >= grossDuration) return "La pause dépasse la durée de la mission.";
  return null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook complet pour gérer les missions - Multi-Patrons
 */
export const useMissions = (onError?: (msg: string) => void): UseMissionsReturn => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const L = useLabels();

  const isFetching = useRef<boolean>(false);

  const fetchMissions = useCallback(async (): Promise<Mission[] | void> => {
    if (isFetching.current) return;
    try {
      isFetching.current = true;
      setLoading(true);
      const data: Mission[] = await missionsApi.fetchMissions();
      setMissions(data || []);
      return data || [];
    } catch (err) {
      console.error("Erreur fetch missions:", err);
      onError?.("Erreur connexion. Vérifie internet.");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  const createMission = useCallback(
    async (missionData: Partial<Mission>): Promise<Mission> => {
      if (!missionData) throw new Error("Données de la mission manquantes");
      const validationError = validateMissionData(missionData, L as unknown as Record<string, string>);
      if (validationError) { onError?.(validationError); throw new Error(validationError); }
      const conflict = findOverlappingMission(missions, missionData);
      if (conflict) {
        const msg = `Créneau déjà occupé : une mission existe de ${conflict.debut?.slice(0,5)} à ${conflict.fin?.slice(0,5)} ce jour-là.`;
        onError?.(msg); throw new Error(msg);
      }
      try {
        setLoading(true);
        const newMission: Mission = await missionsApi.createMission(missionData);
        if (newMission) setMissions((prev) => [newMission, ...prev]);
        return newMission;
      } catch (err) {
        console.error("Erreur création mission:", err);
        onError?.("Erreur création mission"); throw err;
      } finally { setLoading(false); }
    },
    [onError, L, missions]
  );

  const updateMission = useCallback(
    async (id: string, missionData: Partial<Mission>): Promise<Mission> => {
      if (!id) throw new Error("ID de la mission manquant");
      if (!missionData) throw new Error("Données de la mission manquantes");
      const validationError = validateMissionData(missionData, L as unknown as Record<string, string>);
      if (validationError) { onError?.(validationError); throw new Error(validationError); }
      const conflict = findOverlappingMission(missions, missionData, id);
      if (conflict) {
        const msg = `Créneau déjà occupé : une mission existe de ${conflict.debut?.slice(0,5)} à ${conflict.fin?.slice(0,5)} ce jour-là.`;
        onError?.(msg); throw new Error(msg);
      }
      try {
        setLoading(true);
        const updated: Mission = await missionsApi.updateMission(id, missionData);
        if (updated) setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
        return updated;
      } catch (err) {
        console.error("Erreur mise à jour mission:", err);
        onError?.("Erreur mise à jour"); throw err;
      } finally { setLoading(false); }
    },
    [onError, L, missions]
  );

  const deleteMission = useCallback(
    async (id: string): Promise<void> => {
      if (!id) throw new Error("ID de la mission manquant");
      try {
        setLoading(true);
        await missionsApi.deleteMission(id);
        setMissions((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Erreur suppression mission:", err);
        onError?.("Erreur suppression"); throw err;
      } finally { setLoading(false); }
    },
    [onError]
  );

  const bulkCreateMissions = useCallback(
    async (validMissions: Partial<Mission>[]): Promise<void> => {
      if (!validMissions?.length) return;
      try {
        setLoading(true);
        await missionsApi.bulkInsertMissions(validMissions);
        await fetchMissions();
      } catch (err) {
        console.error("Erreur import missions:", err);
        onError?.("Erreur lors de l'import des missions");
        throw err;
      } finally { setLoading(false); }
    },
    [fetchMissions, onError]
  );

  const { clientsUniques, lieuxUniques } = useMemo(() => {
    const missionsArray = Array.isArray(missions) ? missions : [];
    return {
      clientsUniques: [...new Set(missionsArray.map((m) => m?.client))].filter((v): v is string => Boolean(v)),
      lieuxUniques: [...new Set(missionsArray.map((m) => m?.lieu))].filter((v): v is string => Boolean(v)),
    };
  }, [missions]);

  // -----------------------------------------------------------------------
  // FILTRES BUSINESS - Corrigés pour prendre en compte l'ANNÉE ISO
  // Fix Perplexity : antérieurement, on ne comparait que le n° de semaine
  // sans l'année => les missions de la semaine 10 de 2025 apparaissaient
  // dans le bilan de la semaine 10 de 2026.
  // -----------------------------------------------------------------------

  const getMissionsByWeek = useCallback(
    (weekNumber: number, patronId: string | null = null, year: number = new Date().getFullYear()): Mission[] => {
      if (!weekNumber) return [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      let filtered = missionsArray.filter((m) => {
        const mDate = m?.date_mission || m?.date_iso;
        if (!mDate) return false;
        try {
          // FIX : on compare la semaine ET l'année ISO
          const { week, year: isoYear } = getWeekAndYear(new Date(mDate));
          return week === weekNumber && isoYear === year;
        } catch { return false; }
      });
      if (patronId) filtered = filtered.filter((m) => m?.patron_id === patronId);
      return filtered;
    },
    [missions]
  );

  const getMissionsByPeriod = useCallback(
    (periodType: string, periodValue: string | number, patronId: string | null = null, year: number = new Date().getFullYear()): Mission[] => {
      if (!periodType || !periodValue) return [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      let filtered = missionsArray.filter((m) => {
        const mDate = m?.date_mission || m?.date_iso;
        if (!mDate) return false;
        try {
          if (periodType === "semaine") {
            // FIX : on compare la semaine ET l'année ISO
            const { week, year: isoYear } = getWeekAndYear(new Date(mDate));
            return week === parseInt(String(periodValue)) && isoYear === year;
          }
          // mois "YYYY-MM" ou année "YYYY"
          return mDate.startsWith(String(periodValue));
        } catch { return false; }
      });
      if (patronId) filtered = filtered.filter((m) => m?.patron_id === patronId);
      return filtered;
    },
    [missions]
  );

  const getMissionsByPatron = useCallback(
    (patronId: string | null = null): Mission[] => {
      if (!patronId) return missions;
      return missions.filter((m) => m?.patron_id === patronId);
    },
    [missions]
  );

  return {
    missions,
    loading,
    clientsUniques,
    lieuxUniques,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    bulkCreateMissions,
    getMissionsByWeek,
    getMissionsByPeriod,
    getMissionsByPatron,
  };
};

import { useState, useCallback, useMemo, useRef } from "react";
import * as missionsApi from "../services/api/missionsApi";
import { getWeekNumber } from "../utils/dateUtils";

/**
 * Hook complet pour gérer les missions - Multi-Patrons
 * @param {Function} onError - Callback en cas d'erreur
 */
export const useMissions = (onError) => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref pour éviter les appels multiples
  const isFetching = useRef(false);

  /**
   * Récupère toutes les missions depuis l'API
   */
  const fetchMissions = useCallback(async () => {
    // Éviter les appels multiples
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      const data = await missionsApi.fetchMissions();
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

  /**
   * Crée une nouvelle mission
   * @param {Object} missionData - Données de la mission
   */
  const createMission = useCallback(
    async (missionData) => {
      if (!missionData) {
        throw new Error("Données de la mission manquantes");
      }

      try {
        setLoading(true);
        const newMission = await missionsApi.createMission(missionData);

        if (newMission) {
          setMissions((prev) => [newMission, ...prev]);
        }

        return newMission;
      } catch (err) {
        console.error("Erreur création mission:", err);
        onError?.("Erreur création mission");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Met à jour une mission existante
   * @param {string} id - ID de la mission
   * @param {Object} missionData - Nouvelles données
   */
  const updateMission = useCallback(
    async (id, missionData) => {
      if (!id) {
        throw new Error("ID de la mission manquant");
      }

      if (!missionData) {
        throw new Error("Données de la mission manquantes");
      }

      try {
        setLoading(true);
        const updated = await missionsApi.updateMission(id, missionData);

        if (updated) {
          setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
        }

        return updated;
      } catch (err) {
        console.error("Erreur mise à jour mission:", err);
        onError?.("Erreur mise à jour");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Supprime une mission
   * @param {string} id - ID de la mission à supprimer
   */
  const deleteMission = useCallback(
    async (id) => {
      if (!id) {
        throw new Error("ID de la mission manquant");
      }

      try {
        setLoading(true);
        await missionsApi.deleteMission(id);
        setMissions((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Erreur suppression mission:", err);
        onError?.("Erreur suppression");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Calcule les clients et lieux uniques
   */
  const { clientsUniques, lieuxUniques } = useMemo(() => {
    const missionsArray = Array.isArray(missions) ? missions : [];

    return {
      clientsUniques: [...new Set(missionsArray.map((m) => m?.client))].filter(
        Boolean
      ),
      lieuxUniques: [...new Set(missionsArray.map((m) => m?.lieu))].filter(
        Boolean
      ),
    };
  }, [missions]);

  /**
   * Filtre les missions par numéro de semaine
   * @param {number} weekNumber - Numéro de semaine
   * @param {string|null} patronId - ID du patron (optionnel)
   * @returns {Array} - Missions de la semaine
   */
  const getMissionsByWeek = useCallback(
    (weekNumber, patronId = null) => {
      if (!weekNumber) return [];

      const missionsArray = Array.isArray(missions) ? missions : [];

      let filtered = missionsArray.filter((m) => {
        if (!m?.date_iso) return false;
        try {
          return getWeekNumber(new Date(m.date_iso)) === weekNumber;
        } catch {
          return false;
        }
      });

      // Filtrer par patron si spécifié
      if (patronId) {
        filtered = filtered.filter((m) => m?.patron_id === patronId);
      }

      return filtered;
    },
    [missions]
  );

  /**
   * Filtre les missions par période
   * @param {string} periodType - Type de période (semaine, mois, annee)
   * @param {string} periodValue - Valeur de la période
   * @param {string|null} patronId - ID du patron (optionnel)
   * @returns {Array} - Missions de la période
   */
  const getMissionsByPeriod = useCallback(
    (periodType, periodValue, patronId = null) => {
      if (!periodType || !periodValue) return [];

      const missionsArray = Array.isArray(missions) ? missions : [];

      let filtered = missionsArray.filter((m) => {
        if (!m?.date_iso) return false;

        try {
          if (periodType === "semaine") {
            return (
              getWeekNumber(new Date(m.date_iso)) === parseInt(periodValue)
            );
          }
          return m.date_iso.startsWith(periodValue);
        } catch {
          return false;
        }
      });

      // Filtrer par patron si spécifié
      if (patronId) {
        filtered = filtered.filter((m) => m?.patron_id === patronId);
      }

      return filtered;
    },
    [missions]
  );

  /**
   * Récupère les missions filtrées par patron
   * @param {string|null} patronId - ID du patron (null = tous)
   * @returns {Array} - Liste des missions filtrées
   */
  const getMissionsByPatron = useCallback(
    (patronId = null) => {
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
    getMissionsByWeek,
    getMissionsByPeriod,
    getMissionsByPatron, // Nouvelle fonction utile
  };
};

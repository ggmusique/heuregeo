import { useState, useCallback, useMemo, useRef } from "react";
import * as missionsApi from "../services/api/missionsApi";
import { getWeekNumber } from "../utils/dateUtils";

/**
 * Hook complet pour gérer les missions - Multi-Patrons
 *
 * Rôle dans l’app :
 * - Stocker la liste des missions en mémoire (state React)
 * - Aller chercher / modifier les missions dans la base (via missionsApi)
 * - Donner des outils de tri/filtre : par semaine, par mois/année, par patron
 * - Fournir des listes “autocomplete” : clients uniques, lieux uniques
 *
 * @param {Function} onError - fonction pour afficher une alerte (ex: triggerAlert)
 */
export const useMissions = (onError) => {
  // ------------------------------------------------------------
  // 1) STATES PRINCIPAUX
  // ------------------------------------------------------------
  // missions = toutes les missions chargées depuis la DB
  const [missions, setMissions] = useState([]);
  // loading = pour afficher le spinner pendant une action
  const [loading, setLoading] = useState(false);

  // Ref = "verrou" anti double-clic : empêche fetchMissions d’être lancé 2 fois
  const isFetching = useRef(false);

  // ------------------------------------------------------------
  // 2) CHARGEMENT (READ)
  // ------------------------------------------------------------
  /**
   * fetchMissions()
   * => appelle l'API, récupère toutes les missions, les met dans le state
   */
  const fetchMissions = useCallback(async () => {
    // Si une requête est déjà en cours, on ne relance pas
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);

      const data = await missionsApi.fetchMissions(); // 🔌 DB → récupère missions
      setMissions(data || []); // 🧠 stocke dans React

      return data || [];
    } catch (err) {
      console.error("Erreur fetch missions:", err);
      // onError = ton triggerAlert dans App.jsx
      onError?.("Erreur connexion. Vérifie internet.");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  // ------------------------------------------------------------
  // 3) CRÉATION (CREATE)
  // ------------------------------------------------------------
  /**
   * createMission(missionData)
   * => enregistre une mission en DB puis l'ajoute au state
   */
  const createMission = useCallback(
    async (missionData) => {
      if (!missionData) {
        throw new Error("Données de la mission manquantes");
      }

      try {
        setLoading(true);

        const newMission = await missionsApi.createMission(missionData); // 🔌 DB insert

        if (newMission) {
          // on la met tout en haut (comme “dernière ajoutée”)
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

  // ------------------------------------------------------------
  // 4) MISE À JOUR (UPDATE)
  // ------------------------------------------------------------
  /**
   * updateMission(id, missionData)
   * => met à jour en DB puis remplace dans le state
   */
  const updateMission = useCallback(
    async (id, missionData) => {
      if (!id) throw new Error("ID de la mission manquant");
      if (!missionData) throw new Error("Données de la mission manquantes");

      try {
        setLoading(true);

        const updated = await missionsApi.updateMission(id, missionData); // 🔌 DB update

        if (updated) {
          // Remplace uniquement la mission concernée
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

  // ------------------------------------------------------------
  // 5) SUPPRESSION (DELETE)
  // ------------------------------------------------------------
  /**
   * deleteMission(id)
   * => supprime en DB puis enlève du state
   */
  const deleteMission = useCallback(
    async (id) => {
      if (!id) throw new Error("ID de la mission manquant");

      try {
        setLoading(true);

        await missionsApi.deleteMission(id); // 🔌 DB delete
        setMissions((prev) => prev.filter((m) => m.id !== id)); // 🧠 retire du state
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

  // ------------------------------------------------------------
  // 6) LISTES UTILES (AUTOCOMPLETE)
  // ------------------------------------------------------------
  /**
   * clientsUniques / lieuxUniques
   * => sert à remplir des dropdowns / suggestions dans le formulaire MissionForm
   * useMemo = recalculé seulement quand missions change
   */
  const { clientsUniques, lieuxUniques } = useMemo(() => {
    const missionsArray = Array.isArray(missions) ? missions : [];

    return {
      clientsUniques: [...new Set(missionsArray.map((m) => m?.client))].filter(Boolean),
      lieuxUniques: [...new Set(missionsArray.map((m) => m?.lieu))].filter(Boolean),
    };
  }, [missions]);

  // ------------------------------------------------------------
  // 7) FILTRES “BUSINESS” POUR L’APP
  // ------------------------------------------------------------
  /**
   * getMissionsByWeek(weekNumber, patronId)
   * => utilisé dans App.jsx : "Semaine en cours"
   */
  const getMissionsByWeek = useCallback(
    (weekNumber, patronId = null) => {
      if (!weekNumber) return [];

      const missionsArray = Array.isArray(missions) ? missions : [];

      // Filtre semaine ISO
      let filtered = missionsArray.filter((m) => {
        if (!m?.date_iso) return false;
        try {
          return getWeekNumber(new Date(m.date_iso)) === weekNumber;
        } catch {
          return false;
        }
      });

      // Filtre patron (si demandé)
      if (patronId) {
        filtered = filtered.filter((m) => m?.patron_id === patronId);
      }

      return filtered;
    },
    [missions]
  );

  /**
   * getMissionsByPeriod(periodType, periodValue, patronId)
   * => utilisé dans useBilan : bilan semaine/mois/année
   *
   * - semaine : compare getWeekNumber(date) avec periodValue
   * - mois/année : utilise startsWith() sur date_iso ("YYYY-MM" ou "YYYY")
   */
  const getMissionsByPeriod = useCallback(
    (periodType, periodValue, patronId = null) => {
      if (!periodType || !periodValue) return [];

      const missionsArray = Array.isArray(missions) ? missions : [];

      let filtered = missionsArray.filter((m) => {
        if (!m?.date_iso) return false;

        try {
          if (periodType === "semaine") {
            return getWeekNumber(new Date(m.date_iso)) === parseInt(periodValue);
          }
          // mois "YYYY-MM" ou année "YYYY"
          return m.date_iso.startsWith(periodValue);
        } catch {
          return false;
        }
      });

      if (patronId) {
        filtered = filtered.filter((m) => m?.patron_id === patronId);
      }

      return filtered;
    },
    [missions]
  );

  /**
   * getMissionsByPatron(patronId)
   * => renvoie toutes les missions d’un patron (utile pour pages / stats)
   */
  const getMissionsByPatron = useCallback(
    (patronId = null) => {
      if (!patronId) return missions;
      return missions.filter((m) => m?.patron_id === patronId);
    },
    [missions]
  );

  // ------------------------------------------------------------
  // 8) CE QUE useMissions “DONNE” À App.jsx
  // ------------------------------------------------------------
  return {
    missions,
    loading,
    clientsUniques,
    lieuxUniques,

    // CRUD
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,

    // Filtres / helpers
    getMissionsByWeek,
    getMissionsByPeriod,
    getMissionsByPatron,
  };
};

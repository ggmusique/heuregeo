import { useState, useCallback, useMemo, useRef } from "react";
import * as missionsApi from "../services/api/missionsApi";
import { getWeekNumber } from "../utils/dateUtils";
import { useLabels } from "../contexts/LabelsContext";

/**
 * Vérifie si une mission en chevauchement existe déjà sur le même jour,
 * quel que soit le patron ou le client.
 * Retourne la mission en conflit ou null.
 * excludeId : ignorer cette mission (mode édition).
 */
const findOverlappingMission = (missions, data, excludeId = null) => {
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
const validateMissionData = (data, L) => {
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

  const L = useLabels();

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

      const validationError = validateMissionData(missionData, L);
      if (validationError) {
        onError?.(validationError);
        throw new Error(validationError);
      }

      // Vérifier doublon / chevauchement horaire
      const conflict = findOverlappingMission(missions, missionData);
      if (conflict) {
        const msg = `Créneau déjà occupé : une mission existe de ${conflict.debut?.slice(0,5)} à ${conflict.fin?.slice(0,5)} ce jour-là.`;
        onError?.(msg);
        throw new Error(msg);
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
    [onError, L, missions]
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

      const validationError = validateMissionData(missionData, L);
      if (validationError) {
        onError?.(validationError);
        throw new Error(validationError);
      }

      // Vérifier chevauchement (en excluant la mission en cours d'édition)
      const conflict = findOverlappingMission(missions, missionData, id);
      if (conflict) {
        const msg = `Créneau déjà occupé : une mission existe de ${conflict.debut?.slice(0,5)} à ${conflict.fin?.slice(0,5)} ce jour-là.`;
        onError?.(msg);
        throw new Error(msg);
      }

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
    [onError, L, missions]
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
  // 6) IMPORT EN LOT (BULK CREATE)
  // ------------------------------------------------------------
  /**
   * bulkCreateMissions(validMissions)
   * => insère plusieurs missions d'un coup (déjà validées par ImportMissionsModal)
   * puis recharge toutes les missions depuis la DB.
   */
  const bulkCreateMissions = useCallback(
    async (validMissions) => {
      if (!validMissions?.length) return;
      try {
        setLoading(true);
        await missionsApi.bulkInsertMissions(validMissions);
        await fetchMissions();
      } catch (err) {
        console.error("Erreur import missions:", err);
        onError?.("Erreur lors de l'import des missions");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchMissions, onError]
  );

  // ------------------------------------------------------------
  // 7) LISTES UTILES (AUTOCOMPLETE)
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

      // Filtre semaine ISO (date_mission en priorité, date_iso en fallback)
      let filtered = missionsArray.filter((m) => {
        const mDate = m?.date_mission || m?.date_iso;
        if (!mDate) return false;
        try {
          return getWeekNumber(new Date(mDate)) === weekNumber;
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
        // date_mission en priorité, date_iso en fallback
        const mDate = m?.date_mission || m?.date_iso;
        if (!mDate) return false;

        try {
          if (periodType === "semaine") {
            return getWeekNumber(new Date(mDate)) === parseInt(periodValue);
          }
          // mois "YYYY-MM" ou année "YYYY"
          return mDate.startsWith(periodValue);
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
    bulkCreateMissions,

    // Filtres / helpers
    getMissionsByWeek,
    getMissionsByPeriod,
    getMissionsByPatron,
  };
};

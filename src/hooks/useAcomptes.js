import { useState, useCallback, useRef } from "react";
import * as acomptesApi from "../services/api/acomptesApi";
import { calculerSoldeAcomptesAvant } from "../utils/calculators";

/**
 * Hook complet pour gérer les acomptes - Multi-Patrons
 * @param {Array} missions - Liste des missions
 * @param {Array} fraisDivers - Liste des frais divers
 * @param {Function} onError - Callback en cas d'erreur
 */
export const useAcomptes = (missions = [], fraisDivers = [], onError) => {
  const [listeAcomptes, setListeAcomptes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref pour éviter les appels multiples
  const isFetching = useRef(false);

  /**
   * Récupère tous les acomptes depuis l'API
   */
  const fetchAcomptes = useCallback(async () => {
    // Éviter les appels multiples
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      const data = await acomptesApi.fetchAcomptes();
      setListeAcomptes(data || []);
      return data || [];
    } catch (err) {
      console.error("Erreur fetch acomptes:", err);
      onError?.("Erreur chargement acomptes");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  /**
   * Crée un nouvel acompte
   * @param {Object} acompteData - Données de l'acompte
   */
  const createAcompte = useCallback(
    async (acompteData) => {
      if (!acompteData) {
        throw new Error("Données de l'acompte manquantes");
      }

      try {
        setLoading(true);
        const newAcompte = await acomptesApi.createAcompte(acompteData);

        if (newAcompte) {
          setListeAcomptes((prev) => [newAcompte, ...prev]);
        }

        return newAcompte;
      } catch (err) {
        console.error("Erreur création acompte:", err);
        onError?.("Erreur création acompte");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Supprime un acompte
   * @param {string} id - ID de l'acompte à supprimer
   */
  const deleteAcompte = useCallback(
    async (id) => {
      if (!id) {
        throw new Error("ID de l'acompte manquant");
      }

      try {
        setLoading(true);
        await acomptesApi.deleteAcompte(id);
        setListeAcomptes((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error("Erreur suppression acompte:", err);
        onError?.("Erreur suppression acompte");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * ✅ NOUVEAU : total des acomptes cumulés jusqu'à une date (incluse)
   * Sert au calcul comptable du bilan (déduire les impayés + la semaine en cours)
   *
   * @param {string} dateFin - "YYYY-MM-DD"
   * @param {string|null} patronId
   * @returns {number}
   */
  const getTotalAcomptesJusqua = useCallback(
    (dateFin, patronId = null) => {
      if (!dateFin) return 0;

      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];

      let filtered = acomptesArray.filter((ac) => {
        if (!ac?.date_acompte) return false;
        return ac.date_acompte <= dateFin; // cumul jusqu'à date incluse
      });

      if (patronId) {
        filtered = filtered.filter((ac) => ac?.patron_id === patronId);
      }

      return filtered.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [listeAcomptes]
  );

  /**
   * Calcule le solde des acomptes avant une date donnée
   * @param {string} dateRef - Date de référence (format ISO)
   * @param {string|null} patronId - ID du patron pour filtrage (optionnel)
   * @returns {number} - Solde calculé
   */
  const getSoldeAvant = useCallback(
    (dateRef, patronId = null) => {
      if (!dateRef) return 0;

      // Sécuriser les tableaux
      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      // Filtrer par patron si spécifié
      const acomptesFiltres = patronId
        ? acomptesArray.filter((a) => a?.patron_id === patronId)
        : acomptesArray;

      const missionsFiltrees = patronId
        ? missionsArray.filter((m) => m?.patron_id === patronId)
        : missionsArray;

      const fraisFiltres = patronId
        ? fraisArray.filter((f) => f?.patron_id === patronId)
        : fraisArray;

      return calculerSoldeAcomptesAvant(
        dateRef,
        acomptesFiltres,
        missionsFiltrees,
        fraisFiltres
      );
    },
    [listeAcomptes, missions, fraisDivers]
  );

  /**
   * Calcule le total des acomptes dans une période donnée
   * @param {string} dateDebut - Date de début (format ISO)
   * @param {string} dateFin - Date de fin (format ISO)
   * @param {string|null} patronId - ID du patron pour filtrage (optionnel)
   * @returns {number} - Total des acomptes dans la période
   */
  const getAcomptesDansPeriode = useCallback(
    (dateDebut, dateFin, patronId = null) => {
      if (!dateDebut || !dateFin) return 0;

      // Sécuriser le tableau
      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];

      // Filtrer par période
      let filtered = acomptesArray.filter((ac) => {
        if (!ac?.date_acompte) return false;
        return ac.date_acompte >= dateDebut && ac.date_acompte <= dateFin;
      });

      // Filtrer par patron si spécifié
      if (patronId) {
        filtered = filtered.filter((ac) => ac?.patron_id === patronId);
      }

      // Calculer le total
      return filtered.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [listeAcomptes]
  );

  /**
   * Calcule le solde total actuel des acomptes
   * @param {string|null} patronId - ID du patron pour filtrage (optionnel)
   * @returns {number} - Solde total
   */
  const getSoldeTotal = useCallback(
    (patronId = null) => {
      // Sécuriser les tableaux
      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      // Filtrer par patron si spécifié
      const acomptesFiltres = patronId
        ? acomptesArray.filter((a) => a?.patron_id === patronId)
        : acomptesArray;

      const missionsFiltrees = patronId
        ? missionsArray.filter((m) => m?.patron_id === patronId)
        : missionsArray;

      const fraisFiltres = patronId
        ? fraisArray.filter((f) => f?.patron_id === patronId)
        : fraisArray;

      // Calculer le total des acomptes
      const totalAcomptes = acomptesFiltres.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);

      // Calculer le total des dépenses (missions + frais)
      const totalMissions = missionsFiltrees.reduce((sum, m) => {
        return sum + (m?.montant || 0);
      }, 0);

      const totalFrais = fraisFiltres.reduce((sum, f) => {
        const montant = parseFloat(f?.montant) || 0;
        return sum + montant;
      }, 0);

      const totalDepenses = totalMissions + totalFrais;

      return Math.max(0, totalAcomptes - totalDepenses);
    },
    [listeAcomptes, missions, fraisDivers]
  );

  /**
   * Récupère les acomptes filtrés par patron
   * @param {string|null} patronId - ID du patron (null = tous)
   * @returns {Array} - Liste des acomptes filtrés
   */
  const getAcomptesByPatron = useCallback(
    (patronId = null) => {
      if (!patronId) return listeAcomptes;

      return listeAcomptes.filter((a) => a?.patron_id === patronId);
    },
    [listeAcomptes]
  );

  return {
    listeAcomptes,
    loading,
    fetchAcomptes,
    createAcompte,
    deleteAcompte,

    // ✅ Ajout
    getTotalAcomptesJusqua,

    // Existants
    getSoldeAvant,
    getAcomptesDansPeriode,
    getSoldeTotal,
    getAcomptesByPatron,
  };
};

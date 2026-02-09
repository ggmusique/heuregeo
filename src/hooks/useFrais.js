import { useState, useCallback, useRef } from "react";
import * as fraisApi from "../services/api/fraisApi";
import { getWeekNumber } from "../utils/dateUtils";

/**
 * Hook complet pour gérer les frais divers - Multi-Patrons
 * @param {Function} onError - Callback en cas d'erreur
 */
export const useFrais = (onError) => {
  const [fraisDivers, setFraisDivers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref pour éviter les appels multiples
  const isFetching = useRef(false);

  /**
   * Récupère tous les frais depuis l'API
   */
  const fetchFrais = useCallback(async () => {
    // Éviter les appels multiples
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      const data = await fraisApi.fetchFrais();
      setFraisDivers(data || []);
      return data || [];
    } catch (err) {
      console.error("Erreur fetch frais:", err);
      onError?.("Erreur chargement frais");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  /**
   * Crée un nouveau frais
   * @param {Object} fraisData - Données du frais
   */
  const createFrais = useCallback(
    async (fraisData) => {
      if (!fraisData) {
        throw new Error("Données du frais manquantes");
      }

      try {
        setLoading(true);
        const newFrais = await fraisApi.createFrais(fraisData);

        if (newFrais) {
          setFraisDivers((prev) =>
            [...prev, newFrais].sort((a, b) =>
              (a.date_frais || "").localeCompare(b.date_frais || "")
            )
          );
        }

        return newFrais;
      } catch (err) {
        console.error("Erreur création frais:", err);
        onError?.("Erreur création frais");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Met à jour un frais existant
   * @param {string} id - ID du frais
   * @param {Object} fraisData - Nouvelles données
   */
  const updateFrais = useCallback(
    async (id, fraisData) => {
      if (!id) {
        throw new Error("ID du frais manquant");
      }

      if (!fraisData) {
        throw new Error("Données du frais manquantes");
      }

      try {
        setLoading(true);
        const updated = await fraisApi.updateFrais(id, fraisData);

        if (updated) {
          setFraisDivers((prev) =>
            prev
              .map((f) => (f.id === id ? updated : f))
              .sort((a, b) =>
                (a.date_frais || "").localeCompare(b.date_frais || "")
              )
          );
        }

        return updated;
      } catch (err) {
        console.error("Erreur mise à jour frais:", err);
        onError?.("Erreur mise à jour frais");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Supprime un frais
   * @param {string} id - ID du frais à supprimer
   */
  const deleteFrais = useCallback(
    async (id) => {
      if (!id) {
        throw new Error("ID du frais manquant");
      }

      try {
        setLoading(true);
        await fraisApi.deleteFrais(id);
        setFraisDivers((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error("Erreur suppression frais:", err);
        onError?.("Erreur suppression frais");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * Filtre les frais par semaine
   * @param {number} weekNumber - Numéro de semaine
   * @param {string|null} patronId - ID du patron (optionnel)
   * @returns {Array} - Frais de la semaine
   */
  const getFraisByWeek = useCallback(
    (weekNumber, patronId = null) => {
      if (!weekNumber) return [];

      // Sécuriser le tableau
      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      let filtered = fraisArray.filter((f) => {
        if (!f?.date_frais) return false;
        try {
          return getWeekNumber(new Date(f.date_frais)) === weekNumber;
        } catch {
          return false;
        }
      });

      // Filtrer par patron si spécifié
      if (patronId) {
        filtered = filtered.filter((f) => f?.patron_id === patronId);
      }

      return filtered;
    },
    [fraisDivers]
  );

  /**
   * Calcule le total des frais
   * @param {Array} fraisList - Liste des frais (défaut: tous les frais)
   * @returns {number} - Total des frais
   */
  const getTotalFrais = useCallback(
    (fraisList) => {
      // Utiliser la liste passée ou tous les frais
      const list = Array.isArray(fraisList) ? fraisList : fraisDivers;

      return list.reduce((sum, f) => {
        const montant = parseFloat(f?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [fraisDivers]
  );

  /**
   * Récupère les frais filtrés par patron
   * @param {string|null} patronId - ID du patron (null = tous)
   * @returns {Array} - Liste des frais filtrés
   */
  const getFraisByPatron = useCallback(
    (patronId = null) => {
      if (!patronId) return fraisDivers;

      return fraisDivers.filter((f) => f?.patron_id === patronId);
    },
    [fraisDivers]
  );

  return {
    fraisDivers,
    loading,
    fetchFrais,
    createFrais,
    updateFrais,
    deleteFrais,
    getFraisByWeek,
    getTotalFrais,
    getFraisByPatron, // Nouvelle fonction utile
  };
};

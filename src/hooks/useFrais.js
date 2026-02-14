import { useState, useCallback, useRef } from "react";
import * as fraisApi from "../services/api/fraisApi";
import { getWeekNumber } from "../utils/dateUtils";

/**
 * Hook complet pour gérer les frais divers - Multi-Patrons
 *
 * 👉 Son boulot :
 * - Charger les frais depuis Supabase (via fraisApi)
 * - Ajouter / modifier / supprimer des frais
 * - Donner des "outils" à App.jsx pour filtrer et calculer (semaine, total, patron)
 *
 * App.jsx -> useFrais -> fraisApi -> Supabase
 */
export const useFrais = (onError) => {
  // ------------------------------------------------------------
  // 1) ÉTAT LOCAL DU HOOK (ce que ce hook "stocke" en mémoire)
  // ------------------------------------------------------------
  const [fraisDivers, setFraisDivers] = useState([]); // la liste des frais (table frais_divers)
  const [loading, setLoading] = useState(false);      // indicateur "chargement en cours"

  // Ref pour éviter les appels multiples (ex: double clic ou double useEffect)
  const isFetching = useRef(false);

  // ------------------------------------------------------------
  // 2) LIRE : Charger TOUS les frais depuis Supabase
  // ------------------------------------------------------------
  const fetchFrais = useCallback(async () => {
    // ✅ anti-double appel (sinon tu peux spam l'API)
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);

      // Appel à l’API (qui elle appelle Supabase)
      const data = await fraisApi.fetchFrais();

      // Stockage en mémoire dans le state
      setFraisDivers(data || []);

      return data || [];
    } catch (err) {
      console.error("Erreur fetch frais:", err);

      // Message pour l’utilisateur (via triggerAlert dans App.jsx)
      onError?.("Erreur chargement frais");

      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  // ------------------------------------------------------------
  // 3) CRÉER : Ajouter un nouveau frais
  // ------------------------------------------------------------
  const createFrais = useCallback(
    async (fraisData) => {
      // ✅ sécurité : si on appelle sans data
      if (!fraisData) {
        throw new Error("Données du frais manquantes");
      }

      try {
        setLoading(true);

        // Appel Supabase via l’API
        const newFrais = await fraisApi.createFrais(fraisData);

        if (newFrais) {
          // On ajoute le nouveau frais dans la liste locale
          // + on trie par date (ordre chronologique)
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

  // ------------------------------------------------------------
  // 4) MODIFIER : Mettre à jour un frais existant
  // ------------------------------------------------------------
  const updateFrais = useCallback(
    async (id, fraisData) => {
      // ✅ sécurités
      if (!id) throw new Error("ID du frais manquant");
      if (!fraisData) throw new Error("Données du frais manquantes");

      try {
        setLoading(true);

        // Appel Supabase via l’API
        const updated = await fraisApi.updateFrais(id, fraisData);

        if (updated) {
          // On remplace l'ancien frais par le nouveau dans la liste
          // puis on re-trie par date
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

  // ------------------------------------------------------------
  // 5) SUPPRIMER : Enlever un frais
  // ------------------------------------------------------------
  const deleteFrais = useCallback(
    async (id) => {
      if (!id) throw new Error("ID du frais manquant");

      try {
        setLoading(true);

        // Supprime côté DB
        await fraisApi.deleteFrais(id);

        // Supprime côté mémoire (UI)
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

  // ------------------------------------------------------------
  // 6) OUTIL : Récupérer les frais d'une semaine donnée
  // ------------------------------------------------------------
  const getFraisByWeek = useCallback(
    (weekNumber, patronId = null) => {
      if (!weekNumber) return [];

      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      // On garde uniquement les frais dont la date tombe dans la bonne semaine ISO
      let filtered = fraisArray.filter((f) => {
        if (!f?.date_frais) return false;
        try {
          return getWeekNumber(new Date(f.date_frais)) === weekNumber;
        } catch {
          return false;
        }
      });

      // Option : filtrer par patron si demandé
      if (patronId) {
        filtered = filtered.filter((f) => f?.patron_id === patronId);
      }

      return filtered;
    },
    [fraisDivers]
  );

  // ------------------------------------------------------------
  // 7) OUTIL : Calculer le total € des frais
  // ------------------------------------------------------------
  const getTotalFrais = useCallback(
    (fraisList) => {
      // Si on fournit une liste -> on calcule dessus
      // Sinon -> on calcule sur TOUS les frais
      const list = Array.isArray(fraisList) ? fraisList : fraisDivers;

      return list.reduce((sum, f) => {
        const montant = parseFloat(f?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [fraisDivers]
  );

  // ------------------------------------------------------------
  // 8) OUTIL : Récupérer les frais par patron (tous les frais d'un patron)
  // ------------------------------------------------------------
  const getFraisByPatron = useCallback(
    (patronId = null) => {
      if (!patronId) return fraisDivers;
      return fraisDivers.filter((f) => f?.patron_id === patronId);
    },
    [fraisDivers]
  );

  // ------------------------------------------------------------
  // 9) Ce que App.jsx reçoit quand il appelle useFrais(...)
  // ------------------------------------------------------------
  return {
    fraisDivers,       // la liste des frais (affichage, bilans, etc.)
    loading,           // pour afficher un loader

    fetchFrais,        // charge tout depuis DB
    createFrais,       // ajoute un frais
    updateFrais,       // modifie un frais
    deleteFrais,       // supprime un frais

    getFraisByWeek,    // filtre pour le bilan semaine
    getTotalFrais,     // somme des montants
    getFraisByPatron,  // filtre par patron
  };
};

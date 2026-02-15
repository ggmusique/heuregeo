import { useState, useCallback, useRef } from "react";
import * as lieuxApi from "../services/api/lieuxApi";

/**
 * ✅ Hook pour gérer les lieux
 * 
 * Ajout : createLieu retourne maintenant le lieu créé pour auto-sélection
 */
export const useLieux = (onError) => {
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFetching = useRef(false);

  // ========= FETCH (READ) =========
  const fetchLieux = useCallback(async () => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);

      const data = await lieuxApi.fetchLieux();
      setLieux(data || []);

      return data || [];
    } catch (err) {
      console.error("Erreur fetch lieux:", err);
      onError?.("Erreur chargement lieux");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  // ========= CREATE =========
  const createLieu = useCallback(
    async (lieuData) => {
      if (!lieuData) {
        throw new Error("Données du lieu manquantes");
      }

      try {
        setLoading(true);

        const newLieu = await lieuxApi.createLieu(lieuData);

        if (newLieu) {
          setLieux((prev) => [newLieu, ...prev]);
        }

        // ✅ IMPORTANT : Retourner le lieu créé pour auto-sélection
        return newLieu;
      } catch (err) {
        console.error("Erreur création lieu:", err);
        onError?.("Erreur création lieu");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  // ========= UPDATE =========
  const updateLieu = useCallback(
    async (id, lieuData) => {
      if (!id) throw new Error("ID du lieu manquant");
      if (!lieuData) throw new Error("Données du lieu manquantes");

      try {
        setLoading(true);

        const updated = await lieuxApi.updateLieu(id, lieuData);

        if (updated) {
          setLieux((prev) => prev.map((l) => (l.id === id ? updated : l)));
        }

        return updated;
      } catch (err) {
        console.error("Erreur mise à jour lieu:", err);
        onError?.("Erreur mise à jour lieu");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  // ========= DELETE =========
  const deleteLieu = useCallback(
    async (id) => {
      if (!id) throw new Error("ID du lieu manquant");

      try {
        setLoading(true);

        await lieuxApi.deleteLieu(id);
        setLieux((prev) => prev.filter((l) => l.id !== id));
      } catch (err) {
        console.error("Erreur suppression lieu:", err);
        onError?.("Erreur suppression lieu");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  return {
    lieux,
    loading,
    fetchLieux,
    createLieu,    // ✅ Retourne le lieu créé
    updateLieu,
    deleteLieu,
  };
};
import { useState, useCallback, useRef } from "react";
import * as fraisApi from "../services/api/fraisApi";
import { getWeekNumber } from "../utils/dateUtils";
import type { FraisDivers } from "../types/entities";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseFraisReturn {
  fraisDivers: FraisDivers[];
  loading: boolean;
  fetchFrais: () => Promise<FraisDivers[]>;
  createFrais: (fraisData: Partial<FraisDivers>) => Promise<FraisDivers>;
  updateFrais: (id: string, fraisData: Partial<FraisDivers>) => Promise<FraisDivers>;
  deleteFrais: (id: string) => Promise<void>;
  getFraisByWeek: (weekNumber: number, patronId?: string | null) => FraisDivers[];
  getTotalFrais: (fraisList?: FraisDivers[]) => number;
  getFraisByPatron: (patronId?: string | null) => FraisDivers[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

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
export const useFrais = (onError?: (msg: string) => void): UseFraisReturn => {
  const [fraisDivers, setFraisDivers] = useState<FraisDivers[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const isFetching = useRef<boolean>(false);

  const fetchFrais = useCallback(async (): Promise<FraisDivers[]> => {
    if (isFetching.current) return [];

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

  const createFrais = useCallback(
    async (fraisData: Partial<FraisDivers>): Promise<FraisDivers> => {
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

  const updateFrais = useCallback(
    async (id: string, fraisData: Partial<FraisDivers>): Promise<FraisDivers> => {
      if (!id) throw new Error("ID du frais manquant");
      if (!fraisData) throw new Error("Données du frais manquantes");

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

  const deleteFrais = useCallback(
    async (id: string): Promise<void> => {
      if (!id) throw new Error("ID du frais manquant");

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

  const getFraisByWeek = useCallback(
    (weekNumber: number, patronId: string | null = null): FraisDivers[] => {
      if (!weekNumber) return [];

      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      let filtered = fraisArray.filter((f) => {
        if (!f?.date_frais) return false;
        try {
          return getWeekNumber(new Date(f.date_frais)) === weekNumber;
        } catch {
          return false;
        }
      });

      if (patronId) {
        filtered = filtered.filter((f) => f?.patron_id === patronId);
      }

      return filtered;
    },
    [fraisDivers]
  );

  const getTotalFrais = useCallback(
    (fraisList?: FraisDivers[]): number => {
      const list = Array.isArray(fraisList) ? fraisList : fraisDivers;
      return list.reduce((sum, f) => {
        const montant = parseFloat(String(f?.montant)) || 0;
        return sum + montant;
      }, 0);
    },
    [fraisDivers]
  );

  const getFraisByPatron = useCallback(
    (patronId: string | null = null): FraisDivers[] => {
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
    getFraisByPatron,
  };
};

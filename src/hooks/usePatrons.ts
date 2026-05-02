import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Patron } from "../types/entities";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UsePatronsReturn {
  patrons: Patron[];
  loading: boolean;
  fetchPatrons: () => Promise<Patron[]>;
  createPatron: (patronData: Partial<Patron>) => Promise<Patron>;
  updatePatron: (patronId: string, patronData: Partial<Patron>) => Promise<Patron>;
  deletePatron: (patronId: string) => Promise<void>;
  getPatronById: (patronId: string | null | undefined) => Patron | null;
  getPatronColor: (patronId: string | null | undefined) => string;
  getPatronNom: (patronId: string | null | undefined) => string;
  patronExists: (patronId: string) => boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook personnalisé pour gérer les patrons
 * CRUD + helpers (nom/couleur/existence)
 */
export function usePatrons(triggerAlert?: (msg: string) => void): UsePatronsReturn {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPatrons = useCallback(async (): Promise<Patron[]> => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { data, error } = await supabase
        .from("patrons")
        .select("*")
        .eq("actif", true)
        .eq("user_id", user.id)
        .order("nom", { ascending: true });

      if (error) throw error;

      setPatrons(data || []);
      return data || [];
    } catch (err) {
      console.error("Erreur récupération patrons:", err);
      triggerAlert?.(
        "Erreur chargement patrons : " + ((err as Error)?.message || "Erreur inconnue")
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  const createPatron = useCallback(async (patronData: Partial<Patron>): Promise<Patron> => {
    try {
      setLoading(true);

      if (!patronData?.nom || !patronData.nom.trim()) {
        throw new Error("Le nom du patron est obligatoire");
      }

      const nom = patronData.nom.trim();
      const tauxNum = parseFloat(String(patronData.taux_horaire));
      const taux_horaire =
        patronData.taux_horaire != null && !isNaN(tauxNum) ? tauxNum : null;
      const couleur = patronData.couleur || "#8b5cf6";

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { data, error } = await supabase
        .from("patrons")
        .insert([
          {
            nom,
            taux_horaire,
            couleur,
            actif: true,
            user_id: user.id,
            adresse: patronData.adresse ?? null,
            code_postal: patronData.code_postal ?? null,
            ville: patronData.ville ?? null,
            telephone: patronData.telephone ?? null,
            email: patronData.email ?? null,
            siret: patronData.siret ?? null,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un patron avec ce nom existe déjà");
        }
        throw error;
      }

      setPatrons((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur création patron:", err);
      throw new Error((err as Error)?.message || "Impossible de créer le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePatron = useCallback(async (patronId: string, patronData: Partial<Patron>): Promise<Patron> => {
    try {
      setLoading(true);

      if (!patronId) throw new Error("ID du patron manquant");

      if (!patronData?.nom || !patronData.nom.trim()) {
        throw new Error("Le nom du patron est obligatoire");
      }

      const nom = patronData.nom.trim();
      const tauxNum = parseFloat(String(patronData.taux_horaire));
      const taux_horaire =
        patronData.taux_horaire != null && !isNaN(tauxNum) ? tauxNum : null;
      const couleur = patronData.couleur || "#8b5cf6";

      const { data, error } = await supabase
        .from("patrons")
        .update({
          nom,
          taux_horaire,
          couleur,
          adresse: patronData.adresse ?? null,
          code_postal: patronData.code_postal ?? null,
          ville: patronData.ville ?? null,
          telephone: patronData.telephone ?? null,
          email: patronData.email ?? null,
          siret: patronData.siret ?? null,
        })
        .eq("id", patronId)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un patron avec ce nom existe déjà");
        }
        throw error;
      }

      setPatrons((prev) =>
        prev
          .map((p) => (p.id === patronId ? data : p))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur modification patron:", err);
      throw new Error((err as Error)?.message || "Impossible de modifier le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePatron = useCallback(async (patronId: string): Promise<void> => {
    try {
      setLoading(true);

      if (!patronId) throw new Error("ID du patron manquant");

      const { error } = await supabase
        .from("patrons")
        .update({ actif: false })
        .eq("id", patronId);

      if (error) throw error;

      setPatrons((prev) => prev.filter((p) => p.id !== patronId));
    } catch (err) {
      console.error("Erreur suppression patron:", err);
      throw new Error((err as Error)?.message || "Impossible de supprimer le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatronById = useCallback(
    (patronId: string | null | undefined): Patron | null =>
      patrons.find((p) => p.id === patronId) || null,
    [patrons]
  );

  const getPatronColor = useCallback(
    (patronId: string | null | undefined): string =>
      getPatronById(patronId)?.couleur || "#8b5cf6",
    [getPatronById]
  );

  const getPatronNom = useCallback(
    (patronId: string | null | undefined): string =>
      getPatronById(patronId)?.nom || "Non assigné",
    [getPatronById]
  );

  const patronExists = useCallback(
    (patronId: string): boolean => patrons.some((p) => p.id === patronId),
    [patrons]
  );

  useEffect(() => {
    fetchPatrons();
  }, [fetchPatrons]);

  return {
    patrons,
    loading,
    fetchPatrons,
    createPatron,
    updatePatron,
    deletePatron,
    getPatronById,
    getPatronColor,
    getPatronNom,
    patronExists,
  };
}

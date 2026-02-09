import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook personnalisé pour gérer les patrons
 */
export function usePatrons(triggerAlert) {
  const [patrons, setPatrons] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Récupérer tous les patrons actifs
   */
  const fetchPatrons = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patrons")
        .select("*")
        .eq("actif", true)
        .order("nom", { ascending: true });

      if (error) throw error;

      setPatrons(data || []);
    } catch (err) {
      console.error("Erreur récupération patrons:", err);
      triggerAlert(
        "Erreur chargement patrons : " + (err?.message || "Erreur inconnue")
      );
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  /**
   * Créer un nouveau patron
   */
  const createPatron = useCallback(async (patronData) => {
    try {
      const { data, error } = await supabase
        .from("patrons")
        .insert([
          {
            nom: patronData.nom,
            taux_horaire: patronData.tauxHoraire || null,
            couleur: patronData.couleur || "#8b5cf6",
            actif: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setPatrons((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );
      return data;
    } catch (err) {
      console.error("Erreur création patron:", err);
      throw new Error(err?.message || "Impossible de créer le patron");
    }
  }, []);

  /**
   * Modifier un patron existant
   */
  const updatePatron = useCallback(async (patronId, patronData) => {
    try {
      const { data, error } = await supabase
        .from("patrons")
        .update({
          nom: patronData.nom,
          taux_horaire: patronData.tauxHoraire || null,
          couleur: patronData.couleur || "#8b5cf6",
        })
        .eq("id", patronId)
        .select()
        .single();

      if (error) throw error;

      setPatrons((prev) =>
        prev
          .map((p) => (p.id === patronId ? data : p))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );
      return data;
    } catch (err) {
      console.error("Erreur modification patron:", err);
      throw new Error(err?.message || "Impossible de modifier le patron");
    }
  }, []);

  /**
   * Désactiver un patron (soft delete)
   */
  const deletePatron = useCallback(async (patronId) => {
    try {
      const { error } = await supabase
        .from("patrons")
        .update({ actif: false })
        .eq("id", patronId);

      if (error) throw error;

      setPatrons((prev) => prev.filter((p) => p.id !== patronId));
    } catch (err) {
      console.error("Erreur suppression patron:", err);
      throw new Error(err?.message || "Impossible de supprimer le patron");
    }
  }, []);

  /**
   * Récupérer un patron par son ID
   */
  const getPatronById = useCallback(
    (patronId) => {
      return patrons.find((p) => p.id === patronId) || null;
    },
    [patrons]
  );

  /**
   * Obtenir la couleur d'un patron
   */
  const getPatronColor = useCallback(
    (patronId) => {
      const patron = getPatronById(patronId);
      return patron?.couleur || "#8b5cf6";
    },
    [getPatronById]
  );

  /**
   * Obtenir le nom d'un patron
   */
  const getPatronNom = useCallback(
    (patronId) => {
      const patron = getPatronById(patronId);
      return patron?.nom || "Non assigné";
    },
    [getPatronById]
  );

  /**
   * Vérifier si un patron existe
   */
  const patronExists = useCallback(
    (patronId) => {
      return patrons.some((p) => p.id === patronId);
    },
    [patrons]
  );

  // Charger les patrons au montage
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

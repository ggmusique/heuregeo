import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook personnalisé pour gérer les patrons
 * CRUD + helpers (nom/couleur/existence)
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
      return data || [];
    } catch (err) {
      console.error("Erreur récupération patrons:", err);
      triggerAlert?.(
        "Erreur chargement patrons : " + (err?.message || "Erreur inconnue")
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  /**
   * Créer un nouveau patron
   * @param {Object} patronData - { nom, tauxHoraire, couleur }
   */
  const createPatron = useCallback(async (patronData) => {
    try {
      setLoading(true);

      // ✅ Validation: nom obligatoire
      if (!patronData?.nom || !patronData.nom.trim()) {
        throw new Error("Le nom du patron est obligatoire");
      }

      // ✅ Normalisation des champs
      const nom = patronData.nom.trim();
      const tauxNum = parseFloat(patronData.tauxHoraire);
      const taux_horaire =
        patronData.tauxHoraire !== "" && !isNaN(tauxNum) ? tauxNum : null;

      const couleur = patronData.couleur || "#8b5cf6";

      const { data, error } = await supabase
        .from("patrons")
        .insert([
          {
            nom,
            taux_horaire,
            couleur,
            actif: true,
          },
        ])
        .select()
        .single();

      if (error) {
        // ✅ Gestion doublon (unique constraint)
        if (error.code === "23505") {
          throw new Error("Un patron avec ce nom existe déjà");
        }
        throw error;
      }

      // ✅ Ajout + tri (ordre alpha)
      setPatrons((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur création patron:", err);
      throw new Error(err?.message || "Impossible de créer le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Modifier un patron existant
   * @param {string} patronId
   * @param {Object} patronData - { nom, tauxHoraire, couleur }
   */
  const updatePatron = useCallback(async (patronId, patronData) => {
    try {
      setLoading(true);

      if (!patronId) throw new Error("ID du patron manquant");

      // ✅ Validation: nom obligatoire
      if (!patronData?.nom || !patronData.nom.trim()) {
        throw new Error("Le nom du patron est obligatoire");
      }

      const nom = patronData.nom.trim();
      const tauxNum = parseFloat(patronData.tauxHoraire);
      const taux_horaire =
        patronData.tauxHoraire !== "" && !isNaN(tauxNum) ? tauxNum : null;

      const couleur = patronData.couleur || "#8b5cf6";

      const { data, error } = await supabase
        .from("patrons")
        .update({
          nom,
          taux_horaire,
          couleur,
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

      // ✅ Update + tri
      setPatrons((prev) =>
        prev
          .map((p) => (p.id === patronId ? data : p))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur modification patron:", err);
      throw new Error(err?.message || "Impossible de modifier le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Désactiver un patron (soft delete)
   * @param {string} patronId
   */
  const deletePatron = useCallback(async (patronId) => {
    try {
      setLoading(true);

      if (!patronId) throw new Error("ID du patron manquant");

      const { error } = await supabase
        .from("patrons")
        .update({ actif: false })
        .eq("id", patronId);

      if (error) throw error;

      // ✅ Retirer de la liste locale
      setPatrons((prev) => prev.filter((p) => p.id !== patronId));
    } catch (err) {
      console.error("Erreur suppression patron:", err);
      throw new Error(err?.message || "Impossible de supprimer le patron");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Récupérer un patron par son ID
   */
  const getPatronById = useCallback(
    (patronId) => patrons.find((p) => p.id === patronId) || null,
    [patrons]
  );

  /**
   * Obtenir la couleur d'un patron (fallback violet)
   */
  const getPatronColor = useCallback(
    (patronId) => getPatronById(patronId)?.couleur || "#8b5cf6",
    [getPatronById]
  );

  /**
   * Obtenir le nom d'un patron (fallback)
   */
  const getPatronNom = useCallback(
    (patronId) => getPatronById(patronId)?.nom || "Non assigné",
    [getPatronById]
  );

  /**
   * Vérifier si un patron existe
   */
  const patronExists = useCallback(
    (patronId) => patrons.some((p) => p.id === patronId),
    [patrons]
  );

  /**
   * Charger les patrons au montage
   */
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

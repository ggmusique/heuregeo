import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook personnalisé pour gérer les lieux
 * CRUD complet + fonctions utilitaires
 */
export function useLieux(triggerAlert) {
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Récupérer tous les lieux actifs
   */
  const fetchLieux = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lieux")
        .select("*")
        .eq("actif", true)
        .order("nom", { ascending: true });

      if (error) throw error;
      setLieux(data || []);
    } catch (err) {
      console.error("Erreur chargement lieux:", err);
      triggerAlert?.("Erreur lors du chargement des lieux");
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  /**
   * Créer un nouveau lieu
   */
  const createLieu = useCallback(
    async (lieuData) => {
      try {
        setLoading(true);

        // Vérifier que le nom est fourni
        if (!lieuData.nom || !lieuData.nom.trim()) {
          throw new Error("Le nom du lieu est obligatoire");
        }

        const { data, error } = await supabase
          .from("lieux")
          .insert([
            {
              nom: lieuData.nom.trim(),
              adresse_complete: lieuData.adresse_complete?.trim() || null,
              latitude: lieuData.latitude || null,
              longitude: lieuData.longitude || null,
              notes: lieuData.notes?.trim() || null,
              actif: true,
            },
          ])
          .select()
          .single();

        if (error) {
          // Gérer l'erreur de doublon
          if (error.code === "23505") {
            throw new Error("Un lieu avec ce nom existe déjà");
          }
          throw error;
        }

        // Ajouter le nouveau lieu à la liste
        setLieux((prev) => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
        return data;
      } catch (err) {
        console.error("Erreur création lieu:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Mettre à jour un lieu existant
   */
  const updateLieu = useCallback(
    async (lieuId, lieuData) => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("lieux")
          .update({
            nom: lieuData.nom.trim(),
            adresse_complete: lieuData.adresse_complete?.trim() || null,
            latitude: lieuData.latitude || null,
            longitude: lieuData.longitude || null,
            notes: lieuData.notes?.trim() || null,
          })
          .eq("id", lieuId)
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            throw new Error("Un lieu avec ce nom existe déjà");
          }
          throw error;
        }

        // Mettre à jour dans la liste
        setLieux((prev) =>
          prev.map((l) => (l.id === lieuId ? data : l))
            .sort((a, b) => a.nom.localeCompare(b.nom))
        );
        return data;
      } catch (err) {
        console.error("Erreur mise à jour lieu:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Supprimer (désactiver) un lieu
   * Note: On ne supprime pas vraiment, on désactive pour garder l'historique
   */
  const deleteLieu = useCallback(
    async (lieuId) => {
      try {
        setLoading(true);

        const { error } = await supabase
          .from("lieux")
          .update({ actif: false })
          .eq("id", lieuId);

        if (error) throw error;

        // Retirer de la liste
        setLieux((prev) => prev.filter((l) => l.id !== lieuId));
      } catch (err) {
        console.error("Erreur suppression lieu:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtenir le nom d'un lieu par son ID
   */
  const getLieuNom = useCallback(
    (lieuId) => {
      if (!lieuId) return null;
      const lieu = lieux.find((l) => l.id === lieuId);
      return lieu?.nom || null;
    },
    [lieux]
  );

  /**
   * Obtenir les stats d'un lieu (nombre de missions)
   */
  const getLieuStats = useCallback(
    async (lieuId) => {
      try {
        const { data: missions, error } = await supabase
          .from("missions")
          .select("duree, montant")
          .eq("lieu_id", lieuId);

        if (error) throw error;

        const stats = {
          nombreMissions: missions.length,
          totalHeures: missions.reduce((sum, m) => sum + (m.duree || 0), 0),
          totalCA: missions.reduce((sum, m) => sum + (m.montant || 0), 0),
        };

        return stats;
      } catch (err) {
        console.error("Erreur stats lieu:", err);
        return { nombreMissions: 0, totalHeures: 0, totalCA: 0 };
      }
    },
    []
  );

  /**
   * Rechercher un lieu par nom (fuzzy search)
   */
  const searchLieux = useCallback(
    (searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return lieux;

      const term = searchTerm.toLowerCase().trim();
      return lieux.filter((lieu) =>
        lieu.nom.toLowerCase().includes(term) ||
        lieu.adresse_complete?.toLowerCase().includes(term)
      );
    },
    [lieux]
  );

  /**
   * Obtenir la position GPS actuelle et créer un lieu
   */
  const createLieuFromGPS = useCallback(
    async (nom, address) => {
      try {
        if ("geolocation" in navigator) {
          return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  const lieuData = {
                    nom,
                    adresse_complete: address,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  };
                  const lieu = await createLieu(lieuData);
                  resolve(lieu);
                } catch (err) {
                  reject(err);
                }
              },
              (error) => {
                reject(new Error("Impossible d'obtenir la position GPS"));
              }
            );
          });
        } else {
          throw new Error("Géolocalisation non disponible");
        }
      } catch (err) {
        console.error("Erreur création lieu GPS:", err);
        throw err;
      }
    },
    [createLieu]
  );

  /**
   * Charger les lieux au montage du composant
   */
  useEffect(() => {
    fetchLieux();
  }, [fetchLieux]);

  return {
    lieux,
    loading,
    fetchLieux,
    createLieu,
    updateLieu,
    deleteLieu,
    getLieuNom,
    getLieuStats,
    searchLieux,
    createLieuFromGPS,
  };
}
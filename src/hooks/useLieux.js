import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook personnalisé pour gérer les lieux
 * CRUD complet + fonctions utilitaires
 *
 * Patterns:
 * - loading global
 * - fetch au montage
 * - gestion doublons (23505)
 * - tri par nom (comme clients)
 * - helpers: getLieuNom / getLieuStats / searchLieux
 * - création depuis GPS (optionnel)
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
   * @param {Object} lieuData
   */
  const createLieu = useCallback(
    async (lieuData) => {
      try {
        setLoading(true);

        // ✅ Validation: nom obligatoire
        if (!lieuData?.nom || !lieuData.nom.trim()) {
          throw new Error("Le nom du lieu est obligatoire");
        }

        const payload = {
          nom: lieuData.nom.trim(),
          adresse_complete: lieuData.adresse_complete?.trim() || null,
          latitude: typeof lieuData.latitude === "number" ? lieuData.latitude : lieuData.latitude || null,
          longitude: typeof lieuData.longitude === "number" ? lieuData.longitude : lieuData.longitude || null,
          notes: lieuData.notes?.trim() || null,
          actif: true,
        };

        const { data, error } = await supabase
          .from("lieux")
          .insert([payload])
          .select()
          .single();

        if (error) {
          // ✅ Gestion doublon (unique constraint)
          if (error.code === "23505") {
            throw new Error("Un lieu avec ce nom existe déjà");
          }
          throw error;
        }

        // ✅ Ajouter + trier par nom
        setLieux((prev) =>
          [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
        );

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
   * @param {string} lieuId
   * @param {Object} lieuData
   */
  const updateLieu = useCallback(async (lieuId, lieuData) => {
    try {
      setLoading(true);

      if (!lieuId) throw new Error("ID du lieu manquant");
      if (!lieuData?.nom || !lieuData.nom.trim()) {
        throw new Error("Le nom du lieu est obligatoire");
      }

      const payload = {
        nom: lieuData.nom.trim(),
        adresse_complete: lieuData.adresse_complete?.trim() || null,
        latitude: typeof lieuData.latitude === "number" ? lieuData.latitude : lieuData.latitude || null,
        longitude: typeof lieuData.longitude === "number" ? lieuData.longitude : lieuData.longitude || null,
        notes: lieuData.notes?.trim() || null,
      };

      const { data, error } = await supabase
        .from("lieux")
        .update(payload)
        .eq("id", lieuId)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un lieu avec ce nom existe déjà");
        }
        throw error;
      }

      // ✅ Update dans la liste + tri
      setLieux((prev) =>
        prev
          .map((l) => (l.id === lieuId ? data : l))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur mise à jour lieu:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Supprimer (désactiver) un lieu
   * (On garde l'historique)
   * @param {string} lieuId
   */
  const deleteLieu = useCallback(async (lieuId) => {
    try {
      setLoading(true);

      if (!lieuId) throw new Error("ID du lieu manquant");

      const { error } = await supabase
        .from("lieux")
        .update({ actif: false })
        .eq("id", lieuId);

      if (error) throw error;

      // ✅ Retirer de la liste locale
      setLieux((prev) => prev.filter((l) => l.id !== lieuId));
    } catch (err) {
      console.error("Erreur suppression lieu:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtenir le nom d'un lieu par son ID
   * @param {string} lieuId
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
   * Obtenir les stats d'un lieu (nombre de missions, heures, CA)
   * @param {string} lieuId
   */
  const getLieuStats = useCallback(async (lieuId) => {
    try {
      if (!lieuId) return { nombreMissions: 0, totalHeures: 0, totalCA: 0 };

      const { data: missions, error } = await supabase
        .from("missions")
        .select("duree, montant")
        .eq("lieu_id", lieuId);

      if (error) throw error;

      return {
        nombreMissions: missions.length,
        totalHeures: missions.reduce((sum, m) => sum + (m.duree || 0), 0),
        totalCA: missions.reduce((sum, m) => sum + (m.montant || 0), 0),
      };
    } catch (err) {
      console.error("Erreur stats lieu:", err);
      return { nombreMissions: 0, totalHeures: 0, totalCA: 0 };
    }
  }, []);

  /**
   * Rechercher un lieu par nom / adresse (fuzzy)
   * @param {string} searchTerm
   */
  const searchLieux = useCallback(
    (searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return lieux;

      const term = searchTerm.toLowerCase().trim();
      return lieux.filter(
        (lieu) =>
          lieu.nom?.toLowerCase().includes(term) ||
          lieu.adresse_complete?.toLowerCase().includes(term)
      );
    },
    [lieux]
  );

  /**
   * Obtenir la position GPS actuelle et créer un lieu
   * @param {string} nom
   * @param {string} address
   */
  const createLieuFromGPS = useCallback(
    async (nom, address) => {
      if (!nom || !nom.trim()) throw new Error("Le nom du lieu est obligatoire");

      // ✅ Guard: geolocation dispo
      if (!("geolocation" in navigator)) {
        throw new Error("Géolocalisation non disponible");
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lieuData = {
                nom: nom.trim(),
                adresse_complete: address?.trim() || null,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };

              const lieu = await createLieu(lieuData);
              resolve(lieu);
            } catch (err) {
              reject(err);
            }
          },
          () => reject(new Error("Impossible d'obtenir la position GPS")),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    },
    [createLieu]
  );

  /**
   * Charger les lieux au montage
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

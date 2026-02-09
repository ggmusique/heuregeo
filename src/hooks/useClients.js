import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook personnalisé pour gérer les clients
 * CRUD complet + fonctions utilitaires
 */
export function useClients(triggerAlert) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Récupérer tous les clients actifs
   */
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("actif", true)
        .order("nom", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Erreur chargement clients:", err);
      triggerAlert?.("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  /**
   * Créer un nouveau client
   */
  const createClient = useCallback(async (clientData) => {
    try {
      setLoading(true);

      // Vérifier que le nom est fourni
      if (!clientData.nom || !clientData.nom.trim()) {
        throw new Error("Le nom du client est obligatoire");
      }

      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            nom: clientData.nom.trim(),
            contact: clientData.contact?.trim() || null,
            lieu_travail: clientData.lieu_travail?.trim() || null,
            notes: clientData.notes?.trim() || null,
            actif: true,
          },
        ])
        .select()
        .single();

      if (error) {
        // Gérer l'erreur de doublon
        if (error.code === "23505") {
          throw new Error("Un client avec ce nom existe déjà");
        }
        throw error;
      }

      // Ajouter le nouveau client à la liste
      setClients((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );
      return data;
    } catch (err) {
      console.error("Erreur création client:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mettre à jour un client existant
   */
  const updateClient = useCallback(async (clientId, clientData) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("clients")
        .update({
          nom: clientData.nom.trim(),
          contact: clientData.contact?.trim() || null,
          lieu_travail: clientData.lieu_travail?.trim() || null,
          notes: clientData.notes?.trim() || null,
        })
        .eq("id", clientId)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un client avec ce nom existe déjà");
        }
        throw error;
      }

      // Mettre à jour dans la liste
      setClients((prev) =>
        prev
          .map((c) => (c.id === clientId ? data : c))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );
      return data;
    } catch (err) {
      console.error("Erreur mise à jour client:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Supprimer (désactiver) un client
   * Note: On ne supprime pas vraiment, on désactive pour garder l'historique
   */
  const deleteClient = useCallback(async (clientId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("clients")
        .update({ actif: false })
        .eq("id", clientId);

      if (error) throw error;

      // Retirer de la liste
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (err) {
      console.error("Erreur suppression client:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtenir le nom d'un client par son ID
   */
  const getClientNom = useCallback(
    (clientId) => {
      if (!clientId) return null;
      const client = clients.find((c) => c.id === clientId);
      return client?.nom || null;
    },
    [clients]
  );

  /**
   * Obtenir les stats d'un client (nombre de missions, heures, CA)
   * Nécessite les missions pour calculer
   */
  const getClientStats = useCallback(async (clientId) => {
    try {
      const { data: missions, error } = await supabase
        .from("missions")
        .select("duree, montant")
        .eq("client_id", clientId);

      if (error) throw error;

      const stats = {
        nombreMissions: missions.length,
        totalHeures: missions.reduce((sum, m) => sum + (m.duree || 0), 0),
        totalCA: missions.reduce((sum, m) => sum + (m.montant || 0), 0),
      };

      return stats;
    } catch (err) {
      console.error("Erreur stats client:", err);
      return { nombreMissions: 0, totalHeures: 0, totalCA: 0 };
    }
  }, []);

  /**
   * Rechercher un client par nom (fuzzy search)
   */
  const searchClients = useCallback(
    (searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return clients;

      const term = searchTerm.toLowerCase().trim();
      return clients.filter((client) =>
        client.nom.toLowerCase().includes(term)
      );
    },
    [clients]
  );

  /**
   * Charger les clients au montage du composant
   */
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClientNom,
    getClientStats,
    searchClients,
  };
}

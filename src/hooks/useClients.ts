import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { Client } from "../types/entities";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientStats {
  nombreMissions: number;
  totalHeures: number;
  totalCA: number;
}

export interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  fetchClients: () => Promise<void>;
  createClient: (clientData: Partial<Client>) => Promise<Client>;
  updateClient: (clientId: string, clientData: Partial<Client>) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  getClientNom: (clientId: string | null | undefined) => string | null;
  getClientStats: (clientId: string) => Promise<ClientStats>;
  searchClients: (searchTerm: string) => Client[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook personnalisé pour gérer les clients
 *
 * 👉 Son boulot :
 * - Charger les clients (table "clients")
 * - Créer / modifier / désactiver un client (CRUD)
 * - Donner des fonctions utiles à App.jsx :
 *   - getClientNom(id) : retrouver le nom
 *   - searchClients("geo") : filtrer la liste en local
 *   - getClientStats(id) : stats en allant lire la table missions
 */
export function useClients(triggerAlert?: (msg: string) => void): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchClients = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setClients([]);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("actif", true)
        .eq("user_id", user.id)
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

  const createClient = useCallback(async (clientData: Partial<Client>): Promise<Client> => {
    try {
      setLoading(true);

      if (!clientData.nom || !clientData.nom.trim()) {
        throw new Error("Le nom du client est obligatoire");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            nom: clientData.nom.trim(),
            contact: clientData.contact?.trim() || null,
            lieu_travail: clientData.lieu_travail?.trim() || null,
            notes: clientData.notes?.trim() || null,
            actif: true,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un client avec ce nom existe déjà");
        }
        throw error;
      }

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

  const updateClient = useCallback(async (clientId: string, clientData: Partial<Client>): Promise<Client> => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("clients")
        .update({
          nom: clientData.nom!.trim(),
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

  const deleteClient = useCallback(async (clientId: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("clients")
        .update({ actif: false })
        .eq("id", clientId);

      if (error) throw error;

      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (err) {
      console.error("Erreur suppression client:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientNom = useCallback(
    (clientId: string | null | undefined): string | null => {
      if (!clientId) return null;
      const client = clients.find((c) => c.id === clientId);
      return client?.nom || null;
    },
    [clients]
  );

  const getClientStats = useCallback(async (clientId: string): Promise<ClientStats> => {
    try {
      const { data: missions, error } = await supabase
        .from("missions")
        .select("duree, montant")
        .eq("client_id", clientId);

      if (error) throw error;

      const stats: ClientStats = {
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

  const searchClients = useCallback(
    (searchTerm: string): Client[] => {
      if (!searchTerm || !searchTerm.trim()) return clients;
      const term = searchTerm.toLowerCase().trim();
      return clients.filter((client) =>
        client.nom.toLowerCase().includes(term)
      );
    },
    [clients]
  );

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

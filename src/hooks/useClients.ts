import { useState, useEffect, useCallback } from "react";
import { getCurrentUserOrNull } from "../services/authService";
import * as clientsApi from "../services/api/clientsApi";
import type { Client } from "../types/entities";
import type { ClientStats } from "../services/api/clientsApi";

// ─── Types ───────────────────────────────────────────────────────────────────


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

      const user = await getCurrentUserOrNull();
      if (!user) {
        setClients([]);
        return;
      }

      const data = await clientsApi.fetchClients(user.id);
      setClients(data);
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

      const user = await getCurrentUserOrNull();
      if (!user) throw new Error("Utilisateur non connecté");

      const data = await clientsApi.createClient({
        nom: clientData.nom.trim(),
        contact: clientData.contact?.trim() || null,
        lieu_travail: clientData.lieu_travail?.trim() || null,
        notes: clientData.notes?.trim() || null,
        actif: true,
        user_id: user.id,
      });

      setClients((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur création client:", err);
      if ((err as { code?: string })?.code === "23505") {
        throw new Error("Un client avec ce nom existe déjà");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (clientId: string, clientData: Partial<Client>): Promise<Client> => {
    try {
      setLoading(true);

      const data = await clientsApi.updateClient(clientId, {
        nom: clientData.nom!.trim(),
        contact: clientData.contact?.trim() || null,
        lieu_travail: clientData.lieu_travail?.trim() || null,
        notes: clientData.notes?.trim() || null,
      });

      setClients((prev) =>
        prev
          .map((c) => (c.id === clientId ? data : c))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur mise à jour client:", err);
      if ((err as { code?: string })?.code === "23505") {
        throw new Error("Un client avec ce nom existe déjà");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string): Promise<void> => {
    try {
      setLoading(true);

      await clientsApi.deleteClient(clientId);

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
      return await clientsApi.getClientStats(clientId);
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

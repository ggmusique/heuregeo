import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

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
export function useClients(triggerAlert) {
  // ------------------------------------------------------------
  // 1) ÉTATS LOCAUX DU HOOK
  // ------------------------------------------------------------
  const [clients, setClients] = useState([]);   // Liste des clients actifs en mémoire
  const [loading, setLoading] = useState(false); // Indique si une action est en cours

  // ------------------------------------------------------------
  // 2) LIRE : Charger tous les clients actifs
  // ------------------------------------------------------------
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);

      // 🔎 Lecture Supabase :
      // - table "clients"
      // - uniquement ceux qui sont actif = true
      // - triés par nom A -> Z
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("actif", true)
        .order("nom", { ascending: true });

      if (error) throw error;

      // On stocke dans le state -> l’UI se met à jour
      setClients(data || []);
    } catch (err) {
      console.error("Erreur chargement clients:", err);
      triggerAlert?.("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  }, [triggerAlert]);

  // ------------------------------------------------------------
  // 3) CRÉER : Ajouter un nouveau client
  // ------------------------------------------------------------
  const createClient = useCallback(async (clientData) => {
    try {
      setLoading(true);

      // ✅ sécurité : pas de nom vide
      if (!clientData.nom || !clientData.nom.trim()) {
        throw new Error("Le nom du client est obligatoire");
      }

      // Insertion Supabase (actif: true)
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
        .single(); // 👈 important : on veut 1 seul objet en retour

      if (error) {
        // ⚠️ Code 23505 = duplication (souvent "unique constraint")
        if (error.code === "23505") {
          throw new Error("Un client avec ce nom existe déjà");
        }
        throw error;
      }

      // On ajoute en mémoire + tri par nom
      setClients((prev) =>
        [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom))
      );

      return data;
    } catch (err) {
      console.error("Erreur création client:", err);
      throw err; // ⚠️ App.jsx gère l’alerte de ce throw
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------------
  // 4) MODIFIER : Mettre à jour un client existant
  // ------------------------------------------------------------
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

      // Remplace dans la liste mémoire + tri
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

  // ------------------------------------------------------------
  // 5) SUPPRIMER (soft delete) : Désactiver un client
  // ------------------------------------------------------------
  const deleteClient = useCallback(async (clientId) => {
    try {
      setLoading(true);

      // ⚠️ On ne supprime pas vraiment : on met actif=false
      // Ça garde l’historique et évite de casser des missions déjà enregistrées
      const { error } = await supabase
        .from("clients")
        .update({ actif: false })
        .eq("id", clientId);

      if (error) throw error;

      // En mémoire : on l’enlève de la liste visible
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (err) {
      console.error("Erreur suppression client:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------------
  // 6) OUTIL UI : Obtenir le nom d’un client via son ID
  // ------------------------------------------------------------
  const getClientNom = useCallback(
    (clientId) => {
      if (!clientId) return null;
      const client = clients.find((c) => c.id === clientId);
      return client?.nom || null;
    },
    [clients]
  );

  // ------------------------------------------------------------
  // 7) OUTIL "stats" : Calculer stats d’un client (requête missions)
  // ------------------------------------------------------------
  const getClientStats = useCallback(async (clientId) => {
    try {
      // On lit missions juste pour ce client
      const { data: missions, error } = await supabase
        .from("missions")
        .select("duree, montant")
        .eq("client_id", clientId);

      if (error) throw error;

      // On calcule quelques totaux
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

  // ------------------------------------------------------------
  // 8) RECHERCHE LOCALE : Filtrer la liste de clients en mémoire
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 9) Au démarrage : on charge les clients automatiquement
  // ------------------------------------------------------------
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ------------------------------------------------------------
  // 10) Ce que App.jsx récupère quand il fait: useClients(triggerAlert)
  // ------------------------------------------------------------
  return {
    clients,        // liste utilisée dans ClientsManager + MissionForm etc.
    loading,        // afficher un loader si besoin

    fetchClients,   // recharger manuellement
    createClient,   // bouton "ajouter client"
    updateClient,   // bouton "modifier"
    deleteClient,   // bouton "supprimer" (désactive)

    getClientNom,   // retrouver le nom via ID
    getClientStats, // stats client (si tu l'utilises dans une UI)
    searchClients,  // barre de recherche
  };
}

import { useState } from "react";
import { useLabels } from "../contexts/LabelsContext";
import type { Client } from "../types/entities";
import type { ConfirmFn } from "./useConfirm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseClientModalArgs {
  createClient: (data: Partial<Client>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  showConfirm: ConfirmFn;
}

export interface UseClientModalReturn {
  showClientModal: boolean;
  setShowClientModal: (v: boolean) => void;
  editingClientId: string | null;
  editingClientData: Client | null;
  handleClientSubmit: (clientData: Partial<Client>) => Promise<void>;
  handleClientEdit: (client: Client) => void;
  handleClientDelete: (client: Client) => Promise<void>;
  resetClientForm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useClientModal({ createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm }: UseClientModalArgs): UseClientModalReturn {
  const L = useLabels();
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientData, setEditingClientData] = useState<Client | null>(null);

  const resetClientForm = (): void => {
    setEditingClientId(null);
    setEditingClientData(null);
  };

  const handleClientSubmit = async (clientData: Partial<Client>): Promise<void> => {
    try {
      setLoading(true);
      if (editingClientId) { await updateClient(editingClientId, clientData); triggerAlert(`${L.client} modifié !`); }
      else { await createClient(clientData); triggerAlert(`${L.client} créé !`); }
      resetClientForm();
      setShowClientModal(false);
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleClientEdit = (client: Client): void => {
    setEditingClientId(client.id);
    setEditingClientData(client);
    setShowClientModal(true);
  };

  const handleClientDelete = async (client: Client): Promise<void> => {
    const confirmed = await showConfirm({ title: "Supprimer ce client", message: "Supprimer ce client ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteClient(client.id); triggerAlert(`${L.client} supprimé !`); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  return {
    showClientModal,
    setShowClientModal,
    editingClientId,
    editingClientData,
    handleClientSubmit,
    handleClientEdit,
    handleClientDelete,
    resetClientForm,
  };
}

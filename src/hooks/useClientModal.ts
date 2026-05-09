import { useState } from "react";
import { useLabels } from "../contexts/LabelsContext";
import type { Client } from "../types/entities";
import type { ConfirmFn } from "./useConfirm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseClientModalArgs {
  createClient: (data: Partial<Client>) => Promise<Client | void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<Client | void>;
  deleteClient: (id: string) => Promise<void>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  showConfirm: ConfirmFn;
}

export interface UseClientModalReturn {
  showClientModal: boolean;
  closeClientModal: () => void;
  openClientModal: () => void;
  isSaving: boolean;
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
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const resetClientForm = (): void => {
    setEditingClientId(null);
    setEditingClientData(null);
  };

  const closeClientModal = (): void => { setShowClientModal(false); resetClientForm(); };
  const openClientModal  = (): void => { resetClientForm(); setShowClientModal(true); };

  const handleClientSubmit = async (clientData: Partial<Client>): Promise<void> => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setLoading(true);
      if (editingClientId) { await updateClient(editingClientId, clientData); triggerAlert(`${L.client} modifi\u00e9 !`); }
      else { await createClient(clientData); triggerAlert(`${L.client} cr\u00e9\u00e9 !`); }
      closeClientModal();
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Operation echouee")); }
    finally { setLoading(false); setIsSaving(false); }
  };

  const handleClientEdit = (client: Client): void => {
    setEditingClientId(client.id);
    setEditingClientData(client);
    setShowClientModal(true);
  };

  const handleClientDelete = async (client: Client): Promise<void> => {
    if (isSaving) return;
    const confirmed = await showConfirm({ title: "Supprimer ce client", message: "Supprimer ce client ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setIsSaving(true); setLoading(true); await deleteClient(client.id); triggerAlert(`${L.client} supprim\u00e9 !`); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); setIsSaving(false); }
  };

  return {
    showClientModal,
    closeClientModal,
    openClientModal,
    isSaving,
    editingClientId,
    editingClientData,
    handleClientSubmit,
    handleClientEdit,
    handleClientDelete,
    resetClientForm,
  };
}

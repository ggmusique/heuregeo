import { useState } from "react";
import { useLabels } from "../contexts/LabelsContext";
import type { Patron } from "../types/entities";
import type { ConfirmFn } from "./useConfirm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UsePatronModalArgs {
  createPatron: (data: Partial<Patron>) => Promise<Patron | void>;
  updatePatron: (id: string, data: Partial<Patron>) => Promise<Patron | void>;
  deletePatron: (id: string) => Promise<void>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  showConfirm: ConfirmFn;
}

export interface UsePatronModalReturn {
  showPatronModal: boolean;
  closePatronModal: () => void;
  openPatronModal: () => void;
  isSaving: boolean;
  editingPatronId: string | null;
  editingPatronData: Patron | null;
  handlePatronSubmit: (patronData: Partial<Patron>) => Promise<void>;
  handlePatronEdit: (patron: Patron) => void;
  handlePatronDelete: (patron: Patron) => Promise<void>;
  resetPatronForm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePatronModal({ createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm }: UsePatronModalArgs): UsePatronModalReturn {
  const L = useLabels();
  const [showPatronModal, setShowPatronModal] = useState<boolean>(false);
  const [editingPatronId, setEditingPatronId] = useState<string | null>(null);
  const [editingPatronData, setEditingPatronData] = useState<Patron | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const resetPatronForm = (): void => {
    setEditingPatronId(null);
    setEditingPatronData(null);
  };

  const closePatronModal = (): void => { setShowPatronModal(false); resetPatronForm(); };
  const openPatronModal  = (): void => { resetPatronForm(); setShowPatronModal(true); };

  const handlePatronSubmit = async (patronData: Partial<Patron>): Promise<void> => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setLoading(true);
      if (editingPatronId) { await updatePatron(editingPatronId, patronData); triggerAlert(`${L.patron} modifi\u00e9 !`); }
      else { await createPatron(patronData); triggerAlert(`${L.patron} cr\u00e9\u00e9 !`); }
      closePatronModal();
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Operation echouee")); }
    finally { setLoading(false); setIsSaving(false); }
  };

  const handlePatronEdit = (patron: Patron): void => {
    setEditingPatronId(patron.id);
    setEditingPatronData(patron);
    setShowPatronModal(true);
  };

  const handlePatronDelete = async (patron: Patron): Promise<void> => {
    if (isSaving) return;
    const confirmed = await showConfirm({ title: "Supprimer ce patron", message: "Supprimer ce patron ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setIsSaving(true); setLoading(true); await deletePatron(patron.id); triggerAlert(`${L.patron} supprim\u00e9 !`); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); setIsSaving(false); }
  };

  return {
    showPatronModal,
    closePatronModal,
    openPatronModal,
    isSaving,
    editingPatronId,
    editingPatronData,
    handlePatronSubmit,
    handlePatronEdit,
    handlePatronDelete,
    resetPatronForm,
  };
}

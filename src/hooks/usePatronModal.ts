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
  setShowPatronModal: (v: boolean) => void;
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

  const resetPatronForm = (): void => {
    setEditingPatronId(null);
    setEditingPatronData(null);
  };

  const handlePatronSubmit = async (patronData: Partial<Patron>): Promise<void> => {
    try {
      setLoading(true);
      if (editingPatronId) { await updatePatron(editingPatronId, patronData); triggerAlert(`${L.patron} modifié !`); }
      else { await createPatron(patronData); triggerAlert(`${L.patron} créé !`); }
      resetPatronForm();
      setShowPatronModal(false);
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handlePatronEdit = (patron: Patron): void => {
    setEditingPatronId(patron.id);
    setEditingPatronData(patron);
    setShowPatronModal(true);
  };

  const handlePatronDelete = async (patron: Patron): Promise<void> => {
    const confirmed = await showConfirm({ title: "Supprimer ce patron", message: "Supprimer ce patron ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deletePatron(patron.id); triggerAlert(`${L.patron} supprimé !`); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  return {
    showPatronModal,
    setShowPatronModal,
    editingPatronId,
    editingPatronData,
    handlePatronSubmit,
    handlePatronEdit,
    handlePatronDelete,
    resetPatronForm,
  };
}

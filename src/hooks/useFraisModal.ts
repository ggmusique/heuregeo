import { useState } from "react";
import type { FraisDivers } from "../types/entities";
import type { ConfirmFn } from "./useBilanFilters";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseFraisModalArgs {
  createFrais: (data: Partial<FraisDivers>) => Promise<void>;
  updateFrais: (id: string, data: Partial<FraisDivers>) => Promise<void>;
  deleteFrais: (id: string) => Promise<void>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  showConfirm: ConfirmFn;
}

export interface UseFraisModalReturn {
  showFraisModal: boolean;
  setShowFraisModal: (v: boolean) => void;
  fraisDescription: string;
  setFraisDescription: (v: string) => void;
  fraisMontant: string;
  setFraisMontant: (v: string) => void;
  fraisDate: string;
  setFraisDate: (v: string) => void;
  editingFraisId: string | null;
  fraisPatronId: string | null;
  setFraisPatronId: (v: string | null) => void;
  handleFraisSubmit: () => Promise<void>;
  handleFraisEdit: (frais: FraisDivers) => void;
  handleFraisDelete: (frais: FraisDivers) => Promise<void>;
  resetFraisForm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFraisModal({ createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm }: UseFraisModalArgs): UseFraisModalReturn {
  const [showFraisModal, setShowFraisModal] = useState<boolean>(false);
  const [fraisDescription, setFraisDescription] = useState<string>("");
  const [fraisMontant, setFraisMontant] = useState<string>("");
  const [fraisDate, setFraisDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingFraisId, setEditingFraisId] = useState<string | null>(null);
  const [fraisPatronId, setFraisPatronId] = useState<string | null>(null);

  const resetFraisForm = (): void => {
    setFraisDescription("");
    setFraisMontant("");
    setFraisDate(new Date().toISOString().split("T")[0]);
    setEditingFraisId(null);
    setFraisPatronId(null);
  };

  const handleFraisSubmit = async (): Promise<void> => {
    const montant = parseFloat(fraisMontant);
    if (!fraisDescription.trim() || isNaN(montant) || montant <= 0) return triggerAlert("Remplis correctement les champs");
    if (!fraisPatronId) return triggerAlert("Selectionne un patron pour ce frais");
    try {
      setLoading(true);
      if (editingFraisId) { await updateFrais(editingFraisId, { description: fraisDescription.trim(), montant, date_frais: fraisDate, patron_id: fraisPatronId }); triggerAlert("Frais modifie !"); }
      else { await createFrais({ description: fraisDescription.trim(), montant, date_frais: fraisDate, patron_id: fraisPatronId }); triggerAlert("Frais ajoute !"); }
      resetFraisForm();
      setShowFraisModal(false);
    } catch { triggerAlert("Erreur operation frais"); }
    finally { setLoading(false); }
  };

  const handleFraisEdit = (frais: FraisDivers): void => {
    setEditingFraisId(frais.id);
    setFraisDescription(frais.description || "");
    setFraisMontant(frais.montant?.toString() || "");
    setFraisDate(frais.date_frais || new Date().toISOString().split("T")[0]);
    setFraisPatronId(frais.patron_id || null);
    setShowFraisModal(true);
  };

  const handleFraisDelete = async (frais: FraisDivers): Promise<void> => {
    const confirmed = await showConfirm({ title: "Supprimer ce frais", message: "Supprimer ce frais ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteFrais(frais.id); triggerAlert("Frais supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  return {
    showFraisModal,
    setShowFraisModal,
    fraisDescription,
    setFraisDescription,
    fraisMontant,
    setFraisMontant,
    fraisDate,
    setFraisDate,
    editingFraisId,
    fraisPatronId,
    setFraisPatronId,
    handleFraisSubmit,
    handleFraisEdit,
    handleFraisDelete,
    resetFraisForm,
  };
}

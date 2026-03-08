import { useState } from "react";

export function useFraisModal({ createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm }) {
  const [showFraisModal, setShowFraisModal] = useState(false);
  const [fraisDescription, setFraisDescription] = useState("");
  const [fraisMontant, setFraisMontant] = useState("");
  const [fraisDate, setFraisDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingFraisId, setEditingFraisId] = useState(null);
  const [fraisPatronId, setFraisPatronId] = useState(null);

  const resetFraisForm = () => {
    setFraisDescription("");
    setFraisMontant("");
    setFraisDate(new Date().toISOString().split("T")[0]);
    setEditingFraisId(null);
    setFraisPatronId(null);
  };

  const handleFraisSubmit = async () => {
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

  const handleFraisEdit = (frais) => {
    setEditingFraisId(frais.id);
    setFraisDescription(frais.description || "");
    setFraisMontant(frais.montant?.toString() || "");
    setFraisDate(frais.date_frais || new Date().toISOString().split("T")[0]);
    setFraisPatronId(frais.patron_id || null);
    setShowFraisModal(true);
  };

  const handleFraisDelete = async (frais) => {
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

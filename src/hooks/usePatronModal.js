import { useState } from "react";
import { useLabels } from "../contexts/LabelsContext";

export function usePatronModal({ createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm }) {
  const L = useLabels();
  const [showPatronModal, setShowPatronModal] = useState(false);
  const [editingPatronId, setEditingPatronId] = useState(null);
  const [editingPatronData, setEditingPatronData] = useState(null);

  const resetPatronForm = () => {
    setEditingPatronId(null);
    setEditingPatronData(null);
  };

  const handlePatronSubmit = async (patronData) => {
    try {
      setLoading(true);
      if (editingPatronId) { await updatePatron(editingPatronId, patronData); triggerAlert(`${L.patron} modifié !`); }
      else { await createPatron(patronData); triggerAlert(`${L.patron} créé !`); }
      resetPatronForm();
      setShowPatronModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handlePatronEdit = (patron) => {
    setEditingPatronId(patron.id);
    setEditingPatronData(patron);
    setShowPatronModal(true);
  };

  const handlePatronDelete = async (patron) => {
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

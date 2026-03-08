import { useState } from "react";
import { useLabels } from "../contexts/LabelsContext";

export function useClientModal({ createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm }) {
  const L = useLabels();
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientData, setEditingClientData] = useState(null);

  const resetClientForm = () => {
    setEditingClientId(null);
    setEditingClientData(null);
  };

  const handleClientSubmit = async (clientData) => {
    try {
      setLoading(true);
      if (editingClientId) { await updateClient(editingClientId, clientData); triggerAlert(`${L.client} modifié !`); }
      else { await createClient(clientData); triggerAlert(`${L.client} créé !`); }
      resetClientForm();
      setShowClientModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleClientEdit = (client) => {
    setEditingClientId(client.id);
    setEditingClientData(client);
    setShowClientModal(true);
  };

  const handleClientDelete = async (client) => {
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

import { useState, useEffect, useCallback } from "react";

export function useMissionForm({ createMission, updateMission, deleteMission, missions, setLoading, triggerAlert, showConfirm, setActiveTab }) {
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [editingMissionData, setEditingMissionData] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLieuId, setSelectedLieuId] = useState(null);
  const [selectedPatronId, setSelectedPatronId] = useState(null);

  useEffect(() => {
    if (editingMissionData?.lieu_id) setSelectedLieuId(editingMissionData.lieu_id);
    else if (!editingMissionId) setSelectedLieuId(null);
  }, [editingMissionData, editingMissionId]);

  useEffect(() => {
    if (editingMissionData?.client_id) setSelectedClientId(editingMissionData.client_id);
    else if (!editingMissionId) setSelectedClientId(null);
  }, [editingMissionData, editingMissionId]);

  const resetMissionForm = useCallback(() => {
    setEditingMissionId(null);
    setEditingMissionData(null);
    setSelectedClientId(null);
    setSelectedLieuId(null);
    setSelectedPatronId(null);
  }, []);

  const handleMissionSubmit = async (missionData) => {
    if (!missionData?.debut || !missionData?.fin) { triggerAlert("Veuillez remplir debut et fin"); return; }
    try {
      setLoading(true);
      if (editingMissionId) { await updateMission(editingMissionId, missionData); triggerAlert("Mission mise a jour !"); }
      else { await createMission(missionData); triggerAlert("Mission enregistree !"); }
      resetMissionForm();
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleMissionEdit = (mission) => {
    setEditingMissionId(mission.id);
    setEditingMissionData(mission);
    setSelectedClientId(mission.client_id || null);
    setSelectedLieuId(mission.lieu_id || null);
    setSelectedPatronId(mission.patron_id || null);
    setActiveTab("saisie");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMissionDelete = async (id) => {
    const mission = missions.find((m) => m.id === id);
    if (!mission) return;
    const confirmed = await showConfirm({ title: "Supprimer mission", message: "Supprimer cette mission ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteMission(id); triggerAlert("Mission supprimee !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const copierDerniereMission = () => {
    if (!missions.length) return triggerAlert("Aucune mission precedente.");
    const derniere = [...missions].sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0];
    setEditingMissionData({ lieu_id: derniere.lieu_id || null, lieu: derniere.lieu || "", debut: derniere.debut, fin: derniere.fin, pause: derniere.pause, patron_id: derniere.patron_id, client_id: derniere.client_id, client: derniere.client });
    setSelectedClientId(derniere.client_id || null);
    setSelectedLieuId(derniere.lieu_id || null);
    setSelectedPatronId(derniere.patron_id || null);
  };

  const onLieuCreated = useCallback((lieu) => {
    setSelectedLieuId(lieu.id);
    setEditingMissionData((prev) => ({ ...(prev || {}), lieu_id: lieu.id, lieu: lieu.nom || "" }));
  }, []);

  return {
    editingMissionId,
    editingMissionData,
    setEditingMissionData,
    selectedClientId,
    setSelectedClientId,
    selectedLieuId,
    setSelectedLieuId,
    selectedPatronId,
    setSelectedPatronId,
    handleMissionSubmit,
    handleMissionEdit,
    handleMissionDelete,
    resetMissionForm,
    copierDerniereMission,
    onLieuCreated,
  };
}

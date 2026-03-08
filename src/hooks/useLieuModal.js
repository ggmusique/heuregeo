import { useState, useCallback } from "react";
import { geocodeAddress } from "../utils/geocode";

// Nominatim usage policy requires ≤ 1 request/second; 1100ms gives a safe margin.
const NOMINATIM_DELAY_MS = 1100;

export function useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated }) {
  const [showLieuModal, setShowLieuModal] = useState(false);
  const [editingLieuId, setEditingLieuId] = useState(null);
  const [editingLieuData, setEditingLieuData] = useState(null);

  const resetLieuForm = useCallback(() => {
    setEditingLieuId(null);
    setEditingLieuData(null);
  }, []);

  const handleLieuSubmit = async (lieuData) => {
    try {
      setLoading(true);
      let createdLieu;
      if (editingLieuId) { await updateLieu(editingLieuId, lieuData); triggerAlert("Lieu modifie !"); }
      else { createdLieu = await createLieu(lieuData); triggerAlert("Lieu cree !"); }
      await fetchLieux();
      if (createdLieu?.id) {
        onLieuCreated(createdLieu);
      }
      resetLieuForm();
      setShowLieuModal(false);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Operation echouee")); }
    finally { setLoading(false); }
  };

  const handleLieuEdit = (lieu) => {
    setEditingLieuId(lieu.id);
    setEditingLieuData(lieu);
    setShowLieuModal(true);
  };

  const handleLieuDelete = async (lieu) => {
    const confirmed = await showConfirm({ title: "Supprimer ce lieu", message: "Supprimer ce lieu ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setLoading(true); await deleteLieu(lieu.id); triggerAlert("Lieu supprime !"); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); }
  };

  const handleRegeocoderLieu = async (id, coords) => {
    try {
      await updateLieu(id, coords);
      triggerAlert("Coordonnées mises à jour !");
    } catch (err) {
      triggerAlert("Erreur : " + (err?.message || "Mise à jour échouée"));
    }
  };

  const handleRegeocoderBatch = useCallback(async (lieuxManquants) => {
    if (!lieuxManquants?.length) return { message: "Aucun lieu à géocoder" };
    let count = 0;
    const errors = [];
    for (const lieu of lieuxManquants) {
      const addr = (lieu.adresse_complete || lieu.nom || "").trim();
      if (!addr) continue;
      try {
        await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
        const result = await geocodeAddress(addr);
        if (result) {
          await updateLieu(lieu.id, { latitude: result.lat, longitude: result.lng });
          count++;
        }
      } catch {
        errors.push(lieu.nom || lieu.id);
      }
    }
    await fetchLieux();
    if (errors.length > 0) return { message: `${count} lieu(x) géocodé(s), ${errors.length} erreur(s)` };
    return { message: `✅ ${count} lieu(x) géocodé(s)` };
  }, [updateLieu, fetchLieux]);

  return {
    showLieuModal,
    setShowLieuModal,
    editingLieuId,
    editingLieuData,
    handleLieuSubmit,
    handleLieuEdit,
    handleLieuDelete,
    resetLieuForm,
    handleRegeocoderLieu,
    handleRegeocoderBatch,
  };
}

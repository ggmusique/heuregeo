import { useState, useCallback } from "react";
import { geocodeAddress } from "../utils/geocode";
import { useLabels } from "../contexts/LabelsContext";
import type { Lieu } from "../types/entities";
import type { ConfirmFn } from "./useConfirm";

// Nominatim usage policy requires ≤ 1 request/second; 1100ms gives a safe margin.
const NOMINATIM_DELAY_MS = 1100;

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegeocoderResult {
  message: string;
}

interface UseLieuModalArgs {
  createLieu: (data: Partial<Lieu>) => Promise<Lieu | null | undefined>;
  updateLieu: (id: string, data: Partial<Lieu>) => Promise<Lieu | void>;
  deleteLieu: (id: string) => Promise<void>;
  fetchLieux: () => Promise<Lieu[] | void>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  showConfirm: ConfirmFn;
  onLieuCreated: (lieu: Lieu) => void;
}

export interface UseLieuModalReturn {
  showLieuModal: boolean;
  openLieuModal: () => void;
  closeLieuModal: () => void;
  editingLieuId: string | null;
  editingLieuData: Lieu | null;
  isSaving: boolean;
  isGeocoding: boolean;
  handleLieuSubmit: (lieuData: Partial<Lieu>) => Promise<void>;
  handleLieuEdit: (lieu: Lieu) => void;
  handleLieuDelete: (lieu: Lieu) => Promise<void>;
  resetLieuForm: () => void;
  handleRegeocoderLieu: (id: string, coords: Partial<Lieu>) => Promise<void>;
  handleRegeocoderBatch: (lieuxManquants: Lieu[]) => Promise<RegeocoderResult>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated }: UseLieuModalArgs): UseLieuModalReturn {
  const L = useLabels();
  const [showLieuModal, setShowLieuModal] = useState<boolean>(false);
  const [editingLieuId, setEditingLieuId] = useState<string | null>(null);
  const [editingLieuData, setEditingLieuData] = useState<Lieu | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const resetLieuForm = useCallback((): void => {
    setEditingLieuId(null);
    setEditingLieuData(null);
  }, []);

  const closeLieuModal = useCallback((): void => {
    setShowLieuModal(false);
    resetLieuForm();
  }, [resetLieuForm]);

  const openLieuModal = useCallback((): void => {
    resetLieuForm();
    setShowLieuModal(true);
  }, [resetLieuForm]);

  const handleLieuSubmit = async (lieuData: Partial<Lieu>): Promise<void> => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setLoading(true);
      let createdLieu: Lieu | null | undefined;
      if (editingLieuId) { await updateLieu(editingLieuId, lieuData); triggerAlert(`${L.lieu} modifié !`); }
      else { createdLieu = await createLieu(lieuData); triggerAlert(`${L.lieu} créé !`); }
      await fetchLieux();
      if (createdLieu) {
        onLieuCreated(createdLieu);
      }
      closeLieuModal();
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Operation echouee")); }
    finally { setLoading(false); setIsSaving(false); }
  };

  const handleLieuEdit = (lieu: Lieu): void => {
    setEditingLieuId(lieu.id);
    setEditingLieuData(lieu);
    setShowLieuModal(true);
  };

  const handleLieuDelete = async (lieu: Lieu): Promise<void> => {
    if (isSaving) return;
    const confirmed = await showConfirm({ title: "Supprimer ce lieu", message: "Supprimer ce lieu ?", confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
    if (!confirmed) return;
    try { setIsSaving(true); setLoading(true); await deleteLieu(lieu.id); triggerAlert(`${L.lieu} supprimé !`); }
    catch { triggerAlert("Erreur suppression"); }
    finally { setLoading(false); setIsSaving(false); }
  };

  const handleRegeocoderLieu = async (id: string, coords: Partial<Lieu>): Promise<void> => {
    try {
      await updateLieu(id, coords);
      triggerAlert("Coordonnées mises à jour !");
    } catch (err) {
      triggerAlert("Erreur : " + ((err as Error)?.message || "Mise à jour échouée"));
    }
  };

  const handleRegeocoderBatch = useCallback(async (lieuxManquants: Lieu[]): Promise<RegeocoderResult> => {
    if (isGeocoding) return { message: "Géocodage déjà en cours" };
    if (!lieuxManquants?.length) return { message: "Aucun lieu à géocoder" };
    let count = 0;
    const errors: string[] = [];
    try {
      setIsGeocoding(true);
      for (const lieu of lieuxManquants) {
        const addr = (lieu.adresse_complete || lieu.nom || "").trim();
        if (!addr) continue;
        try {
          await new Promise<void>((r) => setTimeout(r, NOMINATIM_DELAY_MS));
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
    } finally {
      setIsGeocoding(false);
    }
    if (errors.length > 0) return { message: `${count} lieu(x) géocodé(s), ${errors.length} erreur(s)` };
    return { message: `✅ ${count} lieu(x) géocodé(s)` };
  }, [isGeocoding, updateLieu, fetchLieux]);

  return {
    showLieuModal,
    openLieuModal,
    closeLieuModal,
    editingLieuId,
    editingLieuData,
    isSaving,
    isGeocoding,
    handleLieuSubmit,
    handleLieuEdit,
    handleLieuDelete,
    resetLieuForm,
    handleRegeocoderLieu,
    handleRegeocoderBatch,
  };
}

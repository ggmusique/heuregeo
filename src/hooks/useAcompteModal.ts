import { useState } from "react";

// ─── Types locaux ─────────────────────────────────────────────────────────────

/** Sous-ensemble de useBilan utilisé par useAcompteModal. */
interface BilanRef {
  fetchHistoriqueBilans?: (patronId: string | null) => Promise<unknown>;
  showBilan?: boolean;
  bilanPeriodValue?: string;
  genererBilan?: (patronId?: string | null, clientId?: string | null) => Promise<boolean | void>;
}

interface UseAcompteModalArgs {
  createAcompte: (data: { montant: number; date_acompte: string; patron_id: string }) => Promise<unknown>;
  fetchAcomptes: () => Promise<unknown>;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  bilanPatronId: string | null;
  chargerHistorique: (patronId: string | null) => Promise<void>;
  bilan: BilanRef;
}

export interface UseAcompteModalReturn {
  showAcompteModal: boolean;
  setShowAcompteModal: (v: boolean) => void;
  acompteMontant: string;
  setAcompteMontant: (v: string) => void;
  acompteDate: string;
  setAcompteDate: (v: string) => void;
  acomptePatronId: string | null;
  setAcomptePatronId: (v: string | null) => void;
  isSavingAcompte: boolean;
  handleAcompteSubmit: () => Promise<void>;
  resetAcompteForm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAcompteModal({ createAcompte, fetchAcomptes, setLoading, triggerAlert, bilanPatronId, chargerHistorique, bilan }: UseAcompteModalArgs): UseAcompteModalReturn {
  const [showAcompteModal, setShowAcompteModal] = useState<boolean>(false);
  const [acompteMontant, setAcompteMontant] = useState<string>("");
  const [acompteDate, setAcompteDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [acomptePatronId, setAcomptePatronId] = useState<string | null>(null);
  const [isSavingAcompte, setIsSavingAcompte] = useState<boolean>(false);

  const resetAcompteForm = (): void => {
    setAcompteMontant("");
    setAcompteDate(new Date().toISOString().split("T")[0]);
    setAcomptePatronId(null);
  };

  const handleAcompteSubmit = async (): Promise<void> => {
    if (isSavingAcompte) return;
    const montantNet = parseFloat(acompteMontant?.toString().replace(",", "."));
    if (!acompteMontant || isNaN(montantNet) || montantNet <= 0) return triggerAlert("Veuillez saisir un montant valide");
    if (!acomptePatronId) return triggerAlert("Selectionne un patron pour cet acompte");
    try {
      setIsSavingAcompte(true);
      setLoading(true);
      await createAcompte({ montant: montantNet, date_acompte: acompteDate, patron_id: acomptePatronId });
      triggerAlert("Acompte enregistre !");
      resetAcompteForm();
      setShowAcompteModal(false);
      await fetchAcomptes();
      if (typeof bilan.fetchHistoriqueBilans === "function") {
        await bilan.fetchHistoriqueBilans(acomptePatronId);
      }
      if (bilan.showBilan && bilan.bilanPeriodValue) await bilan.genererBilan?.(bilanPatronId);
      await chargerHistorique(acomptePatronId);
    } catch (err) { triggerAlert("Erreur : " + ((err as Error)?.message || "Probleme de base de donnees")); }
    finally {
      setLoading(false);
      setIsSavingAcompte(false);
    }
  };

  return {
    showAcompteModal,
    setShowAcompteModal,
    acompteMontant,
    setAcompteMontant,
    acompteDate,
    setAcompteDate,
    acomptePatronId,
    setAcomptePatronId,
    isSavingAcompte,
    handleAcompteSubmit,
    resetAcompteForm,
  };
}

import { useState, useCallback } from "react";

// ─── Types locaux ────────────────────────────────────────────────────────────

/** Options passées à showConfirm (shape de useConfirm). */
interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

/** Signature de showConfirm retournée par useConfirm. */
export type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

/**
 * Sous-ensemble du retour de useBilan utilisé par useBilanFilters.
 * Seule marquerCommePaye est appelée ici.
 */
export interface BilanHook {
  marquerCommePaye: (patronId: string | null) => Promise<boolean | void>;
}

// ─── Paramètres et retour ────────────────────────────────────────────────────

interface UseBilanFiltersArgs {
  showConfirm: ConfirmFn;
  bilan: BilanHook;
}

export interface UseBilanFiltersReturn {
  bilanPatronId: string | null;
  setBilanPatronId: (id: string | null) => void;
  bilanClientId: string | null;
  setBilanClientId: (id: string | null) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  marquerCommePaye: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBilanFilters({
  showConfirm,
  bilan,
}: UseBilanFiltersArgs): UseBilanFiltersReturn {
  const [bilanPatronId, setBilanPatronId] = useState<string | null>(null);
  const [bilanClientId, setBilanClientId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const marquerCommePaye = useCallback(async (): Promise<void> => {
    const confirmed = await showConfirm({
      title: "Marquer comme paye",
      message: "Voulez-vous marquer ce bilan comme paye ?",
      confirmText: "Confirmer",
      cancelText: "Annuler",
      type: "info",
    });
    if (!confirmed) return;
    await bilan.marquerCommePaye(bilanPatronId);
  }, [showConfirm, bilan, bilanPatronId]);

  return {
    bilanPatronId,
    setBilanPatronId,
    bilanClientId,
    setBilanClientId,
    showImportModal,
    setShowImportModal,
    marquerCommePaye,
  };
}

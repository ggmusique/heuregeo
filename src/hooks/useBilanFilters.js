import { useState, useCallback } from "react";

export function useBilanFilters({ showConfirm, bilan }) {
  const [bilanPatronId, setBilanPatronId] = useState(null);
  const [bilanClientId, setBilanClientId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const marquerCommePaye = useCallback(async () => {
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

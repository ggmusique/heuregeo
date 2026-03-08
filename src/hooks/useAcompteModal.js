import { useState } from "react";

export function useAcompteModal({ createAcompte, fetchAcomptes, setLoading, triggerAlert, bilanPatronId, chargerHistorique, bilan }) {
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [acompteMontant, setAcompteMontant] = useState("");
  const [acompteDate, setAcompteDate] = useState(new Date().toISOString().split("T")[0]);
  const [acomptePatronId, setAcomptePatronId] = useState(null);
  const [isSavingAcompte, setIsSavingAcompte] = useState(false);

  const resetAcompteForm = () => {
    setAcompteMontant("");
    setAcompteDate(new Date().toISOString().split("T")[0]);
    setAcomptePatronId(null);
  };

  const handleAcompteSubmit = async () => {
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
      if (bilan.showBilan && bilan.bilanPeriodValue) await bilan.genererBilan(bilanPatronId);
      await chargerHistorique(acomptePatronId);
    } catch (err) { triggerAlert("Erreur : " + (err?.message || "Probleme de base de donnees")); }
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

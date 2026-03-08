import { useState } from "react";

export function useHistorique({ fetchHistoriqueBilans, triggerAlert }) {
  const [historique, setHistorique] = useState({ impayes: [], payes: [], all: [] });
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [historiquePatronId, setHistoriquePatronId] = useState(null);
  const [historiqueTab, setHistoriqueTab] = useState("impayes");
  const [suiviDefaultView, setSuiviDefaultView] = useState("historique");

  const chargerHistorique = async (patronId = null) => {
    if (typeof fetchHistoriqueBilans !== "function") { triggerAlert("Historique non branche"); return; }
    try {
      setLoadingHistorique(true);
      const res = await fetchHistoriqueBilans(patronId);
      setHistorique(res || { impayes: [], payes: [], all: [] });
    } catch { triggerAlert("Erreur chargement historique"); }
    finally { setLoadingHistorique(false); }
  };

  return {
    historique,
    loadingHistorique,
    historiquePatronId,
    setHistoriquePatronId,
    historiqueTab,
    setHistoriqueTab,
    suiviDefaultView,
    setSuiviDefaultView,
    chargerHistorique,
  };
}

import { useState } from "react";
import type { NormalizedHistorique } from "../types/bilan";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape opaque d'une ligne de bilan historique (normalisée par useBilan). */
export type { HistoriqueRow } from "../types/bilan";

export type HistoriqueData = NormalizedHistorique;

interface UseHistoriqueArgs {
  fetchHistoriqueBilans: (patronId: string | null) => Promise<HistoriqueData | null>;
  triggerAlert: (msg: string) => void;
}

export interface UseHistoriqueReturn {
  historique: HistoriqueData;
  loadingHistorique: boolean;
  historiquePatronId: string | null;
  setHistoriquePatronId: (id: string | null) => void;
  historiqueTab: string;
  setHistoriqueTab: (tab: string) => void;
  suiviDefaultView: string;
  setSuiviDefaultView: (view: string) => void;
  chargerHistorique: (patronId?: string | null) => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHistorique({ fetchHistoriqueBilans, triggerAlert }: UseHistoriqueArgs): UseHistoriqueReturn {
  const [historique, setHistorique] = useState<HistoriqueData>({ impayes: [], payes: [], all: [] });
  const [loadingHistorique, setLoadingHistorique] = useState<boolean>(false);
  const [historiquePatronId, setHistoriquePatronId] = useState<string | null>(null);
  const [historiqueTab, setHistoriqueTab] = useState<string>("impayes");
  const [suiviDefaultView, setSuiviDefaultView] = useState<string>("historique");

  const chargerHistorique = async (patronId: string | null = null): Promise<void> => {
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

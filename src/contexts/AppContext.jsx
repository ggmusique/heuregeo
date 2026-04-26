import { createContext, useContext } from "react";

/**
 * AppContext — Valeurs globales de l'application partagées entre tous les composants.
 *
 * Contient : darkMode, user, profile (et dérivés), triggerAlert, loading, isIOS
 *
 * Utilisation :
 *   import { useApp } from "../contexts/AppContext";
 *   const { darkMode, isPro, triggerAlert } = useApp();
 */

export const AppContext = createContext(null);

/**
 * Hook pour accéder au contexte App.
 * @returns {object} { darkMode, user, profile, isPro, isViewer, isAdmin, canBilanMois,
 *   canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canKilometrage,
 *   canAgenda, canFacture, canDashboard, isProfileComplete, profileSaving,
 *   saveProfile, triggerAlert, loading, isIOS, showMissionRateEditor,
 *   setShowMissionRateEditor, liveTime }
 */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppContext.Provider");
  }
  return ctx;
}

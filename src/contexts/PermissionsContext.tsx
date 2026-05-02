import { createContext, useContext } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PermissionsContextType {
  isViewer: boolean;
  viewerPatronId: string | null;
  isAdmin: boolean;
  isPro: boolean;
  canBilanMois: boolean;
  canBilanAnnee: boolean;
  canExportPDF: boolean;
  canExportExcel: boolean;
  canExportCSV: boolean;
  canKilometrage: boolean;
  canAgenda: boolean;
  canFacture: boolean;
  canDashboard: boolean;
}

// ─── Contexte ────────────────────────────────────────────────────────────────

export const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function usePermissions(): PermissionsContextType {
  const ctx = useContext(PermissionsContext);
  if (ctx === undefined) {
    throw new Error("usePermissions must be used within a PermissionsContext.Provider");
  }
  return ctx;
}

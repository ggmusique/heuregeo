import { createContext, useContext } from "react";

const defaultPermissions = {
  isViewer: false,
  viewerPatronId: null,
  isAdmin: false,
  isPro: false,
  canBilanMois: false,
  canBilanAnnee: false,
  canExportPDF: false,
  canExportExcel: false,
  canExportCSV: false,
  canKilometrage: false,
  canAgenda: false,
  canFacture: false,
  canDashboard: false,
};

export const PermissionsContext = createContext(defaultPermissions);

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function usePermissions() {
  return useContext(PermissionsContext);
}

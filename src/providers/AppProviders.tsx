import React, { useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { DarkModeProvider } from "../contexts/DarkModeContext";
import { LabelsContext, getLabels } from "../utils/labels";
import { PermissionsContext } from "../contexts/PermissionsContext";
import type { UserProfile } from "../types/profile";

interface PermissionsValue {
  contract: ReturnType<import("../features/contracts").buildContractFeatures>;
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

interface AppProvidersProps {
  user: User | undefined;
  profile: UserProfile | null;
  profileSaving: boolean;
  saveProfile: (data: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>;
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
  contract: ReturnType<import("../features/contracts").buildContractFeatures>;
  children: React.ReactNode;
}

export function AppProviders({
  user,
  profile,
  profileSaving,
  saveProfile,
  isViewer,
  viewerPatronId,
  isAdmin,
  isPro,
  canBilanMois,
  canBilanAnnee,
  canExportPDF,
  canExportExcel,
  canExportCSV,
  canKilometrage,
  canAgenda,
  canFacture,
  canDashboard,
  contract,
  children,
}: AppProvidersProps) {
  const labels = useMemo(() => getLabels(profile), [profile]);

  const permissions = useMemo<PermissionsValue>(() => ({
    contract,
    isViewer,
    viewerPatronId,
    isAdmin,
    isPro,
    canBilanMois,
    canBilanAnnee,
    canExportPDF,
    canExportExcel,
    canExportCSV,
    canKilometrage,
    canAgenda,
    canFacture,
    canDashboard,
  }), [
    contract, isViewer, viewerPatronId, isAdmin, isPro,
    canBilanMois, canBilanAnnee, canExportPDF, canExportExcel,
    canExportCSV, canKilometrage, canAgenda, canFacture, canDashboard,
  ]);

  return (
    <DarkModeProvider>
      <LabelsContext.Provider value={labels}>
        <PermissionsContext.Provider value={permissions}>
          {children}
        </PermissionsContext.Provider>
      </LabelsContext.Provider>
    </DarkModeProvider>
  );
}
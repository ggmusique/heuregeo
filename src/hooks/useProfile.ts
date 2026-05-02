import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { UserProfile, UserFeatures } from "../types/profile";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Sous-ensemble de l'objet user Supabase utilisé par ce hook. */
interface AuthUser {
  id: string;
  email?: string;
}

export interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveProfile: (updates: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>;
  fetchProfile: () => Promise<void>;
  isProfileComplete: boolean;
  isViewer: boolean;
  viewerPatronId: string | null;
  isAdmin: boolean;
  features: UserFeatures;
  isPro: boolean;
  canBilanMois: boolean;
  canBilanAnnee: boolean;
  canExportPDF: boolean;
  canExportExcel: boolean;
  canExportCSV: boolean;
  canMultiPatron: boolean;
  canViewerMode: boolean;
  canHistoriqueComplet: boolean;
  canKilometrage: boolean;
  canAgenda: boolean;
  canFacture: boolean;
  canDashboard: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useProfile = (user: AuthUser | null | undefined): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setProfile(data || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<{ data?: UserProfile; error?: string }> => {
      if (!user?.id) return { error: "Non connecté" };
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        return { data };
      } catch (err) {
        setError((err as Error).message);
        return { error: (err as Error).message };
      } finally {
        setSaving(false);
      }
    },
    [user?.id]
  );

  // Profil complet = prénom ET nom renseignés
  const isProfileComplete = Boolean(profile && profile.prenom?.trim() && profile.nom?.trim());

  const isViewer = profile?.role === "viewer";
  const viewerPatronId: string | null = isViewer ? (profile?.patron_id ?? null) : null;

  // Plan Gratuit / Pro
  // Colonne `is_admin` (boolean, default false) et `features` (jsonb, default {}) dans la table `profiles`
  // L'admin geohelene@msn.com doit avoir is_admin = true dans Supabase
  const isAdmin = profile?.is_admin === true;
  const features: UserFeatures = profile?.features || {};
  const isPro = features?.plan === "pro";

  // Features individuelles (avec fallback sur isPro)
  const canBilanMois = isPro || features?.bilan_mois === true;
  const canBilanAnnee = isPro || features?.bilan_annee === true;
  const canExportPDF = isPro || features?.export_pdf === true;
  const canExportExcel = isPro || features?.export_excel === true;
  const canExportCSV = isPro || features?.export_csv === true;
  const canMultiPatron = isPro || features?.multi_patron === true;
  const canViewerMode = isPro || features?.viewer_enabled === true;
  const canHistoriqueComplet = isPro || features?.historique_complet === true;
  const canKilometrage = isPro || features?.kilometrage === true;
  const canAgenda = features?.agenda === true;
  const canFacture = features?.facture === true;
  const canDashboard = features?.dashboard === true;

  return {
    profile, loading, saving, error, saveProfile, fetchProfile,
    isProfileComplete, isViewer, viewerPatronId,
    isAdmin, features, isPro,
    canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV,
    canMultiPatron, canViewerMode, canHistoriqueComplet, canKilometrage, canAgenda, canFacture, canDashboard,
  };
};

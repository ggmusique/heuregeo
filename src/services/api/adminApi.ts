import { supabase } from "../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  prenom: string | null;
  nom: string | null;
  role: string | null;
  created_at: string | null;
  features: Record<string, unknown> | null;
  is_admin: boolean | null;
}

export type AdminFeatures = Record<string, unknown>;

// ─── Fonctions API ────────────────────────────────────────────────────────────

/** Récupère la liste de tous les profils utilisateurs. */
export const fetchUsers = async (): Promise<{ data: AdminUser[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, prenom, nom, role, created_at, features, is_admin")
    .order("created_at", { ascending: false });

  return {
    data: (data as AdminUser[]) ?? [],
    error: error ? error.message : null,
  };
};

/** Met à jour les features d'un utilisateur (plan, droits…). */
export const updateUserFeatures = async (
  userId: string,
  features: AdminFeatures
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from("profiles")
    .update({ features })
    .eq("id", userId);

  return { error: error ? error.message : null };
};

/** Supprime un profil utilisateur par son id. */
export const deleteUserProfile = async (
  userId: string
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  return { error: error ? error.message : null };
};

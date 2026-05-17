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

/**
 * Supprime un compte utilisateur en totalité (auth.users + profiles en cascade).
 * Passe par la Edge Function `delete-user` qui utilise le client admin
 * (service_role key) — la clé n'est jamais exposée côté client.
 */
export const deleteUserProfile = async (
  userId: string
): Promise<{ error: string | null }> => {
  const { error } = await supabase.functions.invoke("delete-user", {
    body: { user_id: userId },
  });

  return { error: error ? error.message : null };
};

// src/hooks/useIsAdmin.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook utilitaire : vérifie si l'utilisateur courant est administrateur.
//
// Sources de vérité (dans l'ordre) :
//   1. PermissionsContext.isAdmin (dérivé de profiles.is_admin)
//   2. Fallback à false si contexte non disponible
//
// SÉCURITÉ :
//   Ce hook vérifie uniquement le statut admin côté FRONTEND.
//   La protection réelle est garantie par les RLS Supabase et les
//   fonctions SECURITY DEFINER côté backend.
// ─────────────────────────────────────────────────────────────────────────────

import { usePermissions } from "../contexts/PermissionsContext";

export interface UseIsAdminReturn {
  isAdmin: boolean;
}

/**
 * Retourne true uniquement si le profil courant a `is_admin = true`
 * dans la table `profiles` Supabase.
 *
 * @example
 * const { isAdmin } = useIsAdmin();
 * if (!isAdmin) return <Navigate to="/" />;
 */
export function useIsAdmin(): UseIsAdminReturn {
  const permissions = usePermissions();
  return { isAdmin: permissions.isAdmin };
}

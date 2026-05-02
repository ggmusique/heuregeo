/**
 * Types liés au profil utilisateur (table `profiles`).
 */

// ─── Rôle ───────────────────────────────────────────────────────────────────

/** Rôles possibles dans la table `profiles`. */
export type UserRole = "viewer" | "pro" | "admin";

// ─── Features (JSONB) ────────────────────────────────────────────────────────

/**
 * Colonne `features` (JSONB) de la table `profiles`.
 * Toutes les clés sont optionnelles — le plan "pro" implique
 * l'activation automatique de la plupart des features côté app.
 */
export interface UserFeatures {
  /** "free" | "pro" — détermine isPro dans useProfile. */
  plan?: "free" | "pro";
  /** Accès au module agenda. */
  agenda?: boolean;
  /** Accès au tableau de bord. */
  dashboard?: boolean;
  /** Bilan mensuel. */
  bilan_mois?: boolean;
  /** Bilan annuel. */
  bilan_annee?: boolean;
  /** Export PDF. */
  export_pdf?: boolean;
  /** Export Excel. */
  export_excel?: boolean;
  /** Export CSV. */
  export_csv?: boolean;
  /** Gestion multi-patrons. */
  multi_patron?: boolean;
  /** Mode viewer activé (partage en lecture). */
  viewer_enabled?: boolean;
  /** Accès à l'historique complet. */
  historique_complet?: boolean;
  /** Module kilométrage domicile-lieu. */
  kilometrage?: boolean;
  /** Module génération de factures. */
  facture?: boolean;
  /** Coordonnées GPS du domicile pour le calcul km. */
  km_domicile_lat?: number;
  km_domicile_lng?: number;
  km_domicile_address?: string;
}

// ─── Profil complet ──────────────────────────────────────────────────────────

/**
 * Enregistrement de la table `profiles`.
 * Étendu par useProfile avec des dérivés calculés (isPro, canBilanMois…).
 */
export interface UserProfile {
  /** Correspond à auth.users.id — UUID Supabase. */
  id: string;
  role: UserRole;
  features: UserFeatures;
  /** true si l'utilisateur est administrateur (colonne is_admin). */
  is_admin: boolean;
  /**
   * ID du patron auquel ce compte viewer est rattaché.
   * Non-null uniquement pour role === "viewer".
   */
  patron_id: string | null;
  prenom: string | null;
  nom: string | null;
  /** Adresse postale (utilisée pour le géocodage domicile). */
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  updated_at: string | null;
}

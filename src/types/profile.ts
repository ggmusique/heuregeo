/**
 * Types liés au profil utilisateur (table `profiles`).
 */

// ─── Rôle ───────────────────────────────────────────────────────────────────

/** Rôles possibles dans la table `profiles`. */
export type UserRole = "viewer" | "pro" | "admin" | "patron";

/** Statut d'un profil patron actif/révoqué dans `profiles`. */
export type PatronAccessStatus = "active" | "revoked";

/** Features du profil patron actif (stockées dans profiles.features). */
export interface PatronAccessFeatures {
  access_agenda: boolean;
  access_dashboard: boolean;
}

/** Profil d'accès patron (enregistrement profiles pour role='patron', status active|revoked). */
export interface PatronAccessProfile {
  id: string;          // profiles.id = auth.users.id du patron
  status: PatronAccessStatus;
  owner_id: string;    // profiles.id de l'ouvrier
  patron_id: string;   // patrons.id (entrée dans la table patrons)
  features: PatronAccessFeatures;
}

/** Statut d'une invitation (table patron_invitations). */
export type PatronInvitationStatus = "pending" | "accepted" | "expired";

/** Ligne de la table patron_invitations. */
export interface PatronInvitation {
  id: string;
  owner_id: string;
  patron_id: string;
  patron_email: string;
  invite_token: string;
  invite_expires: string; // ISO date
  status: PatronInvitationStatus;
  created_at: string;
  updated_at: string;
}

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
  km_domicile_lat?: number | null;
  km_domicile_lng?: number | null;
  km_domicile_address?: string | null;

  // ─── Km settings ─────────────────────────────────────────────────────────

  /**
   * Canonical km settings object (source of truth for the new format).
   * Kept in sync with the flat legacy fields below.
   */
  km_settings?: {
    enabled?: boolean;
    roundTrip?: boolean;
    homeLabel?: string | null;
    homeLat?: number | null;
    homeLng?: number | null;
    countryCode?: string;
    ratePerKm?: number | null;
  };
  /** Legacy km enabled flag (kept in sync with km_settings.enabled). */
  km_enabled?: boolean;
  /** Obsolete flag — removed on save; never read. */
  km_enable?: boolean;
  /** Include return trip in km distance calculation. */
  km_include_retour?: boolean;
  /** Country code used for km rate lookup (e.g., "FR"). */
  km_country?: string;
  /** Rate mode: 'AUTO_BY_COUNTRY' | 'CUSTOM'. */
  km_rate_mode?: string;
  /** Custom km rate in €/km (used when km_rate_mode === 'CUSTOM'). */
  km_rate_custom?: number | null;
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
   * ID du patron auquel ce compte viewer/patron est rattaché.
   * Non-null uniquement pour role === "viewer" | "patron".
   */
  patron_id: string | null;
  /**
   * Pour role === 'patron' : pointe vers le profiles.id de l'ouvrier qui a invité.
   */
  owner_id?: string | null;
  /**
   * Statut d'invitation pour role === 'patron'.
   */
  status?: "active" | "revoked" | null;
  prenom: string | null;
  nom: string | null;
  /** Adresse postale (utilisée pour le géocodage domicile). */
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  updated_at: string | null;
}

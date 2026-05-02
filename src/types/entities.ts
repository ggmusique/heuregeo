/**
 * Types des entités persistées en base (table Supabase).
 * Les champs optionnels (?) correspondent aux colonnes nullable.
 * Tous les IDs sont des UUID strings.
 */

// ─── Mission ────────────────────────────────────────────────────────────────

/**
 * Enregistrement de la table `missions`.
 * `date_mission` est la colonne canonique ; `date_iso` est conservée pour
 * la rétro-compatibilité (ancienne colonne, contient la même valeur).
 */
export interface Mission {
  id: string;
  user_id: string;
  patron_id: string | null;
  client_id: string | null;
  lieu_id: string | null;
  /** Nom dénormalisé du client (snapshot au moment de la saisie). */
  client: string | null;
  /** Nom dénormalisé du lieu (snapshot au moment de la saisie). */
  lieu: string | null;
  /** Format "YYYY-MM-DD" — colonne principale. */
  date_mission: string | null;
  /** Format "YYYY-MM-DD" — ancienne colonne, même valeur que date_mission. */
  date_iso: string | null;
  /** Format "HH:MM". */
  debut: string;
  /** Format "HH:MM". */
  fin: string;
  /** Durée nette en heures (ex : 8.5). */
  duree: number;
  /** Pause en minutes. */
  pause: number;
  /** Montant calculé = duree × tarif_horaire. */
  montant: number;
  /** Taux horaire en euros au moment de la saisie. */
  tarif?: number | null;
  created_at?: string | null;
}

// ─── Patron ─────────────────────────────────────────────────────────────────

/** Enregistrement de la table `patrons`. */
export interface Patron {
  id: string;
  user_id: string;
  nom: string;
  taux_horaire: number | null;
  /** Couleur hexadécimale (ex : "#8b5cf6"). */
  couleur: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  actif: boolean;
  created_at?: string | null;
}

// ─── Client ─────────────────────────────────────────────────────────────────

/** Enregistrement de la table `clients`. */
export interface Client {
  id: string;
  user_id: string;
  nom: string;
  /** Téléphone, email, ou autre contact libre. */
  contact: string | null;
  lieu_travail: string | null;
  notes: string | null;
  actif: boolean;
  created_at?: string | null;
}

// ─── Lieu ───────────────────────────────────────────────────────────────────

/** Enregistrement de la table `lieux`. */
export interface Lieu {
  id: string;
  user_id: string;
  nom: string;
  adresse_complete: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  /** Catégorie libre (ex : "bureau", "domicile client"). */
  type: string | null;
  created_at?: string | null;
}

// ─── Acompte ────────────────────────────────────────────────────────────────

/** Enregistrement de la table `acomptes`. */
export interface Acompte {
  id: string;
  user_id?: string | null;
  patron_id: string | null;
  montant: number;
  /** Format "YYYY-MM-DD". */
  date_acompte: string;
  created_at?: string | null;
}

// ─── FraisDivers ────────────────────────────────────────────────────────────

/** Enregistrement de la table `frais_divers`. */
export interface FraisDivers {
  id: string;
  user_id?: string | null;
  patron_id: string | null;
  description: string;
  montant: number;
  /** Format "YYYY-MM-DD". */
  date_frais: string | null;
  created_at?: string | null;
}

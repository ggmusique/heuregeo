/**
 * Types partagés pour les modules bilan (lib/*, services/*, utils/*).
 * Ces types correspondent aux structures de données des tables Supabase
 * et aux valeurs calculées par le moteur de bilan.
 */

// ─── Tables Supabase ─────────────────────────────────────────────────────────

/** Ligne de la table `bilans_status_v2`. */
export interface BilanRow {
  id: string;
  user_id?: string;
  patron_id: string;
  periode_type: string;
  periode_value: string | number;
  periode_index: number;
  ca_brut_periode: number | string;
  acompte_consomme: number | string;
  reste_a_percevoir: number | string;
  paye: boolean;
  date_paiement: string | null;
  created_at?: string | null;
}

/** Ligne partielle utilisée pour les réparations (champs requis uniquement). */
export interface BilanRowForRepair {
  id: string;
  periode_index: number;
  ca_brut_periode: number | string;
  acompte_consomme: number | string;
  reste_a_percevoir: number | string;
  paye: boolean;
}

/** Ligne de la table `acompte_allocations`. */
export interface AcompteAllocation {
  periode_index: number;
  amount: number | string;
  created_at?: string | null;
}

/** Ligne de la table `acomptes`. */
export interface AcompteRow {
  montant: number | string;
  date_acompte?: string;
}

/** Ligne de frais km. */
export interface FraisKmRow {
  user_id: string;
  patron_id: string | null;
  mission_id: string;
  date_frais: string | null;
  country_code: string;
  distance_km: number;
  rate_per_km: number;
  amount: number;
  source: string;
}

// ─── Valeurs calculées ────────────────────────────────────────────────────────

/** État acompte calculé pour une période hebdomadaire. */
export interface WeeklyAcompteState {
  acompteConsomme: number;
  soldeAvantPeriode: number;
  soldeApresPeriode: number;
  resteCettePeriode: number;
  resteAPercevoir: number;
}

/** État acompte calculé pour une période non-hebdomadaire (mois, année). */
export interface StandardAcompteState {
  acompteConsomme: number;
  resteCettePeriode: number;
  resteAPercevoir: number;
  soldeApresPeriode: number;
}

/** Métriques d'acomptes agrégées pour une semaine. */
export interface WeeklyAcompteMetrics {
  allocCetteSemaine: number;
  totalAlloueJusqua: number;
  totalAlloueAvant: number;
  acompteConsommePeriode: number;
  acomptesCumules: number;
  acomptesDansPeriode: number;
}

/** Données météo retournées par fetchHistoricalWeather. */
export interface WeatherData {
  tempMax: number;
  tempMin: number;
  icon: string;
  desc: string;
}

/** Résultat de la décision de réparation d'une ligne bilan. */
export interface RepairDecision {
  needsFix: boolean;
  alloueReel: number;
  resteReel: number;
  payeReel: boolean;
  payload: {
    acompte_consomme: number;
    reste_a_percevoir: number;
    paye: boolean;
  };
}

/** Ligne d'historique normalisée (enrichie du nom du patron). */
export interface HistoriqueRow extends Omit<BilanRow, 'user_id'> {
  patron_nom: string;
}

/** Résultat de normalizeHistoriqueRows / splitHistoriqueRows. */
export interface NormalizedHistorique {
  impayes: HistoriqueRow[];
  payes: HistoriqueRow[];
  all: HistoriqueRow[];
}

/** Payload de normalisation d'une ligne bilan avant écriture. */
export interface NormalizedBilanPayload {
  ca_brut_periode: number;
  acompte_consomme: number;
  reste_a_percevoir: number;
  paye: boolean;
  date_paiement: string | null;
}

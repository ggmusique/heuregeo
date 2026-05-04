/**
 * Types partagés pour les modules bilan (lib/*, services/*, utils/*, hooks/*).
 * Ces types correspondent aux structures de données des tables Supabase
 * et aux valeurs calculées par le moteur de bilan.
 */

import type { Mission, FraisDivers, Lieu } from "./entities";

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

// ─── Types bilan UI (partagés entre useBilan et sous-hooks) ─────────────────

/** Un item km calculé pour une mission. */
export interface BilanKmItem {
  missionId: string;
  date: string | null;
  labelLieuOuClient: string;
  kmOneWay: number | null;
  kmTotal: number | null;
  amount: number | null;
}

/** Résultat du calcul km pour une période. */
export interface BilanKmResult {
  items: BilanKmItem[];
  totalKm: number;
  totalAmount: number;
}

/** Mission enrichie avec des données météo optionnelles. */
export interface MissionWithWeather extends Mission {
  weather?: WeatherData;
}

/** Ligne groupée du bilan (par semaine ou par mois). */
export interface BilanGroupedRow {
  label: string;
  h: number;
  e: number;
  missions: Mission[];
}

/** Contenu calculé d'un bilan pour une période et un patron donnés. */
export interface BilanContent {
  titre: string;
  totalE: number;
  totalH: number;
  filteredData: MissionWithWeather[];
  groupedData: BilanGroupedRow[];
  totalFrais: number;
  fraisDivers: FraisDivers[];
  impayePrecedent: number;
  resteCettePeriode: number;
  resteAPercevoir: number;
  soldeAcomptesAvant: number;
  soldeAcomptesApres: number;
  acomptesDansPeriode: number;
  totalAcomptes: number;
  acompteConsommePeriode: number;
  selectedPatronId: string | null;
  selectedPatronNom: string;
  fraisKilometriques: BilanKmResult;
  lieux?: Lieu[];
}

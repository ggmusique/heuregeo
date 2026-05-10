import { supabase } from "../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BilanStatusRow {
  ca_brut_periode: number | null;
  acompte_consomme: number | null;
  reste_a_percevoir: number | null;
  paye: boolean;
  date_paiement: string | null;
  periode_index: number;
  id: string;
}

export interface BilanStatusPrecedentRow {
  periode_index: number;
  reste_a_percevoir: number | null;
  paye: boolean;
}

export interface DiagAcompteRow {
  id: string;
  montant: number;
  date_acompte: string;
}

export interface DiagAllocationRow {
  acompte_id: string;
  amount: number;
  periode_index: number;
}

export interface DiagFraisKmRow {
  date_frais: string;
  distance_km: number;
  rate_per_km: number;
  amount: number;
  mission_id: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Numéro de semaine ISO → lundi (YYYY-MM-DD). */
export function isoWeekStart(wk: number, year: number = new Date().getFullYear()): string {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - (dow - 1) + (wk - 1) * 7);
  return d.toISOString().slice(0, 10);
}

/** Numéro de semaine ISO → dimanche (YYYY-MM-DD). */
export function isoWeekEnd(wk: number, year: number = new Date().getFullYear()): string {
  const d = new Date(isoWeekStart(wk, year));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

// ─── Requêtes API ─────────────────────────────────────────────────────────────

/** Bilan d'une semaine précise pour un patron donné. */
export const fetchBilanStatus = async (
  patronId: string,
  week: number
): Promise<{ data: BilanStatusRow | null; error: string | null }> => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("ca_brut_periode, acompte_consomme, reste_a_percevoir, paye, date_paiement, periode_index, id")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine")
    .eq("periode_index", week)
    .maybeSingle();

  return {
    data: data as BilanStatusRow | null,
    error: error ? `Bilan: ${error.message}` : null,
  };
};

/** Bilans des semaines précédentes non soldées pour un patron donné. */
export const fetchBilansPrecedents = async (
  patronId: string,
  beforeWeek: number
): Promise<{ data: BilanStatusPrecedentRow[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("periode_index, reste_a_percevoir, paye")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine")
    .lt("periode_index", beforeWeek)
    .or("paye.eq.false,reste_a_percevoir.gt.0");

  return {
    data: (data as BilanStatusPrecedentRow[]) ?? [],
    error: error ? `Précédents: ${error.message}` : null,
  };
};

/** Acomptes d'un patron (triés par date). */
export const fetchAcomptesDiag = async (
  patronId: string
): Promise<{ data: DiagAcompteRow[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("id, montant, date_acompte")
    .eq("patron_id", patronId)
    .order("date_acompte");

  return {
    data: (data as DiagAcompteRow[]) ?? [],
    error: error ? `Acomptes: ${error.message}` : null,
  };
};

/** Allocations d'acomptes d'un patron (triées par semaine). */
export const fetchAcompteAllocationsDiag = async (
  patronId: string
): Promise<{ data: DiagAllocationRow[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("acompte_id, amount, periode_index")
    .eq("patron_id", patronId)
    .order("periode_index");

  return {
    data: (data as DiagAllocationRow[]) ?? [],
    error: error ? `Allocations: ${error.message}` : null,
  };
};

/** Frais kilométriques d'un patron sur une semaine ISO donnée. */
export const fetchFraisKmDiag = async (
  patronId: string,
  week: number
): Promise<{ data: DiagFraisKmRow[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("frais_km")
    .select("date_frais, distance_km, rate_per_km, amount, mission_id")
    .eq("patron_id", patronId)
    .gte("date_frais", isoWeekStart(week))
    .lte("date_frais", isoWeekEnd(week))
    .order("date_frais");

  return {
    data: (data as DiagFraisKmRow[]) ?? [],
    error: error ? `Frais KM: ${error.message}` : null,
  };
};

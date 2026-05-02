import { supabase } from "./supabase.ts";
import { mapWeeklyAcompteMetricsFromRows } from "../lib/bilanMetrics.ts";

const TABLE = "bilans_status_v2";

export async function fetchLatestBilanStatus({ periodeType, periodeValue, patronId }: { periodeType: string; periodeValue: any; patronId: any }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("paye, reste_a_percevoir")
    .eq("periode_type", periodeType)
    .eq("periode_value", periodeValue)
    .eq("patron_id", patronId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data && data[0]) || null;
}

export async function fetchWeeklyBilansHistory({ patronId }: { patronId: any }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, periode_type, periode_value, periode_index, patron_id, paye, date_paiement, reste_a_percevoir, ca_brut_periode, acompte_consomme, created_at")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine")
    .order("periode_index", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAcompteAllocationsByPatron({ patronId }: { patronId: any }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("periode_index, amount")
    .eq("patron_id", patronId);

  if (error) throw error;
  return data || [];
}

export async function fetchUnpaidWeeklyBilansBefore({ patronId, beforePeriodeIndex }: { patronId: any; beforePeriodeIndex: any }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("periode_index, ca_brut_periode")
    .eq("periode_type", "semaine")
    .eq("patron_id", patronId)
    .lt("periode_index", beforePeriodeIndex)
    .eq("paye", false);

  if (error) throw error;
  return data || [];
}

export async function fetchAcompteAllocationsBefore({ patronId, beforePeriodeIndex }: { patronId: any; beforePeriodeIndex: any }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("periode_index, amount")
    .eq("patron_id", patronId)
    .lt("periode_index", beforePeriodeIndex);

  if (error) throw error;
  return data || [];
}

export async function fetchAcompteAmountsBefore({ patronId, beforePeriodeIndex }: { patronId: any; beforePeriodeIndex: any }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", patronId)
    .lt("periode_index", beforePeriodeIndex);

  if (error) throw error;
  return data || [];
}

export async function fetchWeeklyBilansForRepair({ patronId }: { patronId: any }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, periode_index, ca_brut_periode, acompte_consomme, reste_a_percevoir, paye")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine");

  if (error) throw error;
  return data || [];
}

export async function fetchBilanByPeriodAndPatron({ periodeType, periodeValue, patronId, columns = "id" }: { periodeType: string; periodeValue: any; patronId: any; columns?: string }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(columns)
    .eq("periode_type", periodeType)
    .eq("periode_value", periodeValue)
    .eq("patron_id", patronId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function insertBilanRow(payload: any) {
  const { error } = await supabase.from(TABLE).insert(payload);
  if (error) throw error;
}

export async function updateBilanRowById(id: any, payload: any) {
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) throw error;
}

export async function fetchWeeklyAcompteMetrics({ patronId, weekNum, debutPeriode, finPeriode }: { patronId: any; weekNum: any; debutPeriode: string; finPeriode: string }) {
  const periodStartIso = new Date(`${debutPeriode}T00:00:00`).toISOString();
  const periodEndExclusive = new Date(`${finPeriode}T00:00:00`);
  periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);

  const [allocsCetteSemaineRes, allocsJusquaRes, allocsAvantRes, allocsCreatedInPeriodRes, acomptesCumulesRes, acomptesPeriodeRes] = await Promise.all([
    supabase.from("acompte_allocations").select("amount").eq("patron_id", patronId).eq("periode_index", weekNum),
    supabase.from("acompte_allocations").select("amount").eq("patron_id", patronId).lte("periode_index", weekNum),
    supabase.from("acompte_allocations").select("amount").eq("patron_id", patronId).lt("periode_index", weekNum),
    supabase.from("acompte_allocations").select("amount, created_at").eq("patron_id", patronId).gte("created_at", periodStartIso).lt("created_at", periodEndExclusive.toISOString()),
    supabase.from("acomptes").select("montant").eq("patron_id", patronId).lte("date_acompte", finPeriode),
    supabase.from("acomptes").select("montant").eq("patron_id", patronId).gte("date_acompte", debutPeriode).lte("date_acompte", finPeriode),
  ]);

  const pairs = [allocsCetteSemaineRes, allocsJusquaRes, allocsAvantRes, allocsCreatedInPeriodRes, acomptesCumulesRes, acomptesPeriodeRes];
  for (const r of pairs) if (r.error) throw r.error;

  return mapWeeklyAcompteMetricsFromRows({
    allocsCetteSemaine: allocsCetteSemaineRes.data || [],
    allocsJusqua: allocsJusquaRes.data || [],
    allocsAvant: allocsAvantRes.data || [],
    allocsCreatedInPeriod: allocsCreatedInPeriodRes.data || [],
    acomptesCumules: acomptesCumulesRes.data || [],
    acomptesPeriode: acomptesPeriodeRes.data || [],
  });
}

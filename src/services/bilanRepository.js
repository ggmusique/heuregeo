import { supabase } from "./supabase";

const TABLE = "bilans_status_v2";

export async function fetchLatestBilanStatus({ periodeType, periodeValue, patronId }) {
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

export async function fetchWeeklyBilansHistory({ patronId }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, periode_type, periode_value, periode_index, patron_id, paye, date_paiement, reste_a_percevoir, ca_brut_periode, acompte_consomme, created_at")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine")
    .order("periode_index", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAcompteAllocationsByPatron({ patronId }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("periode_index, amount")
    .eq("patron_id", patronId);

  if (error) throw error;
  return data || [];
}


export async function fetchUnpaidWeeklyBilansBefore({ patronId, beforePeriodeIndex }) {
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

export async function fetchAcompteAllocationsBefore({ patronId, beforePeriodeIndex }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("periode_index, amount")
    .eq("patron_id", patronId)
    .lt("periode_index", beforePeriodeIndex);

  if (error) throw error;
  return data || [];
}


export async function fetchAcompteAmountsBefore({ patronId, beforePeriodeIndex }) {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", patronId)
    .lt("periode_index", beforePeriodeIndex);

  if (error) throw error;
  return data || [];
}


export async function fetchWeeklyBilansForRepair({ patronId }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, periode_index, ca_brut_periode, acompte_consomme, reste_a_percevoir, paye")
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine");

  if (error) throw error;
  return data || [];
}

import { supabase } from "../supabase";

/**
 * API pour les allocations d'acomptes
 *
 * Rôle :
 * - Ce fichier ne fait PAS de calcul métier.
 * - Il ne fait PAS d'interface.
 * - Il fait juste les appels à la base Supabase (table "acompte_allocations").
 *
 * hooks/useBilanAcomptes → allocationsApi → Supabase
 */

// ------------------------------------------------------------
// 1) Récupérer les allocations pour une semaine donnée
// ------------------------------------------------------------
export const fetchAllocationsByWeek = async ({ patronId, weekIndex }) => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", patronId)
    .eq("periode_index", weekIndex);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 2) Récupérer les allocations jusqu'à une semaine (inclus)
// ------------------------------------------------------------
export const fetchAllocationsUpToWeek = async ({ patronId, weekIndex }) => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", patronId)
    .lte("periode_index", weekIndex);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 3) Récupérer les allocations avant une semaine (exclu)
// ------------------------------------------------------------
export const fetchAllocationsBeforeWeek = async ({ patronId, weekIndex }) => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount")
    .eq("patron_id", patronId)
    .lt("periode_index", weekIndex);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 4) Récupérer les allocations créées dans une période (par date)
// ------------------------------------------------------------
export const fetchAllocationsInPeriod = async ({
  patronId,
  periodStartIso,
  periodEndIso,
}) => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("amount, created_at")
    .eq("patron_id", patronId)
    .gte("created_at", periodStartIso)
    .lt("created_at", periodEndIso);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 5) Récupérer toutes les allocations d'un patron (pour historique)
// ------------------------------------------------------------
export const fetchAllAllocations = async ({ patronId }) => {
  const { data, error } = await supabase
    .from("acompte_allocations")
    .select("periode_index, amount")
    .eq("patron_id", patronId);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 6) Récupérer les acomptes cumulés jusqu'à une date
// ------------------------------------------------------------
export const fetchAcomptesCumules = async ({ patronId, dateFin }) => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("montant")
    .eq("patron_id", patronId)
    .lte("date_acompte", dateFin);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 7) Récupérer les acomptes dans une période
// ------------------------------------------------------------
export const fetchAcomptesInPeriod = async ({
  patronId,
  dateDebut,
  dateFin,
}) => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("montant")
    .eq("patron_id", patronId)
    .gte("date_acompte", dateDebut)
    .lte("date_acompte", dateFin);

  if (error) throw error;
  return data || [];
};

import { supabase } from "../supabase";

/**
 * API pour les frais kilométriques
 *
 * Rôle :
 * - Ce fichier ne fait PAS de calcul métier.
 * - Il ne fait PAS d'interface.
 * - Il fait juste les appels à la base Supabase (table "frais_km").
 *
 * hooks/useBilanKm → fraisKmApi → Supabase
 */

// ------------------------------------------------------------
// 1) Upsert des lignes de frais kilométriques (INSERT/UPDATE)
// ------------------------------------------------------------
export const upsertFraisKm = async (rows) => {
  const { data, error } = await supabase
    .from("frais_km")
    .upsert(rows, { onConflict: "mission_id" })
    .select();

  if (error) throw error;
  return data;
};

// ------------------------------------------------------------
// 2) Récupérer les frais km pour une période
// ------------------------------------------------------------
export const fetchFraisKmByPatron = async ({ patronId }) => {
  const { data, error } = await supabase
    .from("frais_km")
    .select("*")
    .eq("patron_id", patronId);

  if (error) throw error;
  return data || [];
};

import { supabase } from "../supabase";

/**
 * API pour les lieux
 */

// ========= FETCH (READ) =========
export const fetchLieux = async () => {
  const { data, error } = await supabase
    .from("lieux")
    .select("*")
    .order("nom", { ascending: true });

  if (error) throw error;

  return data || [];
};

// ========= CREATE =========
export const createLieu = async (lieuData) => {
  console.log("🔵 API - createLieu appelée avec:", lieuData);

  const { data, error } = await supabase
    .from("lieux")
    .insert([lieuData])
    .select();

  if (error) {
    console.error("🔴 API - Erreur création lieu:", error);
    throw error;
  }

  console.log("🟢 API - Lieu créé:", data[0]);

  // ✅ Retourner le lieu créé (avec son ID)
  return data[0];
};

// ========= UPDATE =========
export const updateLieu = async (id, lieuData) => {
  const { data, error } = await supabase
    .from("lieux")
    .update(lieuData)
    .eq("id", id)
    .select();

  if (error) throw error;

  return data[0];
};

// ========= DELETE =========
export const deleteLieu = async (id) => {
  const { error } = await supabase.from("lieux").delete().eq("id", id);

  if (error) throw error;
};
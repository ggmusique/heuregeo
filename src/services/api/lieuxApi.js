import { supabase } from "../supabase";

/**
 * API pour les lieux
 */

// Colonnes autorisées sur la table lieux (whitelist anti colonne inconnue)
const LIEUX_COLUMNS = ["nom", "adresse_complete", "latitude", "longitude", "notes", "user_id"];

const sanitizeLieu = (data) =>
  Object.fromEntries(Object.entries(data).filter(([k]) => LIEUX_COLUMNS.includes(k)));

// ========= FETCH (READ) =========
export const fetchLieux = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("lieux")
    .select("*")
    .eq("user_id", user.id)
    .order("nom", { ascending: true });

  if (error) throw error;

  return data || [];
};

// ========= CREATE =========
export const createLieu = async (lieuData) => {
  console.log("🔵 API - createLieu appelée avec:", lieuData);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const payload = sanitizeLieu({ ...lieuData, user_id: user.id });

  const { data, error } = await supabase
    .from("lieux")
    .insert([payload])
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
    .update(sanitizeLieu(lieuData))
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
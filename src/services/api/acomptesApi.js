import { supabase } from "../supabase";

/**
 * API pour les acomptes
 */

export const fetchAcomptes = async () => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("*")
    .order("date_acompte", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createAcompte = async (acompteData) => {
  const { data, error } = await supabase
    .from("acomptes")
    .insert([acompteData])
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteAcompte = async (id) => {
  const { error } = await supabase.from("acomptes").delete().eq("id", id);

  if (error) throw error;
};

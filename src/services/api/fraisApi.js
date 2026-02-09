import { supabase } from "../supabase";

/**
 * API pour les frais divers
 */

export const fetchFrais = async () => {
  const { data, error } = await supabase
    .from("frais_divers")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  if (error) throw error;
  return data || [];
};

export const createFrais = async (fraisData) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .insert([fraisData])
    .select();

  if (error) throw error;
  return data[0];
};

export const updateFrais = async (id, fraisData) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .update(fraisData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteFrais = async (id) => {
  const { error } = await supabase.from("frais_divers").delete().eq("id", id);

  if (error) throw error;
};

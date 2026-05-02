import { supabase } from "../supabase";

export const fetchFrais = async () => {
  const { data, error } = await supabase
    .from("frais_divers")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  if (error) throw error;
  return data || [];
};

export const createFrais = async (fraisData: any) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .insert([fraisData])
    .select();

  if (error) throw error;
  return data[0];
};

export const updateFrais = async (id: any, fraisData: any) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .update(fraisData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteFrais = async (id: any) => {
  const { error } = await supabase.from("frais_divers").delete().eq("id", id);
  if (error) throw error;
};

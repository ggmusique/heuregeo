import { supabase } from "../supabase";

export const fetchFraisKm = async () => {
  const { data, error } = await supabase
    .from("frais_km")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  if (error) throw error;
  return data || [];
};

export const createFraisKm = async (row) => {
  const { data, error } = await supabase.from("frais_km").insert([row]).select();
  if (error) throw error;
  return data?.[0];
};

export const updateFraisKm = async (id, row) => {
  const { data, error } = await supabase.from("frais_km").update(row).eq("id", id).select();
  if (error) throw error;
  return data?.[0];
};

export const deleteFraisKm = async (id) => {
  const { error } = await supabase.from("frais_km").delete().eq("id", id);
  if (error) throw error;
};

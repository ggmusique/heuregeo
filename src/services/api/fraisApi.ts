import { supabase } from "../supabase";
import type { FraisDivers } from "../../types/entities";

export const fetchFrais = async () => {
  const { data, error } = await supabase
    .from("frais_divers")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  if (error) throw error;
  return data || [];
};

export const createFrais = async (fraisData: Partial<FraisDivers>) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .insert([fraisData])
    .select();

  if (error) throw error;
  return data[0];
};

export const updateFrais = async (id: string, fraisData: Partial<FraisDivers>) => {
  const { data, error } = await supabase
    .from("frais_divers")
    .update(fraisData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteFrais = async (id: string) => {
  const { error } = await supabase.from("frais_divers").delete().eq("id", id);
  if (error) throw error;
};

import { supabase } from "../supabase.ts";
import type { FraisDivers } from "../../types/entities.ts";
import type { FraisKmRow } from "../../types/bilan.ts";

export const fetchFrais = async (): Promise<FraisDivers[]> => {
  const { data, error } = await supabase
    .from("frais_divers")
    .select("*")
    .order("date_frais", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data || []) as FraisDivers[];
};

export const createFrais = async (fraisData: Partial<FraisDivers>): Promise<FraisDivers> => {
  const { data, error } = await supabase
    .from("frais_divers")
    .insert([fraisData])
    .select();

  if (error) throw error;
  return data[0] as FraisDivers;
};

export const updateFrais = async (id: string, fraisData: Partial<FraisDivers>): Promise<FraisDivers> => {
  const { data, error } = await supabase
    .from("frais_divers")
    .update(fraisData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0] as FraisDivers;
};

export const deleteFrais = async (id: string): Promise<void> => {
  const { error } = await supabase.from("frais_divers").delete().eq("id", id);
  if (error) throw error;
};

export const upsertFraisKm = async (rows: FraisKmRow[]): Promise<void> => {
  const { error } = await supabase.from("frais_km").upsert(rows, { onConflict: "mission_id" });
  if (error) throw error;
};

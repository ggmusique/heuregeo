import { supabase } from "../supabase";
import type { FraisDivers } from "../../types/entities";
import type { FraisKmRow } from "../../types/bilan";
import { sanitizeText } from "../../utils/sanitize";

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
    .insert([{
      ...fraisData,
      ...(fraisData.description != null && { description: sanitizeText(fraisData.description) }),
    }])
    .select();

  if (error) throw error;
  return data[0] as FraisDivers;
};

export const updateFrais = async (id: string, fraisData: Partial<FraisDivers>): Promise<FraisDivers> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const { data, error } = await supabase
    .from("frais_divers")
    .update({
      ...fraisData,
      ...(fraisData.description != null && { description: sanitizeText(fraisData.description) }),
    })
    .eq("id", id)
    .eq("user_id", user.id)  // défense en profondeur : ownership explicite
    .select();

  if (error) throw error;
  return data[0] as FraisDivers;
};

export const deleteFrais = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const { error } = await supabase
    .from("frais_divers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);  // défense en profondeur : ownership explicite
  if (error) throw error;
};

export const upsertFraisKm = async (rows: FraisKmRow[]): Promise<void> => {
  const { error } = await supabase.from("frais_km").upsert(rows, { onConflict: "mission_id" });
  if (error) throw error;
};

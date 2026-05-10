import { supabase } from "../supabase";
import type { Patron } from "../../types/entities";
import { sanitizeName } from "../../utils/sanitize";

export type PatronInsert = Omit<Patron, "id" | "created_at">;
export type PatronUpdate = Partial<Omit<Patron, "id" | "user_id" | "created_at">>;

export const fetchPatrons = async (userId: string): Promise<Patron[]> => {
  const { data, error } = await supabase
    .from("patrons")
    .select("*")
    .eq("actif", true)
    .eq("user_id", userId)
    .order("nom", { ascending: true });

  if (error) throw error;
  return (data || []) as Patron[];
};

export const createPatron = async (patronData: PatronInsert): Promise<Patron> => {
  const { data, error } = await supabase
    .from("patrons")
    .insert([{ ...patronData, nom: sanitizeName(patronData.nom) }])
    .select()
    .single();

  if (error) throw error;
  return data as Patron;
};

export const updatePatron = async (patronId: string, updates: PatronUpdate): Promise<Patron> => {
  const sanitized: PatronUpdate = {
    ...updates,
    ...(updates.nom != null && { nom: sanitizeName(updates.nom) }),
  };
  const { data, error } = await supabase
    .from("patrons")
    .update(sanitized)
    .eq("id", patronId)
    .select()
    .single();

  if (error) throw error;
  return data as Patron;
};

export const deletePatron = async (patronId: string): Promise<void> => {
  const { error } = await supabase
    .from("patrons")
    .update({ actif: false })
    .eq("id", patronId);

  if (error) throw error;
};

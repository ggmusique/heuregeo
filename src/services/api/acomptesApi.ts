import { supabase } from "../supabase.ts";
import type { Acompte } from "../../types/entities.ts";

export const fetchAcomptes = async (): Promise<Acompte[]> => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("*")
    .order("date_acompte", { ascending: false });

  if (error) throw error;
  return (data || []) as Acompte[];
};

export const createAcompte = async (acompteData: Partial<Acompte>): Promise<{ acompte: Acompte | null; autoPayApplied: boolean; autoPayError: null }> => {
  const { data, error } = await supabase
    .from("acomptes")
    .insert([acompteData])
    .select("id, montant, date_acompte, patron_id")
    .single();

  if (error) throw error;

  return {
    acompte: data as Acompte | null,
    autoPayApplied: false,
    autoPayError: null,
  };
};

export const deleteAcompte = async (id: string): Promise<void> => {
  const { error } = await supabase.from("acomptes").delete().eq("id", id);
  if (error) throw error;
};

export const applyAcompte = async (acompteId: string): Promise<void> => {
  const { error } = await supabase.rpc("apply_acompte", { p_acompte_id: acompteId });
  if (error) throw error;
};

export const unapplyAcompte = async (acompteId: string): Promise<void> => {
  const { error } = await supabase.rpc("unapply_acompte", { p_acompte_id: acompteId });
  if (error) throw error;
};

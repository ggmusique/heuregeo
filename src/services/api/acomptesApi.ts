import { supabase } from "../supabase";

export const fetchAcomptes = async () => {
  const { data, error } = await supabase
    .from("acomptes")
    .select("*")
    .order("date_acompte", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createAcompte = async (acompteData: any) => {
  const { data, error } = await supabase
    .from("acomptes")
    .insert([acompteData])
    .select("id, montant, date_acompte, patron_id")
    .single();

  if (error) throw error;

  return {
    acompte: data,
    autoPayApplied: false,
    autoPayError: null,
  };
};

export const deleteAcompte = async (id: any) => {
  const { error } = await supabase.from("acomptes").delete().eq("id", id);
  if (error) throw error;
};

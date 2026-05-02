import { supabase } from "../supabase.ts";

const LIEUX_COLUMNS = ["nom", "adresse_complete", "latitude", "longitude", "notes", "user_id", "type"];

const sanitizeLieu = (data: Record<string, any>) =>
  Object.fromEntries(Object.entries(data).filter(([k]) => LIEUX_COLUMNS.includes(k)));

export const fetchLieux = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("lieux")
    .select("*")
    .eq("user_id", user.id)
    .order("nom", { ascending: true });

  if (error) throw error;

  return (data || []).map((l) => ({
    ...l,
    latitude: l.latitude != null ? Number(l.latitude) : null,
    longitude: l.longitude != null ? Number(l.longitude) : null,
  }));
};

export const createLieu = async (lieuData: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const payload = sanitizeLieu({ ...lieuData, user_id: user.id });

  const { data, error } = await supabase
    .from("lieux")
    .insert([payload])
    .select();

  if (error) {
    console.error("🔴 API - Erreur création lieu:", error);
    throw error;
  }

  return data[0];
};

export const updateLieu = async (id: any, lieuData: any) => {
  const { data, error } = await supabase
    .from("lieux")
    .update(sanitizeLieu(lieuData))
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteLieu = async (id: any) => {
  const { error } = await supabase.from("lieux").delete().eq("id", id);
  if (error) throw error;
};

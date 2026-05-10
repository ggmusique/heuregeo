import { supabase } from "../supabase";
import { sanitizeName } from "../../utils/sanitize";

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

  const raw: Record<string, unknown> = { ...lieuData, user_id: user.id };
  if (typeof raw.nom === "string") raw.nom = sanitizeName(raw.nom);
  if (typeof raw.adresse_complete === "string") raw.adresse_complete = sanitizeName(raw.adresse_complete);
  const payload = sanitizeLieu(raw);

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
  const raw: Record<string, unknown> = { ...lieuData };
  if (typeof raw.nom === "string") raw.nom = sanitizeName(raw.nom);
  if (typeof raw.adresse_complete === "string") raw.adresse_complete = sanitizeName(raw.adresse_complete);
  const { data, error } = await supabase
    .from("lieux")
    .update(sanitizeLieu(raw))
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteLieu = async (id: any) => {
  const { error } = await supabase.from("lieux").delete().eq("id", id);
  if (error) throw error;
};

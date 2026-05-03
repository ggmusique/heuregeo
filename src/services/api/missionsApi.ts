import { supabase } from "../supabase.ts";
import type { Mission } from "../../types/entities.ts";

export const fetchMissions = async (): Promise<Mission[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, patron_id")
    .eq("id", user.id)
    .single();

  const isViewer = profileData?.role === "viewer";

  let query = supabase
    .from("missions")
    .select("*")
    .order("date_mission", { ascending: false, nullsFirst: false })
    .order("date_iso", { ascending: false });

  if (!isViewer) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as Mission[];
};

export const createMission = async (missionData: Partial<Mission>): Promise<Mission> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const payload: Record<string, unknown> = { ...missionData, user_id: user.id };
  if (payload.date_iso && !payload.date_mission) {
    payload.date_mission = payload.date_iso;
  }

  const { data, error } = await supabase
    .from("missions")
    .insert([payload])
    .select();

  if (error) {
    console.error("🔴 API - Erreur Supabase:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  return data[0] as Mission;
};

export const updateMission = async (id: string, missionData: Partial<Mission>): Promise<Mission> => {
  const payload: Record<string, unknown> = { ...missionData };
  if (payload.date_iso) {
    payload.date_mission = payload.date_iso;
  }

  const { data, error } = await supabase
    .from("missions")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) {
    console.error("🔴 API - Erreur Supabase (update):", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  return data[0] as Mission;
};

export const deleteMission = async (id: string): Promise<void> => {
  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) throw error;
};

export const bulkInsertMissions = async (missionsArray: Partial<Mission>[]): Promise<Mission[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const payloads = missionsArray.map((m) => ({
    ...m,
    user_id: user.id,
    date_mission: m.date_iso,
  }));

  const { data, error } = await supabase
    .from("missions")
    .insert(payloads)
    .select();

  if (error) throw error;
  return (data || []) as Mission[];
};

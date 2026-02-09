import { supabase } from "../supabase";

/**
 * API pour les missions
 */

export const fetchMissions = async () => {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("date_iso", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createMission = async (missionData) => {
  const { data, error } = await supabase
    .from("missions")
    .insert([missionData])
    .select();

  if (error) throw error;
  return data[0];
};

export const updateMission = async (id, missionData) => {
  const { data, error } = await supabase
    .from("missions")
    .update(missionData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteMission = async (id) => {
  const { error } = await supabase.from("missions").delete().eq("id", id);

  if (error) throw error;
};

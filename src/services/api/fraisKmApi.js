import { supabase } from "../supabase";

const normalizeMissionId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const cleanPayload = (row = {}) => {
  const cleaned = {
    ...row,
    mission_id: normalizeMissionId(row.mission_id),
  };

  Object.keys(cleaned).forEach((k) => {
    if (cleaned[k] === undefined) delete cleaned[k];
  });

  return cleaned;
};

export const fetchFraisKm = async () => {
  const { data, error } = await supabase
    .from("frais_km")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  if (error) {
    console.error("Erreur fetch frais_km:", error);
    throw error;
  }
  return data || [];
};

export const createFraisKm = async (row) => {
  const { data: authData } = await supabase.auth.getUser();
  const authUserId = authData?.user?.id || null;

  const basePayload = cleanPayload({
    ...row,
    user_id: row?.user_id || authUserId,
  });

  const tryInsert = async (payload) =>
    supabase.from("frais_km").insert([payload]).select().single();

  let result = await tryInsert(basePayload);

  if (result.error) {
    let msg = (result.error?.message || "").toLowerCase();

    // Compatibilité si le schéma local n'a pas encore toutes les colonnes
    if (msg.includes("column") && msg.includes("user_id")) {
      const { user_id, ...withoutUserId } = basePayload;
      result = await tryInsert(withoutUserId);
      msg = (result.error?.message || "").toLowerCase();
    }

    if (result.error && msg.includes("column") && msg.includes("notes")) {
      const { notes, ...withoutNotes } = basePayload;
      result = await tryInsert(withoutNotes);
      msg = (result.error?.message || "").toLowerCase();
    }

    if (result.error && msg.includes("column") && msg.includes("source")) {
      const { source, ...withoutSource } = basePayload;
      result = await tryInsert(withoutSource);
    }
  }

  if (result.error) {
    console.error("Erreur create frais_km:", {
      error: result.error,
      payload: basePayload,
    });
    throw result.error;
  }

  return result.data;
};

export const updateFraisKm = async (id, row) => {
  const payload = cleanPayload(row);
  const { data, error } = await supabase
    .from("frais_km")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFraisKm = async (id) => {
  const { error } = await supabase.from("frais_km").delete().eq("id", id);
  if (error) throw error;
};

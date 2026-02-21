import { supabase } from "../supabase";

/**
 * API pour les missions
 *
 * Rôle :
 * - Ce fichier ne gère PAS l'interface (pas de React ici).
 * - Il ne fait PAS de calcul métier.
 * - Il fait seulement les appels à Supabase (la base de données).
 *
 * App.jsx -> useMissions -> missionsApi -> Supabase
 */

// ------------------------------------------------------------
// 1) LIRE toutes les missions (READ)
// ------------------------------------------------------------
export const fetchMissions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Récupère le profil pour savoir si viewer
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, patron_id")
    .eq("id", user.id)
    .single();

  const isViewer = profileData?.role === "viewer";

  let query = supabase
    .from("missions")
    .select("*")
    .order("date_iso", { ascending: false });

  // Viewer : la RLS Supabase gère déjà le filtrage par patron_id
  // Owner : on filtre par user_id
  if (!isViewer) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

// ------------------------------------------------------------
// 2) CRÉER une mission (CREATE)
// ------------------------------------------------------------
export const createMission = async (missionData) => {
  // ✅ LOG : Voir ce qui arrive dans l'API
  console.log("🔵 API - createMission appelée avec:", {
    missionData,
    types: {
      client_id: typeof missionData.client_id,
      lieu_id: typeof missionData.lieu_id,
      patron_id: typeof missionData.patron_id,
    },
    values: {
      client_id: missionData.client_id,
      lieu_id: missionData.lieu_id,
      patron_id: missionData.patron_id,
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non connecté");

  const payload = { ...missionData, user_id: user.id };

  const { data, error } = await supabase
    .from("missions")
    .insert([payload])
    .select();

  // ✅ LOG : Voir l'erreur détaillée si échec
  if (error) {
    console.error("🔴 API - Erreur Supabase:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  // ✅ LOG : Succès
  console.log("🟢 API - Mission créée:", data[0]);

  return data[0];
};

// ------------------------------------------------------------
// 3) MODIFIER une mission (UPDATE)
// ------------------------------------------------------------
export const updateMission = async (id, missionData) => {
  // ✅ LOG : Voir ce qui arrive dans l'API
  console.log("🔵 API - updateMission appelée avec:", {
    id,
    missionData,
    types: {
      client_id: typeof missionData.client_id,
      lieu_id: typeof missionData.lieu_id,
      patron_id: typeof missionData.patron_id,
    },
  });

  const { data, error } = await supabase
    .from("missions")
    .update(missionData)
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

  console.log("🟢 API - Mission mise à jour:", data[0]);

  return data[0];
};

// ------------------------------------------------------------
// 4) SUPPRIMER une mission (DELETE)
// ------------------------------------------------------------
export const deleteMission = async (id) => {
  const { error } = await supabase.from("missions").delete().eq("id", id);

  if (error) throw error;
};
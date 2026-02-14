import { supabase } from "../supabase";

/**
 * API pour les missions
 *
 * Rôle :
 * - Ce fichier ne gère PAS l’interface (pas de React ici).
 * - Il ne fait PAS de calcul métier.
 * - Il fait seulement les appels à Supabase (la base de données).
 *
 * App.jsx -> useMissions -> missionsApi -> Supabase
 */

// ------------------------------------------------------------
// 1) LIRE toutes les missions (READ)
// ------------------------------------------------------------
export const fetchMissions = async () => {
  // .from("missions") = la table "missions" dans Supabase
  // .select("*") = toutes les colonnes
  // .order("date_iso", { ascending: false }) = tri par date décroissante (les plus récentes en haut)
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("date_iso", { ascending: false });

  // Si Supabase renvoie une erreur, on la “propage”
  // => useMissions catch l’erreur et affiche un message dans l’app
  if (error) throw error;

  // data = tableau des missions (ou [] si vide)
  return data || [];
};

// ------------------------------------------------------------
// 2) CRÉER une mission (CREATE)
// ------------------------------------------------------------
export const createMission = async (missionData) => {
  // .insert([missionData]) = ajoute une ligne dans la table
  // On met entre [] car Supabase insert attend un tableau d’objets
  // .select() = demande à Supabase de nous renvoyer la ligne créée
  const { data, error } = await supabase
    .from("missions")
    .insert([missionData])
    .select();

  if (error) throw error;

  // data est un tableau (même si 1 seule ligne), donc on renvoie data[0]
  return data[0];
};

// ------------------------------------------------------------
// 3) MODIFIER une mission (UPDATE)
// ------------------------------------------------------------
export const updateMission = async (id, missionData) => {
  // .update(missionData) = remplace les champs envoyés
  // .eq("id", id) = “où id = ...” (on cible la ligne à modifier)
  // .select() = renvoie la mission mise à jour
  const { data, error } = await supabase
    .from("missions")
    .update(missionData)
    .eq("id", id)
    .select();

  if (error) throw error;

  // data[0] = la mission mise à jour
  return data[0];
};

// ------------------------------------------------------------
// 4) SUPPRIMER une mission (DELETE)
// ------------------------------------------------------------
export const deleteMission = async (id) => {
  // .delete() = supprime
  // .eq("id", id) = seulement la mission dont l’id correspond
  const { error } = await supabase.from("missions").delete().eq("id", id);

  if (error) throw error;
};

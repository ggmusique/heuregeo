import { supabase } from "../supabase";

/**
 * API pour les frais divers
 *
 * Rôle :
 * - Ce fichier fait UNIQUEMENT les appels Supabase (table "frais_divers")
 * - Pas de calcul ici, pas d’UI : juste CRUD (Lire, Créer, Modifier, Supprimer)
 *
 * App.jsx -> useFrais -> fraisApi -> Supabase
 */

// ------------------------------------------------------------
// 1) LIRE tous les frais (READ)
// ------------------------------------------------------------
export const fetchFrais = async () => {
  // Table: "frais_divers"
  // order("date_frais", ascending) = plus ancien en haut (ordre chronologique)
  // nullsLast: true = si un frais n’a pas de date, il part à la fin
  const { data, error } = await supabase
    .from("frais_divers")
    .select("*")
    .order("date_frais", { ascending: true, nullsLast: true });

  // Si Supabase renvoie une erreur, on la remonte au hook useFrais
  if (error) throw error;

  // data = tableau de frais (ou [] si aucun)
  return data || [];
};

// ------------------------------------------------------------
// 2) CRÉER un frais (CREATE)
// ------------------------------------------------------------
export const createFrais = async (fraisData) => {
  // insert([fraisData]) = ajoute une ligne
  // select() = renvoie la ligne créée
  const { data, error } = await supabase
    .from("frais_divers")
    .insert([fraisData])
    .select();

  if (error) throw error;

  // Supabase renvoie un tableau même si 1 seule ligne
  return data[0];
};

// ------------------------------------------------------------
// 3) MODIFIER un frais (UPDATE)
// ------------------------------------------------------------
export const updateFrais = async (id, fraisData) => {
  // update(fraisData) = remplace les champs fournis
  // eq("id", id) = uniquement le frais qui a cet id
  // select() = renvoie la ligne mise à jour
  const { data, error } = await supabase
    .from("frais_divers")
    .update(fraisData)
    .eq("id", id)
    .select();

  if (error) throw error;

  return data[0];
};

// ------------------------------------------------------------
// 4) SUPPRIMER un frais (DELETE)
// ------------------------------------------------------------
export const deleteFrais = async (id) => {
  // delete() = supprime
  // eq("id", id) = uniquement la ligne correspondante
  const { error } = await supabase.from("frais_divers").delete().eq("id", id);

  if (error) throw error;
};

import { supabase } from "../supabase";

/**
 * API pour les acomptes
 *
 * Rôle :
 * - Ce fichier ne fait PAS de calcul.
 * - Il ne fait PAS d’interface.
 * - Il fait juste les appels à la base Supabase (table "acomptes").
 *
 * App.jsx -> useAcomptes -> acomptesApi -> Supabase
 */

// ------------------------------------------------------------
// 1) LIRE tous les acomptes (READ)
// ------------------------------------------------------------
export const fetchAcomptes = async () => {
  // Table: "acomptes"
  // select("*") = toutes les colonnes
  // order("date_acompte", descending) = les acomptes les plus récents en haut
  const { data, error } = await supabase
    .from("acomptes")
    .select("*")
    .order("date_acompte", { ascending: false });

  // Si la DB répond "pas OK", on renvoie l’erreur au hook useAcomptes
  if (error) throw error;

  // data = tableau d’acomptes (ou [] si aucun)
  return data || [];
};

// ------------------------------------------------------------
// 2) CRÉER un acompte (CREATE) + déclencher apply_acompte
// ------------------------------------------------------------
export const createAcompte = async (acompteData) => {
  // insert([acompteData]) = ajoute une ligne (entre [] car Supabase attend un tableau)
  // select("id") + single() = récupère l'id exact de l'acompte créé
  const { data, error } = await supabase
    .from("acomptes")
    .insert([acompteData])
    .select("id, montant, date_acompte, patron_id")
    .single();

  if (error) throw error;

  // L'auto-paiement (apply_acompte RPC) est géré par l'appelant (useAcomptes)
  // pour éviter un double appel et permettre un verrou par acompteId.
  return {
    acompte: data,
    autoPayApplied: false,
    autoPayError: null,
  };
};

// ------------------------------------------------------------
// 3) SUPPRIMER un acompte (DELETE)
// ------------------------------------------------------------
export const deleteAcompte = async (id) => {
  // delete() = supprime
  // eq("id", id) = uniquement la ligne dont l’id correspond
  const { error } = await supabase.from("acomptes").delete().eq("id", id);

  if (error) throw error;
};

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
  // select() = demande à Supabase de renvoyer la ligne créée
  const { data, error } = await supabase
    .from("acomptes")
    .insert([acompteData])
    .select();

  if (error) throw error;

  // Supabase renvoie un tableau même pour 1 insertion -> on prend le 1er élément
  const newAcompte = data[0];

  // Déclencher l'auto-paiement côté DB via la fonction SQL apply_acompte
  const { error: rpcError } = await supabase.rpc("apply_acompte", {
    p_acompte_id: newAcompte.id,
  });

  if (rpcError) throw rpcError;

  return newAcompte;
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

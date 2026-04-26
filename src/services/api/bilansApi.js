import { supabase } from "../supabase";

/**
 * API pour les bilans
 *
 * Rôle :
 * - Ce fichier ne fait PAS de calcul métier.
 * - Il ne fait PAS d'interface.
 * - Il fait juste les appels à la base Supabase (table "bilans_status_v2").
 *
 * hooks/useBilan → bilansApi → Supabase
 */

// ------------------------------------------------------------
// 1) LIRE un bilan par période et patron (READ)
// ------------------------------------------------------------
export const fetchBilanByPeriode = async ({
  periodeType,
  periodeValue,
  patronId,
}) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("id, ca_brut_periode, paye, reste_a_percevoir")
    .eq("periode_type", periodeType)
    .eq("periode_value", periodeValue)
    .eq("patron_id", patronId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// ------------------------------------------------------------
// 2) CRÉER un bilan (CREATE)
// ------------------------------------------------------------
export const createBilan = async (bilanData) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .insert([bilanData])
    .select();

  if (error) throw error;
  return data?.[0] || null;
};

// ------------------------------------------------------------
// 3) METTRE À JOUR un bilan (UPDATE)
// ------------------------------------------------------------
export const updateBilan = async (id, bilanData) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .update(bilanData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0] || null;
};

// ------------------------------------------------------------
// 4) UPsert bilan : insère ou met à jour selon la période/patron
// ------------------------------------------------------------
export const upsertBilanPeriode = async ({
  userId,
  periodeType,
  periodeValue,
  periodeIndex,
  patronId,
  caBrutPeriode,
  paye = false,
  datePaiement = null,
  acompteConsomme = 0,
  resteAPercevoir = 0,
}) => {
  // 1) Chercher un bilan existant
  const existing = await fetchBilanByPeriode({
    periodeType,
    periodeValue,
    patronId,
  });

  if (!existing?.id) {
    // 2a) Insert
    return createBilan({
      user_id: userId,
      periode_type: periodeType,
      periode_value: periodeValue,
      periode_index: periodeIndex,
      patron_id: patronId,
      ca_brut_periode: caBrutPeriode,
      paye,
      date_paiement: datePaiement,
      acompte_consomme: acompteConsomme,
      reste_a_percevoir: resteAPercevoir,
    });
  }

  // 2b) Update
  return updateBilan(existing.id, {
    ca_brut_periode: caBrutPeriode,
    periode_index: periodeIndex,
    acompte_consomme: acompteConsomme,
    reste_a_percevoir: paye ? 0 : resteAPercevoir,
  });
};

// ------------------------------------------------------------
// 5) Marquer un bilan comme payé
// ------------------------------------------------------------
export const markBilanPaye = async ({
  periodeType,
  periodeValue,
  patronId,
  userId,
  caBrutPeriode,
}) => {
  const existing = await fetchBilanByPeriode({
    periodeType,
    periodeValue,
    patronId,
  });

  if (!existing?.id) {
    // Insérer un nouveau bilan marqué payé
    return createBilan({
      user_id: userId,
      periode_type: periodeType,
      periode_value: periodeValue,
      periode_index: parseInt(periodeValue, 10) || 0,
      patron_id: patronId,
      ca_brut_periode: caBrutPeriode,
      paye: true,
      date_paiement: new Date().toISOString(),
      reste_a_percevoir: 0,
      acompte_consomme: 0,
    });
  }

  // Mettre à jour le bilan existant
  return updateBilan(existing.id, {
    paye: true,
    date_paiement: new Date().toISOString(),
    reste_a_percevoir: 0,
  });
};

// ------------------------------------------------------------
// 6) Récupérer le statut de paiement (paye + reste_a_percevoir)
// ------------------------------------------------------------
export const fetchBilanStatutPaiement = async ({
  periodeType,
  periodeValue,
  patronId,
}) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("paye, reste_a_percevoir")
    .eq("periode_type", periodeType)
    .eq("periode_value", periodeValue)
    .eq("patron_id", patronId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
};

// ------------------------------------------------------------
// 7) Récupérer les bilans impayés avant une semaine donnée
// ------------------------------------------------------------
export const fetchBilansImpayesAvant = async ({ patronId, weekIndex }) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("periode_index, ca_brut_periode")
    .eq("periode_type", "semaine")
    .eq("patron_id", patronId)
    .lt("periode_index", weekIndex)
    .eq("paye", false);

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 8) Récupérer l'historique des bilans pour un patron
// ------------------------------------------------------------
export const fetchBilansHistorique = async ({ patronId }) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select(
      "id, periode_type, periode_value, periode_index, patron_id, paye, date_paiement, reste_a_percevoir, ca_brut_periode, acompte_consomme, created_at"
    )
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine")
    .order("periode_index", { ascending: false });

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 9) Récupérer tous les bilans d'un patron pour réparation
// ------------------------------------------------------------
export const fetchBilansForRepair = async ({ patronId }) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select(
      "id, periode_index, ca_brut_periode, acompte_consomme, reste_a_percevoir, paye"
    )
    .eq("patron_id", patronId)
    .eq("periode_type", "semaine");

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------
// 10) Mettre à jour un bilan pour réparation (by id)
// ------------------------------------------------------------
export const repairBilanRow = async (id, updatePayload) => {
  const { error } = await supabase
    .from("bilans_status_v2")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
};

// ------------------------------------------------------------
// 11) Chercher un bilan par période (id only, pour rebuild)
// ------------------------------------------------------------
export const fetchBilanIdByPeriode = async ({
  periodeType,
  periodeValue,
  patronId,
}) => {
  const { data, error } = await supabase
    .from("bilans_status_v2")
    .select("id")
    .eq("periode_type", periodeType)
    .eq("periode_value", periodeValue)
    .eq("patron_id", patronId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

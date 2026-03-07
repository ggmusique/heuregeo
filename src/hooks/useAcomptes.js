import { useState, useCallback, useRef } from "react";
import * as acomptesApi from "../services/api/acomptesApi";
import { supabase } from "../services/supabase";
import { calculerSoldeAcomptesAvant } from "../utils/calculators";

/**
 * ==========================================
 * HOOK useAcomptes
 * ==========================================
 * Rôle :
 * - Charger / créer / supprimer des acomptes (via l’API Supabase)
 * - Donner des calculs utiles au bilan :
 *   - total acomptes dans une période
 *   - solde acompte avant une date
 *   - cumul d’acomptes jusqu’à une date (le fameux fix “semaine impayée”)
 *
 * Où ça sert dans l’app (App.jsx) :
 * - Quand tu ouvres la modal “+ Acompte” => createAcompte()
 * - Quand le bilan se calcule => getSoldeAvant(), getAcomptesDansPeriode(), getTotalAcomptesJusqua()
 */
export const useAcomptes = (missions = [], fraisDivers = [], onError) => {
  // ==========================================
  // STATE : données et état de chargement
  // ==========================================
  const [listeAcomptes, setListeAcomptes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref : évite de relancer fetchAcomptes 2 fois en même temps
  const isFetching = useRef(false);

  // Ref : évite un double-submit sur createAcompte
  const isCreating = useRef(false);

  // Set : verrou par acompteId pour éviter double apply_acompte sur le même acompte
  const appliedAcompteIds = useRef(new Set());

  /**
   * ==========================================
   * 1) Charger tous les acomptes (API)
   * ==========================================
   * Appelé au démarrage dans App.jsx (useEffect)
   */
  const fetchAcomptes = useCallback(async () => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);

      const data = await acomptesApi.fetchAcomptes();

      // On stocke en local dans le state
      setListeAcomptes(data || []);

      return data || [];
    } catch (err) {
      console.error("Erreur fetch acomptes:", err);
      onError?.("Erreur chargement acomptes");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

/**
 * ==========================================
 * 2) Créer un acompte (API) + AUTO-PAIEMENT via RPC
 * ==========================================
 * Utilisé quand tu valides la modal "+ Acompte"
 * => On ajoute direct l'acompte dans la liste (optimiste)
 * => La RPC apply_acompte est déclenchée côté DB
 */
const createAcompte = useCallback(
  async (acompteData) => {
    if (!acompteData) {
      throw new Error("Données de l'acompte manquantes");
    }

    // Protection double-submit
    if (isCreating.current) {
      throw new Error("Enregistrement d'acompte en cours");
    }
    isCreating.current = true;

    try {
      setLoading(true);

      const result = await acomptesApi.createAcompte(acompteData);
      const newAcompte = result?.acompte || null;

      let autoPayApplied = false;

      if (newAcompte) {
        setListeAcomptes((prev) => [newAcompte, ...prev]);

        const acompteId = newAcompte.id;

        // Verrou par acompteId : évite de déclencher apply_acompte deux fois
        // pour le même acompte (ex: re-render, double-appel accidentel)
        if (appliedAcompteIds.current.has(acompteId)) {
          console.warn("APPLY_ACOMPTE:skip (already applied)", { acompteId });
        } else {
          appliedAcompteIds.current.add(acompteId);
          console.log("APPLY_ACOMPTE:start", { acompteId });

          const { error: applyError } = await supabase.rpc("apply_acompte", {
            p_acompte_id: acompteId,
          });

          if (applyError) {
            appliedAcompteIds.current.delete(acompteId);
            console.error("Erreur apply_acompte:", applyError);
            throw applyError;
          }

          autoPayApplied = true;
          console.log("APPLY_ACOMPTE:end", { acompteId });

          // Log de vérification : total_alloue rechargé depuis acompte_allocations
          const { data: allocations } = await supabase
            .from("acompte_allocations")
            .select("amount")
            .eq("acompte_id", acompteId);
          const totalAlloue = (allocations || []).reduce(
            (sum, a) => sum + (parseFloat(a.amount) || 0),
            0
          );
          console.log("APPLY_ACOMPTE:total_alloue", { acompteId, totalAlloue });
        }
      }

      return { ...result, autoPayApplied };
    } catch (err) {
      console.error("Erreur création acompte:", err);
      onError?.("Erreur création acompte");
      throw err;
    } finally {
      setLoading(false);
      isCreating.current = false;
    }
  },
  [onError]
);

  /**
   * ==========================================
   * 3) Supprimer un acompte (RPC + DELETE)
   * ==========================================
   * 1) Annule les allocations via la RPC unapply_acompte
   * 2) Supprime l'acompte de la table
   * 3) Retire l'acompte du state local
   */
  const deleteAcompte = useCallback(async (id) => {
    if (!id) {
      throw new Error("ID de l'acompte manquant");
    }

    try {
      setLoading(true);

      const { error: unapplyError } = await supabase.rpc("unapply_acompte", {
        p_acompte_id: id,
      });

      if (unapplyError) {
        console.error("Erreur unapply_acompte:", unapplyError);
        onError?.("Erreur annulation des allocations");
        throw unapplyError;
      }

      const { error: deleteError } = await supabase
        .from("acomptes")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Erreur suppression acompte:", deleteError);
        onError?.("Erreur suppression acompte");
        throw deleteError;
      }

      setListeAcomptes((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  /**
   * ==========================================
   * 4) ✅ CUMUL acomptes JUSQU’À une date
   * ==========================================
   * C’est LA fonction du “fix impayés” :
   * Exemple : fin de semaine => on sait combien d’acomptes existent au total jusque-là.
   *
   * Utilisé par useBilan pour :
   * - couvrir les semaines impayées d’abord
   * - puis couvrir la semaine en cours
   */
  const getTotalAcomptesJusqua = useCallback(
    (dateFin, patronId = null) => {
      if (!dateFin) return 0;

      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];

      // 1) on garde seulement ceux <= dateFin
      let filtered = acomptesArray.filter((ac) => {
        if (!ac?.date_acompte) return false;
        return ac.date_acompte <= dateFin;
      });

      // 2) filtre patron si demandé
      if (patronId) {
        filtered = filtered.filter((ac) => ac?.patron_id === patronId);
      }

      // 3) somme des montants
      return filtered.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [listeAcomptes]
  );

  /**
   * ==========================================
   * 5) Solde acompte AVANT une date
   * ==========================================
   * Appelé dans useBilan (et affiché “solde avant période”)
   *
   * calculerSoldeAcomptesAvant() (dans utils/calculators) fait :
   * solde = acomptes_avant - (missions_avant + frais_avant)
   */
  const getSoldeAvant = useCallback(
    (dateRef, patronId = null) => {
      if (!dateRef) return 0;

      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      const acomptesFiltres = patronId
        ? acomptesArray.filter((a) => a?.patron_id === patronId)
        : acomptesArray;

      const missionsFiltrees = patronId
        ? missionsArray.filter((m) => m?.patron_id === patronId)
        : missionsArray;

      const fraisFiltres = patronId
        ? fraisArray.filter((f) => f?.patron_id === patronId)
        : fraisArray;

      return calculerSoldeAcomptesAvant(
        dateRef,
        acomptesFiltres,
        missionsFiltrees,
        fraisFiltres
      );
    },
    [listeAcomptes, missions, fraisDivers]
  );

  /**
   * ==========================================
   * 6) Total acomptes DANS une période
   * ==========================================
   * Utilisé surtout pour l’affichage “reçus cette période”
   * dans le bilan semaine.
   */
  const getAcomptesDansPeriode = useCallback(
    (dateDebut, dateFin, patronId = null) => {
      if (!dateDebut || !dateFin) return 0;

      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];

      let filtered = acomptesArray.filter((ac) => {
        if (!ac?.date_acompte) return false;
        return ac.date_acompte >= dateDebut && ac.date_acompte <= dateFin;
      });

      if (patronId) {
        filtered = filtered.filter((ac) => ac?.patron_id === patronId);
      }

      return filtered.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);
    },
    [listeAcomptes]
  );

  /**
   * ==========================================
   * 7) Solde total actuel
   * ==========================================
   * solde = total acomptes - (total missions + total frais)
   * (utile si un jour tu veux afficher un “solde actuel” général)
   */
  const getSoldeTotal = useCallback(
    (patronId = null) => {
      const acomptesArray = Array.isArray(listeAcomptes) ? listeAcomptes : [];
      const missionsArray = Array.isArray(missions) ? missions : [];
      const fraisArray = Array.isArray(fraisDivers) ? fraisDivers : [];

      const acomptesFiltres = patronId
        ? acomptesArray.filter((a) => a?.patron_id === patronId)
        : acomptesArray;

      const missionsFiltrees = patronId
        ? missionsArray.filter((m) => m?.patron_id === patronId)
        : missionsArray;

      const fraisFiltres = patronId
        ? fraisArray.filter((f) => f?.patron_id === patronId)
        : fraisArray;

      const totalAcomptes = acomptesFiltres.reduce((sum, ac) => {
        const montant = parseFloat(ac?.montant) || 0;
        return sum + montant;
      }, 0);

      const totalMissions = missionsFiltrees.reduce((sum, m) => {
        return sum + (m?.montant || 0);
      }, 0);

      const totalFrais = fraisFiltres.reduce((sum, f) => {
        const montant = parseFloat(f?.montant) || 0;
        return sum + montant;
      }, 0);

      const totalDepenses = totalMissions + totalFrais;

      return Math.max(0, totalAcomptes - totalDepenses);
    },
    [listeAcomptes, missions, fraisDivers]
  );

  /**
   * ==========================================
   * 8) Liste des acomptes par patron
   * ==========================================
   * Utilisé dans l’UI “gestion patrons” (et potentiellement ailleurs)
   */
  const getAcomptesByPatron = useCallback(
    (patronId = null) => {
      if (!patronId) return listeAcomptes;
      return listeAcomptes.filter((a) => a?.patron_id === patronId);
    },
    [listeAcomptes]
  );

  // ==========================================
  // Ce que App.jsx reçoit quand il fait:
  // const { ... } = useAcomptes(...)
  // ==========================================
  return {
    listeAcomptes,
    loading,
    fetchAcomptes,
    createAcompte,
    deleteAcompte,

    // ✅ utilisé par useBilan (important)
    getTotalAcomptesJusqua,

    // existants
    getSoldeAvant,
    getAcomptesDansPeriode,
    getSoldeTotal,
    getAcomptesByPatron,
  };
};

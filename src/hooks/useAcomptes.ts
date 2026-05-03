import { useState, useCallback, useRef } from "react";
import * as acomptesApi from "../services/api/acomptesApi";
import { calculerSoldeAcomptesAvant } from "../utils/calculators";
import type { Acompte, Mission, FraisDivers } from "../types/entities";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Résultat enrichi de createAcompte : l'API retourne l'acompte + statut RPC. */
interface CreateAcompteResult {
  acompte: Acompte | null;
  autoPayApplied: boolean;
  autoPayError: null;
}

export interface UseAcomptesReturn {
  listeAcomptes: Acompte[];
  loading: boolean;
  fetchAcomptes: () => Promise<Acompte[]>;
  createAcompte: (acompteData: Partial<Acompte>) => Promise<CreateAcompteResult>;
  deleteAcompte: (id: string) => Promise<void>;
  getTotalAcomptesJusqua: (dateFin: string, patronId?: string | null) => number;
  getSoldeAvant: (dateRef: string, patronId?: string | null) => number;
  getAcomptesDansPeriode: (dateDebut: string, dateFin: string, patronId?: string | null) => number;
  getSoldeTotal: (patronId?: string | null) => number;
  getAcomptesByPatron: (patronId?: string | null) => Acompte[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * ==========================================
 * HOOK useAcomptes
 * ==========================================
 * Rôle :
 * - Charger / créer / supprimer des acomptes (via l'API Supabase)
 * - Donner des calculs utiles au bilan :
 *   - total acomptes dans une période
 *   - solde acompte avant une date
 *   - cumul d'acomptes jusqu'à une date (le fameux fix "semaine impayée")
 *
 * Où ça sert dans l'app (App.jsx) :
 * - Quand tu ouvres la modal "+ Acompte" => createAcompte()
 * - Quand le bilan se calcule => getSoldeAvant(), getAcomptesDansPeriode(), getTotalAcomptesJusqua()
 */
export const useAcomptes = (
  missions: Mission[] = [],
  fraisDivers: FraisDivers[] = [],
  onError?: (msg: string) => void
): UseAcomptesReturn => {
  // ==========================================
  // STATE : données et état de chargement
  // ==========================================
  const [listeAcomptes, setListeAcomptes] = useState<Acompte[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Ref : évite de relancer fetchAcomptes 2 fois en même temps
  const isFetching = useRef<boolean>(false);

  // Ref : évite un double-submit sur createAcompte
  const isCreating = useRef<boolean>(false);

  // Set : verrou par acompteId pour éviter double apply_acompte sur le même acompte
  const appliedAcompteIds = useRef<Set<string>>(new Set());

  /**
   * ==========================================
   * 1) Charger tous les acomptes (API)
   * ==========================================
   * Appelé au démarrage dans App.jsx (useEffect)
   */
  const fetchAcomptes = useCallback(async (): Promise<Acompte[]> => {
    if (isFetching.current) return [];

    try {
      isFetching.current = true;
      setLoading(true);

      const data: Acompte[] = await acomptesApi.fetchAcomptes();

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
    async (acompteData: Partial<Acompte>): Promise<CreateAcompteResult> => {
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

        const result: CreateAcompteResult = await acomptesApi.createAcompte(acompteData);
        const newAcompte: Acompte | null = result?.acompte || null;

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

            try {
              await acomptesApi.applyAcompte(acompteId);
            } catch (applyError) {
              appliedAcompteIds.current.delete(acompteId);
              console.error("Erreur apply_acompte:", applyError);
              throw applyError;
            }

            autoPayApplied = true;
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
  const deleteAcompte = useCallback(async (id: string): Promise<void> => {
    if (!id) {
      throw new Error("ID de l'acompte manquant");
    }

    try {
      setLoading(true);

      try {
        await acomptesApi.unapplyAcompte(id);
      } catch (unapplyError) {
        console.error("Erreur unapply_acompte:", unapplyError);
        onError?.("Erreur annulation des allocations");
        throw unapplyError;
      }

      try {
        await acomptesApi.deleteAcompte(id);
      } catch (deleteError) {
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
   * 4) ✅ CUMUL acomptes JUSQU'À une date
   * ==========================================
   * C'est LA fonction du "fix impayés" :
   * Exemple : fin de semaine => on sait combien d'acomptes existent au total jusque-là.
   *
   * Utilisé par useBilan pour :
   * - couvrir les semaines impayées d'abord
   * - puis couvrir la semaine en cours
   */
  const getTotalAcomptesJusqua = useCallback(
    (dateFin: string, patronId: string | null = null): number => {
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
        const montant = parseFloat(String(ac?.montant)) || 0;
        return sum + montant;
      }, 0);
    },
    [listeAcomptes]
  );

  /**
   * ==========================================
   * 5) Solde acompte AVANT une date
   * ==========================================
   * Appelé dans useBilan (et affiché "solde avant période")
   *
   * calculerSoldeAcomptesAvant() (dans utils/calculators) fait :
   * solde = acomptes_avant - (missions_avant + frais_avant)
   */
  const getSoldeAvant = useCallback(
    (dateRef: string, patronId: string | null = null): number => {
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
   * Utilisé surtout pour l'affichage "reçus cette période"
   * dans le bilan semaine.
   * Retourne un number (somme des montants).
   */
  const getAcomptesDansPeriode = useCallback(
    (dateDebut: string, dateFin: string, patronId: string | null = null): number => {
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
        const montant = parseFloat(String(ac?.montant)) || 0;
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
   * (utile si un jour tu veux afficher un "solde actuel" général)
   */
  const getSoldeTotal = useCallback(
    (patronId: string | null = null): number => {
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
        const montant = parseFloat(String(ac?.montant)) || 0;
        return sum + montant;
      }, 0);

      const totalMissions = missionsFiltrees.reduce((sum, m) => {
        return sum + (m?.montant || 0);
      }, 0);

      const totalFrais = fraisFiltres.reduce((sum, f) => {
        const montant = parseFloat(String(f?.montant)) || 0;
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
   * Utilisé dans l'UI "gestion patrons" (et potentiellement ailleurs)
   */
  const getAcomptesByPatron = useCallback(
    (patronId: string | null = null): Acompte[] => {
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

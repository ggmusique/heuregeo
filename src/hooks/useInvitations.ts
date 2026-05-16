import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import type { PatronInvitation } from "../types/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InAppInvitation extends PatronInvitation {
  /** Nom de l'autre partie (patron ou ouvrier selon le contexte). */
  other_name?: string | null;
  /** Nom dans la table patrons (pour côté ouvrier). */
  patron_nom?: string | null;
}

export interface SearchResult {
  userId: string;
  prenom: string | null;
  nom: string | null;
}

export interface UseInvitationsReturn {
  /** Invitations in-app en attente envoyées par l'utilisateur courant. */
  pendingSent: InAppInvitation[];
  /** Invitations in-app en attente reçues par l'utilisateur courant. */
  pendingReceived: InAppInvitation[];
  /** Connexions in-app acceptées où l'utilisateur est le patron. */
  acceptedConnections: InAppInvitation[];
  loading: boolean;
  error: string | null;
  // Recherche par code
  searchResult: SearchResult | null;
  searching: boolean;
  searchError: string | null;
  searchByInviteCode: (code: string) => Promise<void>;
  clearSearch: () => void;
  // Actions
  sendInvitation: (
    targetInviteCode: string,
    initiatedBy: "owner" | "patron",
    opts?: { accessAgenda?: boolean; accessDashboard?: boolean }
  ) => Promise<{ error?: string }>;
  acceptInvitation: (invitationId: string) => Promise<{ error?: string }>;
  refuseInvitation: (invitationId: string) => Promise<{ error?: string }>;
  cancelInvitation: (invitationId: string) => Promise<{ error?: string }>;
  toggleInvitationFeature: (
    invitationId: string,
    feature: "access_agenda" | "access_dashboard",
    value: boolean
  ) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
  /** Code unique de l'utilisateur courant (pour partage). */
  myInviteCode: string | null;
  /** Génère (ou régénère) un invite_code pour l'utilisateur courant. */
  generateMyCode: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInvitations(): UseInvitationsReturn {
  const [pendingSent, setPendingSent] = useState<InAppInvitation[]>([]);
  const [pendingReceived, setPendingReceived] = useState<InAppInvitation[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<InAppInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myInviteCode, setMyInviteCode] = useState<string | null>(null);

  // Recherche
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Charger le code invite de l'utilisateur ──────────────────────────────

  const loadMyCode = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("invite_code")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.invite_code) setMyInviteCode(data.invite_code as string);
  }, []);

  const generateMyCode = useCallback(async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () =>
      charset[Math.floor(Math.random() * charset.length)]
    ).join("");
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ invite_code: code } as any)
      .eq("id", user.id);
    if (!dbErr) setMyInviteCode(code);
  }, []);

  // ── Charger les invitations ───────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Invitations où je suis l'ouvrier (owner_id = mon id)
      const { data: sent, error: sentErr } = await supabase
        .from("patron_invitations")
        .select("*, patron:patrons!patron_id(nom)")
        .eq("owner_id", user.id)
        .eq("method", "in_app")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (sentErr) throw sentErr;

      // Invitations où je suis le patron (patron_user_id = mon id)
      const { data: received, error: receivedErr } = await supabase
        .from("patron_invitations")
        .select("*")
        .eq("patron_user_id", user.id)
        .eq("method", "in_app")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (receivedErr) throw receivedErr;

      // Connexions acceptées où je suis le patron (pour affichage + gestion accès)
      const { data: accepted, error: acceptedErr } = await supabase
        .from("patron_invitations")
        .select("*")
        .eq("patron_user_id", user.id)
        .eq("method", "in_app")
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (acceptedErr) throw acceptedErr;
      setAcceptedConnections(
        (accepted ?? []).map((inv: any) => ({
          ...inv,
          other_name: inv.target_name ?? null,
        }))
      );

      // ── Partitionner par initiated_by ─────────────────────────────────────
      // sent     = owner_id = moi  →  moi = ouvrier
      // received = patron_user_id = moi  →  moi = patron
      //
      // pendingSent     = invitations que J'AI initiées (ouvrier ou patron)
      // pendingReceived = invitations où JE dois répondre

      const ownerInitiatedByMe  = (sent     ?? []).filter((i: any) => i.initiated_by === 'owner');
      const patronSentToMe      = (sent     ?? []).filter((i: any) => i.initiated_by === 'patron');
      const patronInitiatedByMe = (received ?? []).filter((i: any) => i.initiated_by === 'patron');
      const ownerSentToMe       = (received ?? []).filter((i: any) => i.initiated_by === 'owner');

      console.log('[useInvitations] load', {
        ownerInitiatedByMe:  ownerInitiatedByMe.length,
        patronSentToMe:      patronSentToMe.length,
        patronInitiatedByMe: patronInitiatedByMe.length,
        ownerSentToMe:       ownerSentToMe.length,
      });

      const enrichedSent: InAppInvitation[] = [
        // J'ai initié en tant qu'ouvrier → l'autre est le patron
        ...ownerInitiatedByMe.map((inv: any) => ({
          ...inv,
          patron_nom: inv.patron?.nom ?? null,
          other_name: inv.patron?.nom ?? inv.target_name ?? null,
          patron: undefined,
        })),
        // J'ai initié en tant que patron → l'autre est l'ouvrier
        ...patronInitiatedByMe.map((inv: any) => ({
          ...inv,
          other_name: inv.target_name ?? null,
        })),
      ];

      const enrichedReceived: InAppInvitation[] = [
        // Le patron m'a envoyé une invitation (je suis l'ouvrier) → je dois répondre
        ...patronSentToMe.map((inv: any) => ({
          ...inv,
          patron_nom: inv.patron?.nom ?? null,
          other_name: inv.inviter_name ?? null,
          patron: undefined,
        })),
        // L'ouvrier m'a envoyé une invitation (je suis le patron) → je dois répondre
        ...ownerSentToMe.map((inv: any) => ({
          ...inv,
          other_name: inv.inviter_name ?? null,
        })),
      ];

      setPendingSent(enrichedSent);
      setPendingReceived(enrichedReceived);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors du chargement des invitations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadMyCode();
  }, [load, loadMyCode]);

  // ── Recherche par code ────────────────────────────────────────────────────

  const searchByInviteCode = useCallback(async (code: string) => {
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("search_by_invite_code", {
        p_code: code.trim().toUpperCase(),
      });
      if (rpcErr) throw rpcErr;
      if (!data || data.length === 0) {
        setSearchError("Aucun utilisateur trouvé avec ce code.");
      } else {
        const row = data[0];
        setSearchResult({
          userId: row.found_user_id,
          prenom: row.found_prenom,
          nom: row.found_nom,
        });
      }
    } catch (e: any) {
      setSearchError(e.message ?? "Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResult(null);
    setSearchError(null);
  }, []);

  // ── Envoyer une invitation ────────────────────────────────────────────────

  const sendInvitation = useCallback(
    async (
      targetInviteCode: string,
      initiatedBy: "owner" | "patron",
      opts?: { accessAgenda?: boolean; accessDashboard?: boolean }
    ): Promise<{ error?: string }> => {
      try {
        const { error: rpcErr } = await supabase.rpc("create_inapp_invitation", {
          p_target_invite_code: targetInviteCode.trim().toUpperCase(),
          p_initiated_by: initiatedBy,
          p_access_agenda: opts?.accessAgenda ?? false,
          p_access_dashboard: opts?.accessDashboard ?? false,
        });
        if (rpcErr) throw rpcErr;
        await load();
        return {};
      } catch (e: any) {
        return { error: e.message ?? "Erreur lors de l'envoi de l'invitation" };
      }
    },
    [load]
  );

  // ── Accepter ──────────────────────────────────────────────────────────────

  const acceptInvitation = useCallback(
    async (invitationId: string): Promise<{ error?: string }> => {
      try {
        const { error: rpcErr } = await supabase.rpc("accept_inapp_invitation", {
          p_invitation_id: invitationId,
        });
        if (rpcErr) throw rpcErr;
        await load();
        return {};
      } catch (e: any) {
        return { error: e.message ?? "Erreur lors de l'acceptation" };
      }
    },
    [load]
  );

  // ── Refuser ───────────────────────────────────────────────────────────────

  const refuseInvitation = useCallback(
    async (invitationId: string): Promise<{ error?: string }> => {
      try {
        const { error: rpcErr } = await supabase.rpc("refuse_inapp_invitation", {
          p_invitation_id: invitationId,
        });
        if (rpcErr) throw rpcErr;
        await load();
        return {};
      } catch (e: any) {
        return { error: e.message ?? "Erreur lors du refus" };
      }
    },
    [load]
  );

  // ── Annuler (côté expéditeur) ─────────────────────────────────────────────

  const cancelInvitation = useCallback(
    async (invitationId: string): Promise<{ error?: string }> => {
      try {
        const { error: rpcErr } = await supabase.rpc("cancel_inapp_invitation", {
          p_invitation_id: invitationId,
        });
        if (rpcErr) throw rpcErr;
        await load();
        return {};
      } catch (e: any) {
        return { error: e.message ?? "Erreur lors de l'annulation" };
      }
    },
    [load]
  );

  // ── Activer / désactiver agenda ou dashboard pour une connexion acceptée ──

  const toggleInvitationFeature = useCallback(
    async (
      invitationId: string,
      feature: "access_agenda" | "access_dashboard",
      value: boolean
    ): Promise<{ error?: string }> => {
      try {
        const { error: dbErr } = await supabase
          .from("patron_invitations")
          .update({ [feature]: value } as any)
          .eq("id", invitationId);
        if (dbErr) throw dbErr;
        setAcceptedConnections((prev) =>
          prev.map((inv) =>
            inv.id === invitationId ? { ...inv, [feature]: value } : inv
          )
        );
        return {};
      } catch (e: any) {
        return { error: e.message ?? "Erreur lors de la mise à jour" };
      }
    },
    []
  );

  return {
    pendingSent,
    pendingReceived,
    acceptedConnections,
    loading,
    error,
    searchResult,
    searching,
    searchError,
    searchByInviteCode,
    clearSearch,
    sendInvitation,
    acceptInvitation,
    refuseInvitation,
    cancelInvitation,
    toggleInvitationFeature,
    refresh: load,
    myInviteCode,
    generateMyCode,
  };
}

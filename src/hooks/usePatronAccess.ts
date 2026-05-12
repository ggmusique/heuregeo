// src/hooks/usePatronAccess.ts
// Gestion des invitations et acces patrons - cote OUVRIER.
// invitePatron() cree l'invitation dans patron_invitations et retourne
// l'URL d'invite que l'ouvrier peut copier/partager manuellement.
// L'envoi d'email (Edge Function Resend) est optionnel et desactive par defaut.

import { useState, useEffect, useCallback } from "react";
import {
  fetchPatronAccesses,
  fetchPatronInvitations,
  upsertPatronInvitation,
  sendPatronInviteEmail,
  revokePatronAccess,
  reinstatePatronAccess,
  updatePatronFeature,
} from "../services/api/patronAccessApi";
import type { PatronAccessProfile, PatronAccessFeatures, PatronInvitation } from "../types/profile";
import type { Patron } from "../types/entities";
import type { UserProfile } from "../types/profile";

// --- Types -------------------------------------------------------------------

export interface UsePatronAccessReturn {
  patronAccesses: PatronAccessProfile[];
  patronInvitations: PatronInvitation[];
  loading: boolean;
  inviting: string | null;
  refreshAccesses: () => Promise<void>;
  invitePatron: (patron: Patron, ownerProfile: UserProfile) => Promise<string>;
  revokeAccess: (profileId: string) => Promise<void>;
  reinstateAccess: (profileId: string) => Promise<void>;
  toggleFeature: (
    profileId: string,
    feature: keyof Pick<PatronAccessFeatures, "access_agenda" | "access_dashboard">,
    value: boolean
  ) => Promise<void>;
  getAccessForPatron: (patronId: string) => PatronAccessProfile | undefined;
  getInvitationForPatron: (patronId: string) => PatronInvitation | undefined;
}

// --- Hook --------------------------------------------------------------------

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function usePatronAccess(
  ownerId: string | null | undefined,
  triggerAlert?: (msg: string) => void
): UsePatronAccessReturn {
  const [patronAccesses, setPatronAccesses] = useState<PatronAccessProfile[]>([]);
  const [patronInvitations, setPatronInvitations] = useState<PatronInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const refreshAccesses = useCallback(async (): Promise<void> => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [accesses, invitations] = await Promise.all([
        fetchPatronAccesses(ownerId),
        fetchPatronInvitations(ownerId),
      ]);
      setPatronAccesses(accesses);
      setPatronInvitations(invitations);
    } catch (err) {
      triggerAlert?.("Erreur chargement acces patrons : " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [ownerId, triggerAlert]);

  useEffect(() => {
    refreshAccesses();
  }, [refreshAccesses]);

  const invitePatron = useCallback(
    async (patron: Patron, ownerProfile: UserProfile): Promise<string> => {
      if (!ownerId) throw new Error("Owner non connecte");
      if (!patron.email) throw new Error("Ce patron n a pas d email renseigne");

      setInviting(patron.id);
      try {
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await upsertPatronInvitation({
          patronId: patron.id,
          ownerId,
          patronEmail: patron.email,
          token,
          expiresAt,
        });

        const ownerNom = [ownerProfile.prenom, ownerProfile.nom].filter(Boolean).join(" ") || "Un ouvrier";

        try {
          await sendPatronInviteEmail({
            patronEmail: patron.email,
            patronNom: patron.nom,
            ownerNom,
            token,
          });
        } catch (emailErr) {
          // L'invitation est creee : l'echec d'envoi d'email ne bloque pas le flux.
          triggerAlert?.("Invitation créée mais l'email n'a pas pu être envoyé : " + (emailErr as Error).message);
        }

        await refreshAccesses();

        return window.location.origin + "/accept-invite?token=" + encodeURIComponent(token);
      } finally {
        setInviting(null);
      }
    },
    [ownerId, refreshAccesses, triggerAlert]
  );

  const revokeAccess = useCallback(
    async (profileId: string): Promise<void> => {
      await revokePatronAccess(profileId);
      setPatronAccesses((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, status: "revoked" } : p))
      );
    },
    []
  );

  const reinstateAccess = useCallback(
    async (profileId: string): Promise<void> => {
      await reinstatePatronAccess(profileId);
      setPatronAccesses((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, status: "active" } : p))
      );
    },
    []
  );

  const toggleFeature = useCallback(
    async (
      profileId: string,
      feature: keyof Pick<PatronAccessFeatures, "access_agenda" | "access_dashboard">,
      value: boolean
    ): Promise<void> => {
      await updatePatronFeature(profileId, feature, value);
      setPatronAccesses((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, features: { ...p.features, [feature]: value } }
            : p
        )
      );
    },
    []
  );

  const getAccessForPatron = useCallback(
    (patronId: string): PatronAccessProfile | undefined =>
      patronAccesses.find((p) => p.patron_id === patronId),
    [patronAccesses]
  );

  const getInvitationForPatron = useCallback(
    (patronId: string): PatronInvitation | undefined =>
      patronInvitations.find(
        (inv) => inv.patron_id === patronId && inv.status === "pending"
      ),
    [patronInvitations]
  );

  return {
    patronAccesses,
    patronInvitations,
    loading,
    inviting,
    refreshAccesses,
    invitePatron,
    revokeAccess,
    reinstateAccess,
    toggleFeature,
    getAccessForPatron,
    getInvitationForPatron,
  };
}

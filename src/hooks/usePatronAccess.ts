// src/hooks/usePatronAccess.ts
// Gestion des invitations et accès patrons — côté OUVRIER.
// Charge les profils d'accès patron de l'ouvrier, expose les actions CRUD.

import { useState, useEffect, useCallback } from "react";
import {
  fetchPatronAccesses,
  upsertPatronAccess,
  revokePatronAccess,
  reinstatePatronAccess,
  updatePatronFeature,
  sendPatronInviteEmail,
} from "../services/api/patronAccessApi";
import type { PatronAccessProfile, PatronAccessFeatures } from "../types/profile";
import type { Patron } from "../types/entities";
import type { UserProfile } from "../types/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UsePatronAccessReturn {
  /** Profils d'accès patron créés par cet ouvrier. */
  patronAccesses: PatronAccessProfile[];
  loading: boolean;
  /** ID de patron en cours d'invitation. */
  inviting: string | null;
  /** Recharge les accès depuis la base. */
  refreshAccesses: () => Promise<void>;
  /**
   * Invite un patron (crée le profil d'accès + envoie l'email).
   * Ré-invite si un accès existe déjà (token régénéré).
   */
  invitePatron: (patron: Patron, ownerProfile: UserProfile) => Promise<void>;
  /** Révoque l'accès d'un profil patron. */
  revokeAccess: (profileId: string) => Promise<void>;
  /** Rétablit l'accès d'un profil patron révoqué. */
  reinstateAccess: (profileId: string) => Promise<void>;
  /** Active ou désactive un feature flag (access_agenda | access_dashboard). */
  toggleFeature: (
    profileId: string,
    feature: keyof Pick<PatronAccessFeatures, "access_agenda" | "access_dashboard">,
    value: boolean
  ) => Promise<void>;
  /** Retourne l'accès pour un patron_id donné, ou undefined. */
  getAccessForPatron: (patronId: string) => PatronAccessProfile | undefined;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePatronAccess(
  ownerId: string | null | undefined,
  triggerAlert?: (msg: string) => void
): UsePatronAccessReturn {
  const [patronAccesses, setPatronAccesses] = useState<PatronAccessProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const refreshAccesses = useCallback(async (): Promise<void> => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const data = await fetchPatronAccesses(ownerId);
      setPatronAccesses(data);
    } catch (err) {
      triggerAlert?.("Erreur chargement accès patrons : " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [ownerId, triggerAlert]);

  useEffect(() => {
    refreshAccesses();
  }, [refreshAccesses]);

  const invitePatron = useCallback(
    async (patron: Patron, ownerProfile: UserProfile): Promise<void> => {
      if (!ownerId) throw new Error("Owner non connecté");
      if (!patron.email) throw new Error("Ce patron n'a pas d'email renseigné");

      setInviting(patron.id);
      try {
        // Générer un token (uuid v4 côté client — suffisamment entropique)
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // Créer / mettre à jour le profil d'accès
        await upsertPatronAccess({
          patronId: patron.id,
          ownerId,
          token,
          expiresAt,
        });

        // Envoyer l'email
        const ownerNom = [ownerProfile.prenom, ownerProfile.nom].filter(Boolean).join(" ")
          || ownerProfile.nom
          || "Votre employé";

        await sendPatronInviteEmail({
          patronEmail: patron.email,
          patronNom: patron.nom,
          ownerNom,
          token,
        });

        triggerAlert?.(`✅ Invitation envoyée à ${patron.email}`);
        await refreshAccesses();
      } finally {
        setInviting(null);
      }
    },
    [ownerId, triggerAlert, refreshAccesses]
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

  return {
    patronAccesses,
    loading,
    inviting,
    refreshAccesses,
    invitePatron,
    revokeAccess,
    reinstateAccess,
    toggleFeature,
    getAccessForPatron,
  };
}

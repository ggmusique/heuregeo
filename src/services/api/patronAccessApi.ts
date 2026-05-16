// src/services/api/patronAccessApi.ts
// API pour la gestion des acces patrons.
//
// Architecture :
//   - patron_invitations : cycle de vie des invitations (pending -> accepted)
//   - profiles           : profils actifs/revoques une fois l'invitation acceptee
//
// La table profiles ne contient JAMAIS de lignes pending -- la FK vers
// auth.users est ainsi toujours respectee.

import { supabase } from "../supabase";
import type { PatronAccessProfile, PatronAccessFeatures, PatronInvitation } from "../../types/profile";

// --- Lecture des acces actifs/revoques (cote ouvrier) ---

export const fetchPatronAccesses = async (
  ownerId: string
): Promise<PatronAccessProfile[]> => {
  // Acces email-based : profils enregistrés dans la table profiles
  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("id, status, owner_id, patron_id, features, role")
    .eq("owner_id", ownerId)
    .in("role", ["patron", "viewer"])
    .in("status", ["active", "revoked"]);
  if (error) throw error;

  // Acces in_app : lire directement depuis patron_invitations (multi-ouvrier)
  const { data: invData } = await supabase
    .from("patron_invitations")
    .select("id, owner_id, patron_id, access_agenda, access_dashboard")
    .eq("owner_id", ownerId)
    .eq("method", "in_app")
    .eq("status", "accepted");

  // Convertir les invitations in_app en PatronAccessProfile
  const profilePatronIds = new Set((profileData ?? []).map((p: any) => p.patron_id));
  const inAppAccesses: PatronAccessProfile[] = (invData ?? [])
    .filter((inv: any) => !profilePatronIds.has(inv.patron_id))
    .map((inv: any) => ({
      id: inv.id,
      status: "active" as const,
      owner_id: inv.owner_id,
      patron_id: inv.patron_id,
      features: {
        access_agenda: inv.access_agenda ?? false,
        access_dashboard: inv.access_dashboard ?? false,
      },
      role: "patron" as const,
    }));

  return [...(profileData ?? []) as PatronAccessProfile[], ...inAppAccesses];
};

// --- Lecture des invitations (cote ouvrier) ---

export const fetchPatronInvitations = async (
  ownerId: string
): Promise<PatronInvitation[]> => {
  const { data, error } = await supabase
    .from("patron_invitations")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PatronInvitation[];
};

// --- Verification du token (RPC SECURITY DEFINER) ---

export const verifyInviteToken = async (
  token: string
): Promise<{
  invitation_id: string;
  owner_id: string;
  patron_id: string;
  patron_email: string;
  invite_expires: string;
  invite_role: 'patron' | 'viewer';
} | null> => {
  const { data, error } = await supabase.rpc("verify_patron_invite_token", {
    p_token: token,
  });

  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return row as {
    invitation_id: string;
    owner_id: string;
    patron_id: string;
    patron_email: string;
    invite_expires: string;
    invite_role: 'patron' | 'viewer';
  };
};

// --- Creation / mise a jour d'une invitation ---

export const upsertPatronInvitation = async ({
  patronId,
  ownerId,
  patronEmail,
  token,
  expiresAt,
  inviteRole = 'patron',
}: {
  patronId: string;
  ownerId: string;
  patronEmail: string;
  token: string;
  expiresAt: string;
  inviteRole?: 'patron' | 'viewer';
}): Promise<PatronInvitation> => {
  const { data: existing } = await supabase
    .from("patron_invitations")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("patron_id", patronId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("patron_invitations")
      .update({
        invite_token: token,
        invite_expires: expiresAt,
        patron_email: patronEmail,
        invite_role: inviteRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as PatronInvitation;
  }

  const { data, error } = await supabase
    .from("patron_invitations")
    .insert({
      owner_id: ownerId,
      patron_id: patronId,
      patron_email: patronEmail,
      invite_token: token,
      invite_expires: expiresAt,
      invite_role: inviteRole,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Une invitation a deja ete envoyee a cet email.");
    }
    throw error;
  }
  return data as PatronInvitation;
};

// --- Activation via RPC (cote patron acceptant l'invitation) ---

export const activatePatronAccess = async (token: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");

  const { error } = await supabase.rpc("activate_patron_invite", {
    p_token: token,
  });

  if (error) throw error;
};

// --- Gestion des acces actifs (cote ouvrier) ---

export const revokePatronAccess = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "revoked" })
    .eq("id", profileId);
  if (error) throw error;
};

export const reinstatePatronAccess = async (
  profileId: string
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId);
  if (error) throw error;
};

export const updatePatronFeature = async (
  profileId: string,
  feature: keyof Pick<PatronAccessFeatures, "access_agenda" | "access_dashboard">,
  value: boolean
): Promise<void> => {
  // Tenter d'abord une mise à jour via profiles (invitations email-based)
  const { data, error: fetchErr } = await supabase
    .from("profiles")
    .select("features, owner_id, patron_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!fetchErr && data) {
    // Email-based : mettre à jour profiles.features
    const existing = data?.features as PatronAccessFeatures | null;
    const updated: PatronAccessFeatures = {
      access_agenda: existing?.access_agenda ?? false,
      access_dashboard: existing?.access_dashboard ?? false,
      [feature]: value,
    };
    const { error } = await supabase
      .from("profiles")
      .update({ features: updated })
      .eq("id", profileId);
    if (error) throw error;

    // Synchroniser aussi patron_invitations in_app si la paire ouvrier/patron existe
    if (data.owner_id && data.patron_id) {
      await supabase
        .from("patron_invitations")
        .update({ [feature]: value })
        .eq("owner_id", data.owner_id)
        .eq("patron_id", data.patron_id)
        .eq("method", "in_app")
        .eq("status", "accepted");
    }
  } else {
    // In-app : profileId est l'ID de l'invitation
    const { error } = await supabase
      .from("patron_invitations")
      .update({ [feature]: value })
      .eq("id", profileId);
    if (error) throw error;
  }
};

// --- Annulation d'une invitation ---

export const cancelPatronInvitation = async (invitationId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke("cancel-patron-invite", {
    body: { invitation_id: invitationId },
  });
  if (error) throw error;
};

// --- Appel Edge Function ---

export const sendPatronInviteEmail = async ({
  patronEmail,
  patronNom,
  ownerNom,
  token,
}: {
  patronEmail: string;
  patronNom: string;
  ownerNom: string;
  token: string;
}): Promise<void> => {
  const inviteUrl = `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;

  const { error } = await supabase.functions.invoke("send-patron-invite", {
    body: {
      patron_email: patronEmail,
      patron_nom: patronNom,
      owner_nom: ownerNom,
      token,
      invite_url: inviteUrl,
    },
  });

  if (error) throw error;
};
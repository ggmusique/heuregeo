// src/services/api/patronAccessApi.ts
// API pour la gestion des accès patrons (invitations, statut, features).
// Utilisé côté ouvrier pour inviter ses patrons et gérer leurs accès.

import { supabase } from "../supabase";
import type { PatronAccessProfile, PatronAccessFeatures } from "../../types/profile";

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Récupère tous les profils d'accès patron créés par cet ouvrier.
 * (profiles WHERE owner_id = ownerId AND role = 'patron')
 */
export const fetchPatronAccesses = async (
  ownerId: string
): Promise<PatronAccessProfile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, status, owner_id, patron_id, features")
    .eq("owner_id", ownerId)
    .eq("role", "patron");

  if (error) throw error;
  return (data ?? []) as PatronAccessProfile[];
};

/**
 * Vérifie si un token d'invitation est valide (existe + non expiré + status pending).
 * Retourne le profil si valide, null sinon.
 */
export const verifyInviteToken = async (
  token: string
): Promise<PatronAccessProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, status, owner_id, patron_id, features")
    .eq("role", "patron")
    .eq("status", "pending")
    .filter("features->>'invite_token'", "eq", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = data as PatronAccessProfile;
  const expires = profile.features?.invite_expires;
  if (expires && new Date(expires) < new Date()) return null; // expiré

  return profile;
};

// ─── Création / mise à jour ───────────────────────────────────────────────────

/**
 * Crée ou met à jour (ré-invite) l'entrée profiles pour un accès patron.
 * - S'il n'existe pas encore → INSERT
 * - S'il existe déjà → UPDATE token + expiry + status pending
 * Retourne le profil créé/mis à jour.
 */
export const upsertPatronAccess = async ({
  patronId,
  ownerId,
  token,
  expiresAt,
}: {
  patronId: string;
  ownerId: string;
  token: string;
  expiresAt: string; // ISO date
}): Promise<PatronAccessProfile> => {
  // Chercher si un profil existe déjà pour ce patron+owner
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, features")
    .eq("owner_id", ownerId)
    .eq("patron_id", patronId)
    .eq("role", "patron")
    .maybeSingle();

  const newFeatures: PatronAccessFeatures = {
    invite_token: token,
    invite_expires: expiresAt,
    access_agenda: (existing?.features as PatronAccessFeatures | null)?.access_agenda ?? false,
    access_dashboard: (existing?.features as PatronAccessFeatures | null)?.access_dashboard ?? false,
  };

  if (existing?.id) {
    // Mise à jour du token
    const { data, error } = await supabase
      .from("profiles")
      .update({ status: "pending", features: newFeatures })
      .eq("id", existing.id)
      .select("id, status, owner_id, patron_id, features")
      .single();

    if (error) throw error;
    return data as PatronAccessProfile;
  } else {
    // Création d'un nouveau profil patron (sans auth user lié pour l'instant)
    // Le profil sera activé lors de l'acceptation de l'invitation
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        // id sera généré automatiquement OU lié au user lors de l'activation
        // On utilise gen_random_uuid() via default côté DB
        role: "patron",
        status: "pending",
        owner_id: ownerId,
        patron_id: patronId,
        features: newFeatures,
        prenom: null,
        nom: null,
        is_admin: false,
      })
      .select("id, status, owner_id, patron_id, features")
      .single();

    if (error) throw error;
    return data as PatronAccessProfile;
  }
};

// ─── Activation (côté patron acceptant l'invitation) ─────────────────────────

/**
 * Active le profil patron en le liant au compte auth de l'utilisateur connecté.
 * Met à jour : status='active', supprime invite_token + invite_expires.
 */
export const activatePatronAccess = async (
  profileId: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Récupérer les features existantes pour garder access_agenda / access_dashboard
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("features")
    .eq("id", profileId)
    .single();

  if (fetchErr) throw fetchErr;

  const currentFeatures = (existing?.features ?? {}) as PatronAccessFeatures;
  const { invite_token: _t, invite_expires: _e, ...cleanFeatures } = (currentFeatures as unknown) as Record<string, unknown>;

  // Le profil pending avait un id temporaire — on doit créer/fusionner avec l'auth user
  // Si l'id du profil pending est différent de auth.uid(), on met à jour l'id ou on crée un nouveau profil
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (myProfile) {
    // L'utilisateur a déjà un profil : mettre à jour si c'est le même profil
    // ou créer un second profil patron pour cet utilisateur
    if (myProfile.id === profileId) {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active", features: cleanFeatures })
        .eq("id", profileId);
      if (error) throw error;
    } else {
      // L'invitation avait un id temporaire mais l'utilisateur a déjà un compte
      // On crée/upsert un profil patron lié à son user.id
      const { data: pendingProfile, error: pErr } = await supabase
        .from("profiles")
        .select("owner_id, patron_id")
        .eq("id", profileId)
        .single();
      if (pErr) throw pErr;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: "patron",
          status: "active",
          owner_id: pendingProfile.owner_id,
          patron_id: pendingProfile.patron_id,
          features: cleanFeatures,
          is_admin: false,
        });
      if (error) throw error;

      // Supprimer l'ancien profil pending si différent
      if (profileId !== user.id) {
        await supabase.from("profiles").delete().eq("id", profileId);
      }
    }
  } else {
    // Pas de profil existant : utiliser le profileId ou créer pour user.id
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        role: "patron",
        status: "active",
        features: cleanFeatures,
      });
    if (error) throw error;

    if (profileId !== user.id) {
      // Récupérer les champs du profil pending
      const { data: pending } = await supabase
        .from("profiles")
        .select("owner_id, patron_id")
        .eq("id", profileId)
        .maybeSingle();

      if (pending) {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ owner_id: pending.owner_id, patron_id: pending.patron_id })
          .eq("id", user.id);
        if (upErr) throw upErr;
        await supabase.from("profiles").delete().eq("id", profileId);
      }
    }
  }
};

// ─── Gestion des accès (côté ouvrier) ────────────────────────────────────────

/**
 * Révoque l'accès d'un profil patron.
 */
export const revokePatronAccess = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "revoked" })
    .eq("id", profileId);
  if (error) throw error;
};

/**
 * Rétablit l'accès d'un profil patron révoqué.
 */
export const reinstatePatronAccess = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId);
  if (error) throw error;
};

/**
 * Met à jour un feature flag (access_agenda | access_dashboard) d'un profil patron.
 */
export const updatePatronFeature = async (
  profileId: string,
  feature: keyof Pick<PatronAccessFeatures, "access_agenda" | "access_dashboard">,
  value: boolean
): Promise<void> => {
  // Récupérer les features existantes pour patch partiel
  const { data, error: fetchErr } = await supabase
    .from("profiles")
    .select("features")
    .eq("id", profileId)
    .single();
  if (fetchErr) throw fetchErr;

  const updated = {
    ...(data?.features ?? {}),
    [feature]: value,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ features: updated })
    .eq("id", profileId);
  if (error) throw error;
};

// ─── Appel Edge Function ──────────────────────────────────────────────────────

/**
 * Appelle la Edge Function pour envoyer l'email d'invitation.
 */
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

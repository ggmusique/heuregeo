// supabase/functions/cancel-patron-invite/index.ts
// Edge Function Supabase : annulation d'une invitation patron en attente
// Déploiement : supabase functions deploy cancel-patron-invite

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // ── Vérification de l'appelant ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Vérifier que l'appelant est bien authentifié
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(jwt);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Lire le corps ───────────────────────────────────────────────────────
    let body: { invitation_id?: string } = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("Erreur parsing body:", parseErr);
      return new Response(JSON.stringify({ error: "Body JSON invalide ou vide" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const { invitation_id } = body;
    console.log("Body reçu:", JSON.stringify(body));

    if (!invitation_id) {
      return new Response(JSON.stringify({ error: "invitation_id manquant" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Récupérer l'invitation ──────────────────────────────────────────────
    const { data: invitation, error: fetchErr } = await adminClient
      .from("patron_invitations")
      .select("id, owner_id, patron_email, status")
      .eq("id", invitation_id)
      .single();

    if (fetchErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation introuvable" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Vérifier que l'appelant est bien l'owner de l'invitation
    if (invitation.owner_id !== caller.id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (invitation.status !== "pending" && invitation.status !== "accepted") {
      return new Response(JSON.stringify({ error: "Statut d'invitation non révocable" }), {
        status: 409,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (invitation.status === "accepted") {
      // Le patron a un compte confirmé : ne pas supprimer l'auth user.
      // Revoquer le profil d'accès dans profiles.
      const { error: revokeErr } = await adminClient
        .from("profiles")
        .update({ status: "revoked" })
        .eq("owner_id", invitation.owner_id)
        .eq("patron_id", invitation.patron_id)
        .eq("role", "patron")
        .eq("status", "active");
      if (revokeErr) {
        console.error("Erreur révocation profil patron:", revokeErr);
        // Non bloquant : on continue pour supprimer l'invitation
      }
    } else {
      // Invitation pending : supprimer l'utilisateur auth non confirmé si créé via Supabase invite
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listData?.users) {
        const unconfirmedUser = listData.users.find(
          (u) =>
            u.email === invitation.patron_email &&
            !u.email_confirmed_at
        );
        if (unconfirmedUser) {
          await adminClient.auth.admin.deleteUser(unconfirmedUser.id);
        }
      }
    }

    // ── Supprimer l'invitation ──────────────────────────────────────────────
    const { error: deleteErr } = await adminClient
      .from("patron_invitations")
      .delete()
      .eq("id", invitation_id);

    if (deleteErr) {
      console.error("Erreur suppression invitation:", deleteErr);
      return new Response(JSON.stringify({ error: "Erreur suppression invitation" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

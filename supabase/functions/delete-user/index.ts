// supabase/functions/delete-user/index.ts
// Edge Function Supabase : suppression complète d'un compte utilisateur
// Supprime le compte dans auth.users via le client admin (service_role),
// ce qui cascade automatiquement sur la table profiles (FK ON DELETE CASCADE).
// Déploiement : supabase functions deploy delete-user

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Préflight CORS
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
    const { data: { user: caller }, error: callerError } =
      await adminClient.auth.getUser(jwt);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Vérifier que l'appelant est administrateur ──────────────────────────
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (profileError || !callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Lire le corps ───────────────────────────────────────────────────────
    let body: { user_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body JSON invalide ou vide" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { user_id } = body;
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id manquant" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Empêcher l'auto-suppression
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── 1. Supprimer le profil (respecte l'ordre des FK) ────────────────────
    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);
    if (deleteProfileError) {
      console.error("Erreur suppression profiles:", deleteProfileError.message);
      return new Response(JSON.stringify({ error: deleteProfileError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── 2. Supprimer le compte dans auth.users ───────────────────────────────
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error("Erreur suppression auth.users:", authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("Erreur inattendue:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

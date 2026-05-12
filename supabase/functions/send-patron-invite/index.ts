// supabase/functions/send-patron-invite/index.ts
// Edge Function Supabase : envoi de l'email d'invitation patron
// Déploiement : supabase functions deploy send-patron-invite

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  patron_email: string;
  patron_nom: string;
  owner_nom: string;
  token: string;
  invite_url: string;
}

serve(async (req: Request) => {
  // Preflight CORS
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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Vérifier que l'appelant est authentifié
    // getUser() doit recevoir le JWT explicitement (client serveur sans session interne)
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Lire le corps ───────────────────────────────────────────────────────
    const body: InvitePayload = await req.json();
    const { patron_email, patron_nom, owner_nom, token, invite_url } = body;

    if (!patron_email || !token || !invite_url) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Envoi via Resend (ou Supabase SMTP intégré) ─────────────────────────
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      // Envoi via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HeurGeo <noreply@heuregeo.app>",
          to: [patron_email],
          subject: `${owner_nom} vous invite à consulter vos heures sur HeurGeo`,
          html: buildEmailHtml({ patron_nom, owner_nom, invite_url }),
        }),
      });

      if (!emailRes.ok) {
        const errData = await emailRes.text();
        console.error("Resend error:", errData);
        return new Response(JSON.stringify({ error: "Échec envoi email" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    } else {
      // Fallback : Supabase Auth invite (crée un compte si nécessaire)
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        patron_email,
        {
          redirectTo: invite_url,
          data: { invite_token: token, patron_nom, owner_nom },
        }
      );
      if (inviteErr) {
        console.error("Supabase invite error:", inviteErr);
        return new Response(JSON.stringify({ error: inviteErr.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
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

function buildEmailHtml({
  patron_nom,
  owner_nom,
  invite_url,
}: {
  patron_nom: string;
  owner_nom: string;
  invite_url: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:56px;font-size:24px;text-align:center;">⏱</div>
      <h1 style="font-size:22px;font-weight:900;margin:12px 0 4px;letter-spacing:-0.5px;">HeurGeo</h1>
    </div>
    <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;">Bonjour ${patron_nom || ""},</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">
      <strong style="color:#e2e8f0;">${owner_nom}</strong> vous invite à consulter vos heures et bilans sur <strong style="color:#e2e8f0;">HeurGeo</strong>.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Cliquez sur le bouton ci-dessous pour activer votre accès. Ce lien est valable <strong>7 jours</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${invite_url}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
        Activer mon accès →
      </a>
    </div>
    <p style="color:#475569;font-size:12px;margin:16px 0 0;text-align:center;">
      Lien : <a href="${invite_url}" style="color:#6366f1;">${invite_url}</a>
    </p>
    <hr style="border:none;border-top:1px solid #334155;margin:24px 0 12px;">
    <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
      Vous recevez cet email car ${owner_nom} vous a invité(e) via HeurGeo.
    </p>
  </div>
</body>
</html>`;
}

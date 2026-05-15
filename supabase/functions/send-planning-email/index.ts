// supabase/functions/send-planning-email/index.ts
// Envoi d'email via Gmail SMTP (nodemailer) sans passer par Supabase Auth.
// verify_jwt: false — appelable depuis le frontend sans token.
// Déploiement : supabase functions deploy send-planning-email

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanningPayload {
  patron_email: string;
  employe_nom: string;
  semaine: string;
  planning_url: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Lire le corps ───────────────────────────────────────────────────────
    let body: PlanningPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body JSON invalide ou vide" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { patron_email, employe_nom, semaine, planning_url } = body;

    if (!patron_email || !employe_nom || !semaine || !planning_url) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants : patron_email, employe_nom, semaine, planning_url requis" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Récupérer les credentials Gmail ────────────────────────────────────
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.error("GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans les secrets");
      return new Response(JSON.stringify({ error: "Configuration email manquante" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Configurer le transporteur Gmail SMTP ──────────────────────────────
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // ── Envoyer l'email ─────────────────────────────────────────────────────
    await transporter.sendMail({
      from: `HeurGeo <${gmailUser}>`,
      to: patron_email,
      subject: `Nouveau planning soumis par ${employe_nom}`,
      html: buildEmailHtml({ employe_nom, semaine, planning_url }),
    });

    console.log(`Email envoyé à ${patron_email} pour le planning de ${employe_nom} (semaine ${semaine})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erreur envoi email:", err);
    return new Response(
      JSON.stringify({ error: "Échec envoi email", detail: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml({
  employe_nom,
  semaine,
  planning_url,
}: {
  employe_nom: string;
  semaine: string;
  planning_url: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">

    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:56px;font-size:24px;text-align:center;">⏱</div>
      <h1 style="font-size:22px;font-weight:900;margin:12px 0 4px;letter-spacing:-0.5px;">HeurGeo</h1>
    </div>

    <h2 style="font-size:16px;font-weight:700;margin:0 0 16px;">
      Nouveau planning soumis
    </h2>

    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 8px;">
      <strong style="color:#e2e8f0;">${employe_nom}</strong> a soumis son planning pour la semaine :
    </p>

    <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#a78bfa;">📅 ${semaine}</p>
    </div>

    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Cliquez sur le bouton ci-dessous pour consulter le planning.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${planning_url}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
        Voir le planning →
      </a>
    </div>

    <p style="color:#475569;font-size:12px;margin:16px 0 0;text-align:center;">
      Lien : <a href="${planning_url}" style="color:#6366f1;">${planning_url}</a>
    </p>

    <hr style="border:none;border-top:1px solid #334155;margin:24px 0 12px;">
    <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
      Vous recevez cet email car un employé vous a soumis un planning via HeurGeo.
    </p>

  </div>
</body>
</html>`;
}

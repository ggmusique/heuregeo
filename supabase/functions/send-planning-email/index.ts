// supabase/functions/send-planning-email/index.ts
// Envoi d'email via Gmail SMTP (nodemailer) — authentification JWT requise.
// SÉCURITÉ (2026-05-22) :
//  - verify_jwt = true (défaut Supabase) : Supabase vérifie le JWT avant d'appeler la fonction.
//  - requireAuth() vérifie également le JWT en interne (défense en profondeur).
//  - validateEmail() protège contre l'injection d'adresses invalides.
//  - validateOrigin() bloque les URLs de phishing dans les emails.
//  - checkRateLimit() limite à 10 emails/heure par utilisateur.
//  - CORS restreint à la whitelist via corsHeaders(req).
// Déploiement : supabase functions deploy send-planning-email

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";
import {
  handleCors,
  jsonError,
  jsonOk,
  requireAuth,
  validateEmail,
  validateOrigin,
  validateNonEmpty,
} from "../_shared/auth.ts";
import { checkRateLimit, extractIpAddress, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/monitoring.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  if (req.method !== "POST") {
    return jsonError("Méthode non autorisée", 405, req);
  }

  try {
    // ── [SÉCURITÉ] Vérification JWT — refuse tout appel anonyme ────────────
    // requireAuth() lève une Response 401 si non authentifié.
    const { user, adminClient } = await requireAuth(req);

    // ── [SÉCURITÉ] Rate limiting — max 10 emails/heure par user ───────────
    const ip = extractIpAddress(req);
    await checkRateLimit(adminClient, {
      action: "send_planning_email",
      userId: user.id,
      ipAddress: ip,
      req,
      ...RATE_LIMITS.SEND_PLANNING_EMAIL,
    });

    // ── Lire et valider le corps ────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Body JSON invalide ou vide", 400, req);
    }

    const { patron_email, employe_nom, semaine, planning_url } = body;

    // Validation stricte de chaque paramètre
    validateNonEmpty(employe_nom, "employe_nom", 200, req);
    validateNonEmpty(semaine, "semaine", 50, req);
    validateEmail(patron_email, req);            // Format email valide
    validateOrigin(planning_url, req);           // URL dans la whitelist de l'app

    // ── Récupérer les credentials Gmail ────────────────────────────────────
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.error("GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans les secrets");
      return jsonError("Configuration email manquante", 500, req);
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
      to: patron_email as string,
      subject: `Nouveau planning soumis par ${employe_nom}`,
      html: buildEmailHtml({
        employe_nom: employe_nom as string,
        semaine: semaine as string,
        planning_url: planning_url as string,
      }),
    });

    logger.info("send-planning-email", "Email envoyé", {
      userId: user.id.slice(0, 8),
      semaine: semaine as string,
    });

    return jsonOk({ success: true }, 200, req);
  } catch (err) {
    // Si c'est une Response levée par requireAuth / checkRateLimit / validate*
    if (err instanceof Response) return err;
    // Loguer l'erreur complète côté serveur (jamais côté client)
    logger.error("send-planning-email", "Erreur interne", {
      error: (err as Error).message,
    });
    // Retourner un message générique sans détails techniques
    return jsonError("Erreur lors de l'envoi de l'email. Veuillez réessayer.", 500, req);
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

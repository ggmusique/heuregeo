// supabase/functions/send-patron-invite/index.ts
// Edge Function Supabase : envoi de l'email d'invitation patron
// SÉCURITÉ (2026-05-22) :
//  - requireAuth() vérifie le JWT (défense en profondeur, JWT Supabase aussi vérifié en amont).
//  - Lecture de l'invitation en DB avec vérification owner_id = caller → empêche l'envoi
//    d'emails arbitraires depuis un compte authentifié.
//  - Utilisation de invitation.patron_email issu de la DB, pas du body → pas d'injection email.
//  - validateOrigin() sur invite_url → pas de phishing via URL arbitraire.
//  - checkRateLimit() : max 20 invitations/heure par user.
//  - CORS restreint à la whitelist via corsHeaders(req).
// Déploiement : supabase functions deploy send-patron-invite

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer";
import {
  handleCors,
  jsonError,
  jsonOk,
  requireAuth,
  validateOrigin,
} from "../_shared/auth.ts";
import { checkRateLimit, extractIpAddress, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/monitoring.ts";

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    // ── [SÉCURITÉ] Vérification JWT ──────────────────────────────────────────
    const { user, adminClient } = await requireAuth(req);

    // ── [SÉCURITÉ] Rate limiting ─────────────────────────────────────────────
    const ip = extractIpAddress(req);
    await checkRateLimit(adminClient, {
      action: "send_patron_invite",
      userId: user.id,
      ipAddress: ip,
      req,
      ...RATE_LIMITS.SEND_PATRON_INVITE,
    });

    // ── Lire le corps ───────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Body JSON invalide ou vide", 400, req);
    }

    const { token, invite_url, owner_nom, patron_nom } = body;

    if (!token || typeof token !== "string") {
      return jsonError("Paramètre manquant : token", 400, req);
    }

    // Valider invite_url avant même d'aller en DB
    validateOrigin(invite_url, req);

    // ── [SÉCURITÉ] Lire l'invitation depuis la DB et vérifier l'ownership ───
    // On charge l'invitation par son token en vérifiant que :
    //  1. Le token existe et est encore "pending" (non utilisé / non annulé)
    //  2. owner_id = user.id → l'appelant est bien l'owner de CETTE invitation
    //  3. L'invitation n'est pas expirée
    //
    // On utilise intentionnellement invitation.patron_email depuis la DB,
    // et NON l'email fourni dans le body, pour empêcher toute injection.
    const { data: invitation, error: invErr } = await adminClient
      .from("patron_invitations")
      .select("id, owner_id, patron_email, status, invite_expires, method")
      .eq("invite_token", token)
      .eq("owner_id", user.id)        // ← binding owner → caller
      .eq("status", "pending")
      .single();

    if (invErr || !invitation) {
      // Ne pas révéler si le token existe mais appartient à un autre user
      return jsonError("Invitation introuvable, expirée ou non autorisée", 403, req);
    }

    // Vérifier expiration
    if (invitation.invite_expires && new Date(invitation.invite_expires) < new Date()) {
      return jsonError("Cette invitation a expiré", 403, req);
    }

    // ── Résoudre les noms depuis les paramètres du body (non-sensibles) ─────
    // owner_nom et patron_nom sont des chaînes d'affichage, pas critiques.
    // On les tronque pour éviter tout débordement dans l'email.
    const safeOwnerNom = typeof owner_nom === "string"
      ? owner_nom.slice(0, 100)
      : "Votre employeur";
    const safePatronNom = typeof patron_nom === "string"
      ? patron_nom.slice(0, 100)
      : "";

    // L'email de destination est toujours celui de la DB, jamais du body
    const recipientEmail = invitation.patron_email;

    // ── Envoi via Brevo SMTP ─────────────────────────────────────────────
    const brevoLogin = Deno.env.get("BREVO_LOGIN");
    const brevoPassword = Deno.env.get("BREVO_PASSWORD");

    if (!brevoLogin || !brevoPassword) {
      console.error("BREVO_LOGIN ou BREVO_PASSWORD manquant dans les secrets Supabase");
      return jsonError("Configuration SMTP manquante", 500, req);
    }

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: brevoLogin,
        pass: brevoPassword,
      },
    });

    // Vérification de la connexion SMTP avant envoi
    try {
      await transporter.verify();
    } catch (verifyErr) {
      logger.error("send-patron-invite", "Erreur connexion SMTP Brevo", {
        error: (verifyErr as Error).message,
      });
      return jsonError("Connexion SMTP temporairement indisponible", 500, req);
    }

    try {
      await transporter.sendMail({
        from: "Geoffrey <geohelene@msn.com>",
        to: recipientEmail,
        subject: `${safeOwnerNom} vous invite à consulter vos heures sur HeurGeo`,
        html: buildEmailHtml({
          patron_nom: safePatronNom,
          owner_nom: safeOwnerNom,
          invite_url: invite_url as string,
        }),
      });
      logger.info("send-patron-invite", "Invitation envoyée", {
        userId: user.id.slice(0, 8),
        invitationId: invitation.id.slice(0, 8),
      });
    } catch (smtpErr) {
      logger.error("send-patron-invite", "Erreur envoi SMTP Brevo", {
        error: (smtpErr as Error).message,
      });
      return jsonError("Erreur lors de l'envoi de l'email. Veuillez réessayer.", 500, req);
    }

    return jsonOk({ success: true }, 200, req);
  } catch (err) {
    // Si c'est une Response levée par requireAuth / checkRateLimit / validateOrigin
    if (err instanceof Response) return err;
    console.error("Edge function error:", err);
    return jsonError("Erreur interne", 500, req);
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

// supabase/functions/_shared/rateLimit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting simple basé sur Postgres.
// Prérequis : table rate_limit_log créée dans migration 20260522000000.
//
// STRATÉGIE :
//  1. Chaque action est loggée avec user_id + ip_address + created_at.
//  2. On compte les événements récents (par user OU par IP) dans la fenêtre.
//  3. Si > limite → réponse 429 avec Retry-After header.
//  4. Sinon → on insère le log et on continue.
//  5. Cleanup automatique : on supprime les entrées > 24h à chaque insertion
//     (probabilité 1/50 pour ne pas surcharger à chaque appel).
//
// LIMITES :
//  - En bêta privée, le rate limiting par user est suffisant.
//  - La limite par IP est une défense supplémentaire contre les comptes multiples.
//  - Pour une prod publique à fort trafic, préférer Redis/Upstash.
// ─────────────────────────────────────────────────────────────────────────────

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "./auth.ts";

export interface RateLimitConfig {
  /** Nom de l'action à limiter, ex: "send_planning_email" */
  action: string;
  /** Identifiant de l'utilisateur (obligatoire) */
  userId: string;
  /** Adresse IP de l'appelant (optionnelle, extraite du header X-Forwarded-For) */
  ipAddress?: string;
  /** Nombre maximum d'appels par user dans la fenêtre */
  maxCalls: number;
  /** Durée de la fenêtre en minutes */
  windowMinutes: number;
  /** Nombre maximum d'appels par IP dans la fenêtre (optionnel, plus large) */
  maxCallsPerIp?: number;
  /** Requête courante : utilisée pour renvoyer des en-têtes CORS corrects sur la 429 */
  req?: Request;
}

/**
 * Extrait l'adresse IP depuis les headers de la requête.
 * Compatible Vercel, Cloudflare, et Supabase Edge Functions.
 */
export function extractIpAddress(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    undefined
  );
}

/**
 * Vérifie et enregistre un appel pour le rate limiting.
 * Lance une Response 429 si la limite est dépassée.
 *
 * Usage dans une Edge Function :
 *   const ip = extractIpAddress(req);
 *   await checkRateLimit(adminClient, {
 *     action: "send_planning_email",
 *     userId: user.id,
 *     ipAddress: ip,
 *     req,
 *     ...RATE_LIMITS.SEND_PLANNING_EMAIL,
 *   });
 */
export async function checkRateLimit(
  adminClient: SupabaseClient,
  config: RateLimitConfig
): Promise<void> {
  const { action, userId, ipAddress, maxCalls, windowMinutes, maxCallsPerIp, req } = config;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // ── 1. Vérification par user ──────────────────────────────────────────────
  const { count: userCount, error: userCountError } = await adminClient
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (userCountError) {
    // Fail open : ne pas bloquer l'app si la table est inaccessible
    console.error(`[rateLimit] check error user ${action}/${userId}:`, userCountError.message);
  } else if ((userCount ?? 0) >= maxCalls) {
    const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();
    console.warn(`[rateLimit] exceeded user: action=${action} user=${userId} count=${userCount}/${maxCalls}`);
    throw new Response(
      JSON.stringify({
        error: `Trop de requêtes. Limite : ${maxCalls} par ${windowMinutes} min. Réessayez plus tard.`,
        reset_at: resetAt,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "application/json",
          "Retry-After": String(windowMinutes * 60),
        },
      }
    );
  }

  // ── 2. Vérification par IP (si fournie et limite IP définie) ──────────────
  if (ipAddress && maxCallsPerIp !== undefined) {
    const { count: ipCount, error: ipCountError } = await adminClient
      .from("rate_limit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", action)
      .eq("ip_address", ipAddress)
      .gte("created_at", windowStart);

    if (!ipCountError && (ipCount ?? 0) >= maxCallsPerIp) {
      const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();
      console.warn(`[rateLimit] exceeded ip: action=${action} ip=${ipAddress} count=${ipCount}/${maxCallsPerIp}`);
      throw new Response(
        JSON.stringify({
          error: `Trop de requêtes depuis cette adresse IP. Réessayez plus tard.`,
          reset_at: resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
            "Retry-After": String(windowMinutes * 60),
          },
        }
      );
    }
  }

  // ── 3. Enregistrement de l'appel ──────────────────────────────────────────
  const { error: insertError } = await adminClient
    .from("rate_limit_log")
    .insert({
      action,
      user_id: userId,
      ...(ipAddress ? { ip_address: ipAddress } : {}),
    });

  if (insertError) {
    console.error(`[rateLimit] insert error for ${action}/${userId}:`, insertError.message);
    // Fail open : ne pas bloquer l'utilisateur si l'insert échoue
  }

  // ── 4. Cleanup probabiliste (1/50) ────────────────────────────────────────
  // Evite d'accumuler des millions de lignes sans pg_cron
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    adminClient
      .from("rate_limit_log")
      .delete()
      .lt("created_at", cutoff)
      .then(({ error }) => {
        if (error) {
          console.error("[rateLimit] cleanup error:", error.message);
        } else {
          console.log("[rateLimit] cleanup: entrées > 24h supprimées");
        }
      });
    // Fire-and-forget : pas d'await pour ne pas bloquer la réponse
  }
}

// ─── Configs prédéfinies ──────────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Envoi d'un email de planning : max 10/heure par user, max 30/heure par IP */
  SEND_PLANNING_EMAIL: { maxCalls: 10, windowMinutes: 60, maxCallsPerIp: 30 },
  /** Envoi d'une invitation patron : max 20/heure par user, max 50/heure par IP */
  SEND_PATRON_INVITE: { maxCalls: 20, windowMinutes: 60, maxCallsPerIp: 50 },
  /** Suppression d'utilisateur : max 5/heure (admin) */
  DELETE_USER: { maxCalls: 5, windowMinutes: 60 },
} as const;

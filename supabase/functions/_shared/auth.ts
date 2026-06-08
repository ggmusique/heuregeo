// supabase/functions/_shared/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Middleware de sécurité partagé entre toutes les Edge Functions.
// Import : import { requireAuth, requireAdmin, validateEmail, validateOrigin, jsonError } from "../_shared/auth.ts";
//
// SÉCURITÉ :
//  - Centralise l'extraction/vérification JWT pour éviter tout oubli dans une fonction.
//  - requireAdmin() recharge le profil depuis la DB (pas de trust sur le token JWT seul).
//  - validateEmail() et validateOrigin() empêchent l'injection de données arbitraires.
//  - corsHeaders() restreint l'origine autorisée à la whitelist (plus de "*").
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: { id: string; email: string | undefined };
  adminClient: SupabaseClient;
}

// ─── Origines autorisées (source unique de vérité) ────────────────────────────

/**
 * Liste des origines autorisées pour l'application.
 * Lue depuis la variable d'environnement ALLOWED_APP_ORIGINS (séparées par des
 * virgules), avec fallback sur les valeurs de production connues.
 * Réutilisée à la fois par le CORS et par validateOrigin().
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_APP_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return [
    "https://heuregeo.vercel.app",
    "https://www.heuregeo.com",
    "https://heuregeo.com",
    "http://localhost:5173",
    "http://localhost:4173",
  ];
}

// ─── Helpers CORS / JSON ──────────────────────────────────────────────────────

/**
 * Construit les en-têtes CORS en fonction de l'Origin de la requête.
 *  - Origin présente dans la whitelist → on renvoie cette origine + Vary: Origin.
 *  - Sinon → aucun Access-Control-Allow-Origin (le navigateur bloque l'appel cross-site).
 * Passer `req` permet de refléter l'origine appelante ; sans `req`, seuls les
 * en-têtes de base sont renvoyés.
 */
export function corsHeaders(req?: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const origin = req?.headers.get("Origin");
  if (origin && getAllowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/**
 * Retourne une réponse JSON d'erreur normalisée avec headers CORS.
 * Utiliser en retour direct : return jsonError("Message", 401, req)
 */
export function jsonError(message: string, status: number, req?: Request): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Retourne une réponse JSON de succès normalisée avec headers CORS.
 */
export function jsonOk(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// ─── Création du client admin ─────────────────────────────────────────────────

/**
 * Crée un client Supabase avec la service_role key (bypass RLS).
 * Utilisé uniquement côté serveur pour vérifier les JWTs et effectuer des
 * opérations nécessitant l'accès admin.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans les secrets");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// ─── Vérification JWT ─────────────────────────────────────────────────────────

/**
 * Extrait le Bearer token de l'Authorization header.
 * Retourne null si absent ou mal formé.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Vérifie l'authentification de l'appelant.
 * Lance une Response d'erreur (throw) si non authentifié.
 *
 * Usage :
 *   const { user, adminClient } = await requireAuth(req);
 *
 * SÉCURITÉ : Toujours appeler cette fonction en première dans le handler.
 * Si elle ne throw pas, l'appelant est authentifié.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    throw jsonError("Non authentifié : Authorization header manquant", 401, req);
  }

  const adminClient = createAdminClient();

  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    throw jsonError("Non authentifié : JWT invalide ou expiré", 401, req);
  }

  return { user: { id: user.id, email: user.email }, adminClient };
}

/**
 * Vérifie que l'appelant est administrateur (is_admin = true dans profiles).
 * Lance une Response d'erreur (throw) si non admin.
 * Doit être appelée APRÈS requireAuth().
 *
 * Usage :
 *   const { user, adminClient } = await requireAuth(req);
 *   await requireAdmin(user.id, adminClient, req);
 */
export async function requireAdmin(userId: string, adminClient: SupabaseClient, req?: Request): Promise<void> {
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    throw jsonError("Accès réservé aux administrateurs", 403, req);
  }
}

// ─── Validations d'entrée ─────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valide le format d'une adresse email.
 * Lance une Response 400 si invalide.
 */
export function validateEmail(email: unknown, req?: Request): asserts email is string {
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    throw jsonError(`Email invalide : ${email}`, 400, req);
  }
}

/**
 * Valide qu'une URL appartient à l'une des origines autorisées de l'application.
 * Protège contre l'injection d'URLs de phishing dans les emails envoyés.
 *
 * Les origines autorisées proviennent de getAllowedOrigins() (variable
 * d'environnement ALLOWED_APP_ORIGINS avec fallback production).
 *
 * Lance une Response 400 si l'URL ne fait pas partie de la liste.
 */
export function validateOrigin(url: unknown, req?: Request): asserts url is string {
  if (typeof url !== "string") {
    throw jsonError("URL invalide", 400, req);
  }

  const allowedOrigins = getAllowedOrigins();

  // Comparaison stricte sur l'origine (scheme + host + port) via URL API.
  // startsWith() serait vulnérable à l'usurpation de domaine :
  //   "https://heuregeo.vercel.app.evil.com".startsWith("https://heuregeo.vercel.app") → true (faux positif)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw jsonError("URL malformée", 400, req);
  }

  const isAllowed = allowedOrigins.some((origin) => {
    try {
      return parsedUrl.origin === new URL(origin).origin;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    throw jsonError(
      `URL non autorisée. Les origines acceptées sont : ${allowedOrigins.join(", ")}`,
      400,
      req
    );
  }
}

/**
 * Valide qu'une chaîne est non-vide et sous une longueur maximale.
 * Lance une Response 400 sinon.
 */
export function validateNonEmpty(value: unknown, fieldName: string, maxLength = 500, req?: Request): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw jsonError(`Champ requis : ${fieldName}`, 400, req);
  }
  if (value.length > maxLength) {
    throw jsonError(`Champ trop long : ${fieldName} (max ${maxLength} caractères)`, 400, req);
  }
}

// ─── Handler CORS OPTIONS ─────────────────────────────────────────────────────

/**
 * Retourne la réponse pour les requêtes OPTIONS (preflight CORS).
 * Utiliser au tout début du handler :
 *   if (req.method === "OPTIONS") return handleCors(req);
 */
export function handleCors(req?: Request): Response {
  return new Response("ok", { headers: corsHeaders(req) });
}

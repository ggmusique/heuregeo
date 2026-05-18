// supabase/functions/_shared/monitoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Logging structuré pour les Edge Functions Deno (Supabase).
//
// SÉCURITÉ :
//  - Ne jamais loguer : tokens JWT, mots de passe, emails complets.
//  - Tronquer les UUIDs dans les logs publics (8 premiers chars suffisent).
//  - Niveaux : debug (dev only), info, warn, error.
//  - Format JSON pour faciliter le parsing dans Supabase Logs / Datadog.
//
// USAGE :
//  import { logger } from "../_shared/monitoring.ts";
//  logger.info("send-planning-email", "Email envoyé", { userId: user.id });
//  logger.error("send-patron-invite", "Erreur SMTP", { code: "ECONNREFUSED" });
// ─────────────────────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  function: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "token", "jwt", "password", "email", "phone",
  "invite_token", "access_token", "refresh_token",
  "authorization", "cookie",
]);

/**
 * Nettoie un objet en masquant les clés sensibles.
 * Recursif sur un seul niveau (pas de deep traversal pour éviter la surcharge).
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.has(key.toLowerCase()) ||
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("password");
    result[key] = isSensitive ? "[REDACTED]" : value;
  }
  return result;
}

/**
 * Tronque un UUID pour les logs (évite de logger des identifiants complets
 * dans des logs potentiellement exportés).
 */
export function truncateId(id: string | null | undefined): string {
  if (!id) return "null";
  return id.slice(0, 8) + "…";
}

function log(level: LogLevel, functionName: string, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    function: functionName,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? sanitize(data) : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "debug":
      // En prod, ne pas loguer le debug (trop verbeux)
      if (Deno.env.get("SUPABASE_ENV") !== "local") return;
      console.debug(line);
      break;
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (fn: string, msg: string, data?: Record<string, unknown>) => log("debug", fn, msg, data),
  info:  (fn: string, msg: string, data?: Record<string, unknown>) => log("info",  fn, msg, data),
  warn:  (fn: string, msg: string, data?: Record<string, unknown>) => log("warn",  fn, msg, data),
  error: (fn: string, msg: string, data?: Record<string, unknown>) => log("error", fn, msg, data),
};

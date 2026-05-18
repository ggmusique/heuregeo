// src/lib/monitoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Monitoring & Error Tracking — Sentry + logs structurés
//
// SÉCURITÉ :
//  - Ne jamais loguer : tokens JWT, mots de passe, emails complets, UUIDs bruts.
//  - Masquer les données sensibles avant envoi à Sentry.
//  - L'utilisateur est identifié uniquement par son UUID (pas son email).
//  - En développement, les erreurs s'affichent uniquement dans la console.
//
// USAGE :
//  import { monitoring } from "../lib/monitoring";
//  monitoring.captureError(error, { route: "/missions", userId: user.id });
//  monitoring.captureMessage("Opération critique", { acompteId: id });
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/react";

const IS_PROD = import.meta.env.PROD;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// ─── Initialisation ───────────────────────────────────────────────────────────

export function initMonitoring(): void {
  if (!SENTRY_DSN) {
    if (IS_PROD) {
      console.warn("[monitoring] VITE_SENTRY_DSN non configuré — erreurs non trackées en prod.");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PROD ? "production" : "development",
    release: import.meta.env.VITE_BUILD_VERSION as string | undefined,

    // Taux d'échantillonnage : 100% en prod, 0% en dev (console suffit)
    tracesSampleRate: IS_PROD ? 0.1 : 0,

    // Ne jamais envoyer en mode test/CI
    enabled: IS_PROD && Boolean(SENTRY_DSN),

    // Avant envoi : nettoyer les données sensibles
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },

    // Ignorer les erreurs non critiques
    ignoreErrors: [
      // Erreurs réseau transitoires
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      // Erreurs navigateur communes non actionables
      "ResizeObserver loop",
      "Non-Error promise rejection captured with value: Object Not Found Matching",
    ],
  });
}

// ─── Nettoyage des données sensibles ─────────────────────────────────────────

const SENSITIVE_KEYS = [
  "token", "jwt", "password", "email", "phone",
  "invite_token", "access_token", "refresh_token",
  "authorization", "cookie", "session",
];

function sanitizeSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  // Supprimer les données sensibles des extra et tags
  if (event.extra) {
    event.extra = sanitizeObject(event.extra);
  }
  if (event.tags) {
    event.tags = sanitizeObject(event.tags) as Record<string, string>;
  }
  // Supprimer les query strings des URLs (peuvent contenir des tokens)
  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      url.search = ""; // retire tous les query params
      event.request.url = url.toString();
    } catch {
      // URL malformée, on laisse passer
    }
  }
  return event;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k));
    result[key] = isSensitive ? "[REDACTED]" : value;
  }
  return result;
}

// ─── Interface publique ───────────────────────────────────────────────────────

export interface CaptureContext {
  /** UUID de l'utilisateur connecté (jamais l'email) */
  userId?: string;
  /** Route/page courante */
  route?: string;
  /** Nom de la fonction API appelée */
  apiFunction?: string;
  /** Contexte métier minimal (sans données sensibles) */
  [key: string]: unknown;
}

export const monitoring = {
  /**
   * Capture une erreur avec contexte.
   * En dev : affiche dans la console.
   * En prod : envoie à Sentry.
   */
  captureError(error: unknown, context?: CaptureContext): void {
    const safeContext = context ? sanitizeObject(context as Record<string, unknown>) : {};

    if (!IS_PROD || !SENTRY_DSN) {
      console.error("[monitoring]", error, safeContext);
      return;
    }

    Sentry.withScope((scope) => {
      if (safeContext.userId) {
        scope.setUser({ id: safeContext.userId as string });
      }
      if (safeContext.route) {
        scope.setTag("route", safeContext.route as string);
      }
      if (safeContext.apiFunction) {
        scope.setTag("api_function", safeContext.apiFunction as string);
      }
      scope.setExtras(safeContext);
      Sentry.captureException(error);
    });
  },

  /**
   * Capture un message informatif (opération critique, abus détecté...).
   */
  captureMessage(message: string, context?: CaptureContext): void {
    const safeContext = context ? sanitizeObject(context as Record<string, unknown>) : {};

    if (!IS_PROD || !SENTRY_DSN) {
      console.info("[monitoring]", message, safeContext);
      return;
    }

    Sentry.withScope((scope) => {
      scope.setExtras(safeContext);
      Sentry.captureMessage(message, "info");
    });
  },

  /**
   * Identifie l'utilisateur courant (uniquement par UUID).
   * Appeler après connexion.
   */
  setUser(userId: string): void {
    if (!IS_PROD || !SENTRY_DSN) return;
    Sentry.setUser({ id: userId });
  },

  /**
   * Efface l'utilisateur (appeler à la déconnexion).
   */
  clearUser(): void {
    if (!IS_PROD || !SENTRY_DSN) return;
    Sentry.setUser(null);
  },
};

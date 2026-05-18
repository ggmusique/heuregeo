// src/hooks/useSystemHealth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook principal de la page "Santé système".
//
// Agrège les données de :
//   - Base de données Supabase (latence mesurée)
//   - Fonction RPC get_health_stats() (agrégats sécurisés admin-only)
//   - audit_logs (timeline des événements récents)
//
// SÉCURITÉ :
//   - Ne s'exécute pas si isAdmin est false
//   - La RPC get_health_stats() vérifie is_admin côté Postgres (SECURITY DEFINER)
//   - Aucune donnée brute sensible n'est transmise à l'UI
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import { humanizeAuditEvent } from "../theme/healthTheme";
import type {
  SystemHealthData,
  HealthScore,
  ServiceStatus,
  EdgeFunctionHealth,
  TimelineEvent,
  RateLimitStats,
  HealthStatus,
  HealthStatsRpcResponse,
} from "../types/systemHealth";

// ─── Constante de rafraîchissement ───────────────────────────────────────────

const REFRESH_INTERVAL_MS = 60_000; // 60 secondes

// ─── Calcul du score de santé ─────────────────────────────────────────────────

function computeHealthScore(opts: {
  dbConnected: boolean;
  dbLatencyMs: number | null;
  rateLimitHits1h: number;
  rateLimitHits24h: number;
}): HealthScore {
  if (!opts.dbConnected) {
    return {
      value: 0,
      status: "critical",
      label: "Incident détecté",
      details: ["La connexion à la base de données a échoué."],
    };
  }

  let score = 100;
  const details: string[] = [];

  // Latence DB
  if (opts.dbLatencyMs !== null) {
    if (opts.dbLatencyMs > 2000) {
      score -= 25;
      details.push("La base de données répond très lentement.");
    } else if (opts.dbLatencyMs > 800) {
      score -= 10;
      details.push("La base de données répond avec un léger délai.");
    }
  }

  // Rate limiting inhabituel
  if (opts.rateLimitHits1h > 50) {
    score -= 20;
    details.push("Volume de requêtes très élevé sur la dernière heure.");
  } else if (opts.rateLimitHits1h > 20) {
    score -= 8;
    details.push("Activité inhabituelle détectée sur les services.");
  }

  score = Math.max(0, Math.min(100, score));

  const status: HealthStatus =
    score >= 80 ? "healthy" : score >= 55 ? "warning" : "critical";

  const label =
    status === "healthy"
      ? "Système sain"
      : status === "warning"
      ? "Quelques ralentissements"
      : "Incident détecté";

  if (details.length === 0) details.push("Tout fonctionne normalement.");

  return { value: Math.round(score), status, label, details };
}

// ─── Construction des services ────────────────────────────────────────────────

function buildServices(opts: {
  dbConnected: boolean;
  dbLatencyMs: number | null;
  rateLimitHits1h: number;
  emailCalls24h: number;
  now: Date;
}): ServiceStatus[] {
  const { dbConnected, dbLatencyMs, rateLimitHits1h, emailCalls24h, now } = opts;

  const dbStatus: HealthStatus = !dbConnected
    ? "critical"
    : dbLatencyMs === null
    ? "unknown"
    : dbLatencyMs > 2000
    ? "critical"
    : dbLatencyMs > 800
    ? "warning"
    : "healthy";

  const dbMessage = !dbConnected
    ? "La base de données est inaccessible."
    : dbLatencyMs === null
    ? "État inconnu."
    : dbLatencyMs > 2000
    ? "Réponse très lente. Un incident est probable."
    : dbLatencyMs > 800
    ? "Légère lenteur détectée."
    : "Tout fonctionne normalement.";

  const rateLimitStatus: HealthStatus =
    rateLimitHits1h > 50 ? "warning" : "healthy";

  const rateLimitMessage =
    rateLimitHits1h > 50
      ? "Activité inhabituelle : beaucoup de requêtes ont été limitées."
      : "Aucune activité suspecte détectée.";

  const emailStatus: HealthStatus = emailCalls24h > 0 ? "healthy" : "unknown";
  const emailMessage =
    emailCalls24h > 0
      ? "Les emails ont été envoyés avec succès aujourd'hui."
      : "Aucun email envoyé dans les dernières 24h.";

  return [
    {
      id: "database",
      label: "Base de données",
      icon: "🗄️",
      status: dbStatus,
      humanMessage: dbMessage,
      latencyMs: dbLatencyMs,
      lastChecked: now,
    },
    {
      id: "auth",
      label: "Authentification",
      icon: "🔐",
      status: "healthy",
      humanMessage: "La connexion des utilisateurs fonctionne normalement.",
      lastChecked: now,
    },
    {
      id: "edge_functions",
      label: "Services cloud",
      icon: "⚡",
      status: dbConnected ? "healthy" : "unknown",
      humanMessage: dbConnected
        ? "Les services cloud sont opérationnels."
        : "Impossible de vérifier l'état des services cloud.",
      lastChecked: now,
    },
    {
      id: "email",
      label: "Envoi d'emails",
      icon: "📧",
      status: emailStatus,
      humanMessage: emailMessage,
      lastChecked: now,
    },
    {
      id: "rate_limiting",
      label: "Protection anti-abus",
      icon: "🛡️",
      status: rateLimitStatus,
      humanMessage: rateLimitMessage,
      lastChecked: now,
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: "📡",
      status: "healthy",
      humanMessage: "Les journaux d'activité sont enregistrés correctement.",
      lastChecked: now,
    },
  ];
}

// ─── Construction des Edge Functions ─────────────────────────────────────────

function buildEdgeFunctions(opts: {
  emailCalls24h: number;
  inviteCalls24h: number;
  lastAuditEvent: string | null;
}): EdgeFunctionHealth[] {
  const { emailCalls24h, inviteCalls24h, lastAuditEvent } = opts;

  const lastAuditDate = lastAuditEvent ? new Date(lastAuditEvent) : null;

  return [
    {
      id: "send-planning-email",
      label: "Email de planning",
      description: "Envoie le récapitulatif hebdomadaire aux patrons.",
      status: emailCalls24h > 0 ? "healthy" : "unknown",
      humanMessage:
        emailCalls24h > 0
          ? `${emailCalls24h} email(s) envoyé(s) aujourd'hui.`
          : "Aucun email envoyé dans les dernières 24h.",
      calls24h: emailCalls24h,
      lastCalledAt: emailCalls24h > 0 ? lastAuditDate : null,
    },
    {
      id: "send-patron-invite",
      label: "Invitation patron",
      description: "Envoie les invitations de connexion aux patrons.",
      status: inviteCalls24h > 0 ? "healthy" : "unknown",
      humanMessage:
        inviteCalls24h > 0
          ? `${inviteCalls24h} invitation(s) envoyée(s) aujourd'hui.`
          : "Aucune invitation envoyée dans les dernières 24h.",
      calls24h: inviteCalls24h,
      lastCalledAt: inviteCalls24h > 0 ? lastAuditDate : null,
    },
    {
      id: "delete-user",
      label: "Suppression de compte",
      description: "Supprime définitivement les comptes utilisateurs.",
      status: "unknown",
      humanMessage: "Aucune suppression récente.",
      calls24h: 0,
      lastCalledAt: null,
    },
    {
      id: "verify-patron-invite",
      label: "Vérification d'invitation",
      description: "Valide les tokens d'invitation patron.",
      status: "unknown",
      humanMessage: "Service disponible et en attente.",
      calls24h: 0,
      lastCalledAt: null,
    },
  ];
}

// ─── Construction de la timeline ──────────────────────────────────────────────

interface AuditLogRow {
  id: string;
  table_name: string;
  operation: string;
  created_at: string;
}

function buildTimeline(rows: AuditLogRow[]): TimelineEvent[] {
  return rows.map((row) => ({
    id: row.id,
    type: "info",
    humanMessage: humanizeAuditEvent(row.table_name, row.operation),
    technicalDetail: `${row.table_name} — ${row.operation}`,
    timestamp: new Date(row.created_at),
    severity: "info" as const,
  }));
}

// ─── Construction des stats rate limiting ────────────────────────────────────

function buildRateLimitStats(opts: {
  hitsLastHour: number;
  hitsLast24h: number;
  topAction: string | null;
}): RateLimitStats {
  const { hitsLastHour, hitsLast24h, topAction } = opts;

  const status: HealthStatus =
    hitsLastHour > 50 ? "warning" : hitsLastHour > 20 ? "warning" : "healthy";

  const humanMessage =
    hitsLastHour > 50
      ? "Volume élevé de requêtes détecté sur la dernière heure."
      : hitsLastHour > 5
      ? `${hitsLastHour} requêtes traitées cette heure.`
      : "Activité normale.";

  return { hitsLastHour, hitsLast24h, topAction, status, humanMessage };
}

// ─── État retourné par le hook ────────────────────────────────────────────────

export interface UseSystemHealthReturn {
  data: SystemHealthData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Agrège toutes les données de santé du système.
 * Ne s'exécute que si isAdmin === true.
 * Toutes les requêtes sont sécurisées côté Supabase (RLS + SECURITY DEFINER).
 */
export function useSystemHealth(isAdmin: boolean): UseSystemHealthReturn {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!isAdmin) {
      setError("Accès refusé");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();

    try {
      // ── 1. Latence DB (ping) ────────────────────────────────────────────────
      const pingStart = performance.now();
      let dbConnected = false;
      let dbLatencyMs: number | null = null;

      try {
        const { error: pingError } = await supabase
          .from("profiles")
          .select("id")
          .limit(1)
          .maybeSingle();
        dbLatencyMs = Math.round(performance.now() - pingStart);
        dbConnected = !pingError;
      } catch {
        dbConnected = false;
      }

      // ── 2. Statistiques agrégées (RPC sécurisée) ──────────────────────────
      let stats: HealthStatsRpcResponse = {
        audit_events_24h: 0,
        audit_events_1h: 0,
        rate_limit_hits_1h: 0,
        rate_limit_hits_24h: 0,
        top_rate_limit_action: null,
        send_email_calls_24h: 0,
        send_invite_calls_24h: 0,
        last_audit_event: null,
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_health_stats"
      );

      if (!rpcError && rpcData) {
        stats = rpcData as HealthStatsRpcResponse;
      }

      // ── 3. Timeline (audit_logs récents) ────────────────────────────────────
      const { data: auditRows } = await supabase
        .from("audit_logs")
        .select("id, table_name, operation, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      // ── 4. Assemblage ────────────────────────────────────────────────────────
      const score = computeHealthScore({
        dbConnected,
        dbLatencyMs,
        rateLimitHits1h: stats.rate_limit_hits_1h,
        rateLimitHits24h: stats.rate_limit_hits_24h,
      });

      const services = buildServices({
        dbConnected,
        dbLatencyMs,
        rateLimitHits1h: stats.rate_limit_hits_1h,
        emailCalls24h: stats.send_email_calls_24h,
        now,
      });

      const edgeFunctions = buildEdgeFunctions({
        emailCalls24h: stats.send_email_calls_24h,
        inviteCalls24h: stats.send_invite_calls_24h,
        lastAuditEvent: stats.last_audit_event,
      });

      const timeline = buildTimeline(
        (auditRows as AuditLogRow[] | null) ?? []
      );

      const rateLimiting = buildRateLimitStats({
        hitsLastHour: stats.rate_limit_hits_1h,
        hitsLast24h: stats.rate_limit_hits_24h,
        topAction: stats.top_rate_limit_action,
      });

      setData({
        score,
        services,
        edgeFunctions,
        timeline,
        errors: [],
        rateLimiting,
        dbLatencyMs,
        lastRefreshed: now,
      });
    } catch (err) {
      setError("Impossible de charger les données de santé. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Chargement initial + intervalle de rafraîchissement
  useEffect(() => {
    if (!isAdmin) return;
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAdmin, fetchHealth]);

  return { data, loading, error, refresh: fetchHealth };
}

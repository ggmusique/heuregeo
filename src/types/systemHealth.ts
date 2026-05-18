// src/types/systemHealth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types pour la page "Santé système" — données UI prêtes à l'emploi,
// sans jargon technique exposé.
// ─────────────────────────────────────────────────────────────────────────────

// ─── États de santé ──────────────────────────────────────────────────────────

/** État de santé d'un service ou d'une métrique. */
export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

// ─── Identifiants ────────────────────────────────────────────────────────────

/** Services principaux surveillés. */
export type ServiceId =
  | "database"
  | "auth"
  | "edge_functions"
  | "email"
  | "rate_limiting"
  | "monitoring";

/** Edge Functions surveillées. */
export type EdgeFunctionId =
  | "send-planning-email"
  | "send-patron-invite"
  | "delete-user"
  | "verify-patron-invite";

// ─── Score global ─────────────────────────────────────────────────────────────

/** Score de santé global du système (0-100). */
export interface HealthScore {
  value: number;
  status: HealthStatus;
  /** Label humain. Ex: "Système sain", "Quelques ralentissements" */
  label: string;
  /** Liste des problèmes détectés, en langage clair. */
  details: string[];
}

// ─── Services ─────────────────────────────────────────────────────────────────

/** État d'un service principale (base, auth, email…). */
export interface ServiceStatus {
  id: ServiceId;
  label: string;
  icon: string;
  status: HealthStatus;
  /** Message humain court. Ex: "Tout fonctionne normalement" */
  humanMessage: string;
  /** Temps de réponse mesuré (optionnel, affiché en mode avancé). */
  latencyMs?: number | null;
  lastChecked: Date;
}

// ─── Edge Functions ───────────────────────────────────────────────────────────

/** Santé d'une Edge Function Supabase. */
export interface EdgeFunctionHealth {
  id: EdgeFunctionId;
  label: string;
  /** Brève description de ce que fait la fonction. */
  description: string;
  status: HealthStatus;
  humanMessage: string;
  /** Nombre d'appels dans les dernières 24h. */
  calls24h: number;
  /** Dernier appel connu. */
  lastCalledAt: Date | null;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "invite_sent"
  | "bilan_generated"
  | "mission_created"
  | "mission_deleted"
  | "acompte_applied"
  | "patron_added"
  | "client_added"
  | "deletion"
  | "rate_limit"
  | "error"
  | "info";

/** Événement dans la timeline d'activité récente. */
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  /** Message lisible par un humain. */
  humanMessage: string;
  /** Détail technique (affiché uniquement en mode avancé). */
  technicalDetail?: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical";
}

// ─── Erreurs humaines ─────────────────────────────────────────────────────────

/** Erreur système traduite en langage clair. */
export interface HealthError {
  id: string;
  /** Message lisible. Ex: "Un doublon a été détecté dans les données." */
  humanMessage: string;
  /** Code technique (affiché uniquement en mode avancé). */
  technicalCode?: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  resolved: boolean;
  source: string;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export interface RateLimitStats {
  hitsLastHour: number;
  hitsLast24h: number;
  topAction: string | null;
  status: HealthStatus;
  humanMessage: string;
}

// ─── Données globales ─────────────────────────────────────────────────────────

/** Données complètes pour la page Santé système. */
export interface SystemHealthData {
  score: HealthScore;
  services: ServiceStatus[];
  edgeFunctions: EdgeFunctionHealth[];
  timeline: TimelineEvent[];
  errors: HealthError[];
  rateLimiting: RateLimitStats;
  dbLatencyMs: number | null;
  lastRefreshed: Date;
}

// ─── Mode d'affichage ────────────────────────────────────────────────────────

/** Basculer entre vue simple (humaine) et vue avancée (technique). */
export type HealthViewMode = "simple" | "advanced";

// ─── RPC response ────────────────────────────────────────────────────────────

/** Réponse brute de la fonction RPC get_health_stats(). */
export interface HealthStatsRpcResponse {
  audit_events_24h: number;
  audit_events_1h: number;
  rate_limit_hits_1h: number;
  rate_limit_hits_24h: number;
  top_rate_limit_action: string | null;
  send_email_calls_24h: number;
  send_invite_calls_24h: number;
  last_audit_event: string | null;
}

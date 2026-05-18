// src/pages/SystemHealthPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page "Cockpit système" — tableau de bord de santé pour administrateurs.
//
// SÉCURITÉ :
//   - Route protégée : redirige si isAdmin === false
//   - Toutes les données proviennent de fonctions SECURITY DEFINER côté Supabase
//   - Aucun détail technique affiché en mode simple
//
// UX :
//   - Mode simple (par défaut) : langage humain
//   - Mode avancé : détails techniques pour l'admin
//   - Rafraîchissement automatique toutes les 60 secondes
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { STATUS_TOKENS, RATE_LIMIT_ACTION_LABELS } from "../theme/healthTheme";
import { HealthCard } from "../components/health/HealthCard";
import { HealthSection } from "../components/health/HealthSection";
import { HealthStatusBadge } from "../components/health/HealthStatusBadge";
import { HealthScoreRing } from "../components/health/HealthScoreRing";
import { HealthMetric } from "../components/health/HealthMetric";
import { HealthTimeline } from "../components/health/HealthTimeline";
import { HealthFunctionCard } from "../components/health/HealthFunctionCard";
import { HealthErrorItem } from "../components/health/HealthErrorItem";
import type { HealthViewMode } from "../types/systemHealth";

// ─── Composant principal ──────────────────────────────────────────────────────

export function SystemHealthPage() {
  const { isAdmin } = useIsAdmin();
  const { data, loading, error, refresh } = useSystemHealth(isAdmin);
  const [viewMode, setViewMode] = useState<HealthViewMode>("simple");

  // ── Garde admin ───────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <span className="text-5xl block" aria-hidden="true">🔒</span>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            Accès restreint
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Cette page est réservée aux administrateurs de l'application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-6 pb-16">
      {/* ─── En-tête ──────────────────────────────────────────────────────── */}
      <PageHeader
        loading={loading}
        lastRefreshed={data?.lastRefreshed ?? null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={refresh}
      />

      {/* ─── Erreur de chargement ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="p-4 rounded-theme-lg bg-red-500/10 border border-red-500/25 text-sm text-red-400">
          {error}
          <button
            onClick={refresh}
            className="ml-3 underline hover:no-underline focus:outline-none"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ─── Score + Services ─────────────────────────────────────────────── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6"
        aria-labelledby="section-score"
      >
        {/* Score ring */}
        <ScoreBlock data={data} loading={loading} />

        {/* Grille services */}
        <HealthSection
          title="État des services"
          description="Vue globale des composants principaux de l'application."
        >
          <ServicesGrid data={data} loading={loading} />
        </HealthSection>
      </section>

      {/* ─── Edge Functions ───────────────────────────────────────────────── */}
      <HealthSection
        title="Services cloud"
        description="Fonctions automatiques de l'application (emails, invitations, etc.)."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading
            ? [...Array(4)].map((_, i) => (
                <HealthFunctionCard
                  key={i}
                  fn={{
                    id: "send-planning-email",
                    label: "",
                    description: "",
                    status: "unknown",
                    humanMessage: "",
                    calls24h: 0,
                    lastCalledAt: null,
                  }}
                  viewMode={viewMode}
                  loading
                />
              ))
            : data?.edgeFunctions.map((fn) => (
                <HealthFunctionCard
                  key={fn.id}
                  fn={fn}
                  viewMode={viewMode}
                />
              ))}
        </div>
      </HealthSection>

      {/* ─── Rate limiting ────────────────────────────────────────────────── */}
      {(data?.rateLimiting || loading) && (
        <HealthSection
          title="Protection anti-abus"
          description="Surveillance du nombre de requêtes pour détecter les abus."
        >
          <RateLimitBlock data={data} loading={loading} viewMode={viewMode} />
        </HealthSection>
      )}

      {/* ─── Erreurs ──────────────────────────────────────────────────────── */}
      {(data?.errors && data.errors.length > 0) || loading ? (
        <HealthSection
          title="Erreurs récentes"
          description="Problèmes détectés et traduits en langage clair."
        >
          {loading ? (
            <div className="h-20 rounded-theme-lg bg-white/5 animate-pulse" />
          ) : (
            <div className="space-y-2" role="list">
              {data!.errors.map((err) => (
                <HealthErrorItem key={err.id} error={err} viewMode={viewMode} />
              ))}
            </div>
          )}
        </HealthSection>
      ) : !loading ? (
        <HealthSection title="Erreurs récentes">
          <HealthCard className="flex items-center gap-3 py-3">
            <span className="text-emerald-400 text-xl" aria-hidden="true">✅</span>
            <p className="text-sm text-[var(--color-text-muted)]">
              Aucune erreur détectée récemment.
            </p>
          </HealthCard>
        </HealthSection>
      ) : null}

      {/* ─── Timeline ─────────────────────────────────────────────────────── */}
      <HealthSection
        title="Activité récente"
        description="Historique des 30 derniers événements enregistrés."
      >
        <HealthCard className="p-5">
          <HealthTimeline
            events={data?.timeline ?? []}
            viewMode={viewMode}
            loading={loading}
          />
        </HealthCard>
      </HealthSection>
    </div>
  );
}

// ─── Sous-composants locaux ───────────────────────────────────────────────────

interface PageHeaderProps {
  loading: boolean;
  lastRefreshed: Date | null;
  viewMode: HealthViewMode;
  onViewModeChange: (mode: HealthViewMode) => void;
  onRefresh: () => void;
}

function PageHeader({
  loading,
  lastRefreshed,
  viewMode,
  onViewModeChange,
  onRefresh,
}: PageHeaderProps) {
  const formatAge = useCallback((date: Date | null): string => {
    if (!date) return "—";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5) return "à l'instant";
    if (diff < 60) return `il y a ${diff} sec`;
    return `il y a ${Math.floor(diff / 60)} min`;
  }, []);

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
          <span aria-hidden="true">🛡️</span>
          Cockpit système
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {loading
            ? "Chargement des données…"
            : `Mis à jour ${formatAge(lastRefreshed)} — rafraîchissement automatique`}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Toggle simple / avancé */}
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />

        {/* Bouton actualiser */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-theme-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent-violet)]/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Actualiser les données"
        >
          <span
            className={`inline-block ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          >
            🔄
          </span>
          Actualiser
        </button>
      </div>
    </div>
  );
}

// ─── Toggle Simple / Avancé ───────────────────────────────────────────────────

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: HealthViewMode;
  onChange: (m: HealthViewMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-theme-md bg-[var(--color-surface)] border border-[var(--color-border)]"
      role="group"
      aria-label="Mode d'affichage"
    >
      {(["simple", "advanced"] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3 py-1 rounded-[10px] text-xs font-medium transition-all duration-200 ${
            viewMode === mode
              ? "bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-border-cyan)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
          aria-pressed={viewMode === mode}
        >
          {mode === "simple" ? "🟢 Vue simple" : "🔧 Avancé"}
        </button>
      ))}
    </div>
  );
}

// ─── Bloc score ───────────────────────────────────────────────────────────────

function ScoreBlock({
  data,
  loading,
}: {
  data: ReturnType<typeof useSystemHealth>["data"];
  loading: boolean;
}) {
  const placeholderScore = { value: 0, status: "unknown" as const, label: "Chargement…", details: [] };
  const score = data?.score ?? placeholderScore;
  const tokens = STATUS_TOKENS[score.status];

  return (
    <HealthCard className={`flex flex-col items-center justify-center p-6 gap-4 min-w-[200px] ${tokens.glow}`}>
      <HealthScoreRing score={score} loading={loading} />

      {/* Label et statut */}
      <div className="text-center space-y-1.5">
        <p className={`text-base font-semibold ${tokens.text}`}>{score.label}</p>
        {!loading && (
          <HealthStatusBadge status={score.status} />
        )}
        {loading && (
          <div className="h-5 w-24 rounded-full bg-white/5 animate-pulse mx-auto" />
        )}
      </div>

      {/* Détails */}
      {!loading && score.details.length > 0 && (
        <ul className="text-xs text-[var(--color-text-muted)] text-center space-y-0.5 border-t border-[var(--color-border)] pt-3 w-full">
          {score.details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      )}
    </HealthCard>
  );
}

// ─── Grille services ──────────────────────────────────────────────────────────

function ServicesGrid({
  data,
  loading,
}: {
  data: ReturnType<typeof useSystemHealth>["data"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-theme-lg bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="list">
      {(data?.services ?? []).map((svc) => {
        const tokens = STATUS_TOKENS[svc.status];
        return (
          <HealthCard
            key={svc.id}
            interactive
            className={`border ${tokens.border}`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-xl" aria-hidden="true">{svc.icon}</span>
              <HealthStatusBadge status={svc.status} compact />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)] leading-tight">
              {svc.label}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-snug">
              {svc.humanMessage}
            </p>
          </HealthCard>
        );
      })}
    </div>
  );
}

// ─── Bloc rate limiting ───────────────────────────────────────────────────────

function RateLimitBlock({
  data,
  loading,
  viewMode,
}: {
  data: ReturnType<typeof useSystemHealth>["data"];
  loading: boolean;
  viewMode: HealthViewMode;
}) {
  const rl = data?.rateLimiting;

  return (
    <HealthCard className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <HealthMetric
        label="Cette heure"
        value={loading ? "—" : rl?.hitsLastHour ?? 0}
        subLabel="requêtes"
        valueColor={
          (rl?.hitsLastHour ?? 0) > 20
            ? "text-amber-400"
            : "text-[var(--color-text)]"
        }
        loading={loading}
      />
      <HealthMetric
        label="Aujourd'hui"
        value={loading ? "—" : rl?.hitsLast24h ?? 0}
        subLabel="requêtes"
        loading={loading}
      />
      <HealthMetric
        label="Statut"
        value={loading ? "—" : rl?.status === "healthy" ? "Normal" : "Élevé"}
        valueColor={
          rl?.status === "warning" ? "text-amber-400" : "text-emerald-400"
        }
        loading={loading}
      />
      {viewMode === "advanced" && rl?.topAction && (
        <HealthMetric
          label="Action principale"
          value={RATE_LIMIT_ACTION_LABELS[rl.topAction] ?? rl.topAction}
          loading={loading}
        />
      )}
    </HealthCard>
  );
}

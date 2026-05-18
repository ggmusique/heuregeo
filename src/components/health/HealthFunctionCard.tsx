// src/components/health/HealthFunctionCard.tsx
// Carte d'état pour une Edge Function Supabase
import React from "react";
import { HealthCard } from "./HealthCard";
import { HealthStatusBadge } from "./HealthStatusBadge";
import type { EdgeFunctionHealth } from "../../types/systemHealth";
import type { HealthViewMode } from "../../types/systemHealth";

interface HealthFunctionCardProps {
  fn: EdgeFunctionHealth;
  viewMode: HealthViewMode;
  loading?: boolean;
}

function formatLastCall(date: Date | null): string {
  if (!date) return "Jamais appelée";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function HealthFunctionCard({
  fn,
  viewMode,
  loading = false,
}: HealthFunctionCardProps) {
  if (loading) {
    return (
      <HealthCard className="space-y-2">
        <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
        <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
        <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
      </HealthCard>
    );
  }

  return (
    <HealthCard interactive glowClass="hover:shadow-glow-cyan" className="space-y-2.5">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {fn.label}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">
            {fn.description}
          </p>
        </div>
        <HealthStatusBadge status={fn.status} compact />
      </div>

      {/* Séparateur */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Métriques */}
      <div className="space-y-1">
        <p className="text-xs text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text)] font-medium">{fn.calls24h}</span>
          {" "}appel{fn.calls24h !== 1 ? "s" : ""} aujourd'hui
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Dernier : <span className="text-[var(--color-text)]">{formatLastCall(fn.lastCalledAt)}</span>
        </p>
      </div>

      {/* Message humain */}
      <p className="text-xs text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-2">
        {fn.humanMessage}
      </p>

      {/* Mode avancé : identifiant technique */}
      {viewMode === "advanced" && (
        <p className="text-xs font-mono text-[var(--color-text-dim)] bg-black/20 px-2 py-0.5 rounded">
          {fn.id}
        </p>
      )}
    </HealthCard>
  );
}

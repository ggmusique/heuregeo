// src/components/health/HealthErrorItem.tsx
// Affiche une erreur système traduite en langage humain
import React from "react";
import type { HealthError } from "../../types/systemHealth";
import type { HealthViewMode } from "../../types/systemHealth";

const SEVERITY_CONFIG = {
  low: {
    icon: "ℹ️",
    label: "Information",
    textClass: "text-sky-400",
    bgClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
  },
  medium: {
    icon: "⚠️",
    label: "Avertissement",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  high: {
    icon: "🔴",
    label: "Erreur",
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
  },
  critical: {
    icon: "💥",
    label: "Critique",
    textClass: "text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20",
  },
} as const;

interface HealthErrorItemProps {
  error: HealthError;
  viewMode: HealthViewMode;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function HealthErrorItem({ error, viewMode }: HealthErrorItemProps) {
  const config = SEVERITY_CONFIG[error.severity];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-theme-md border ${config.bgClass} ${config.borderClass}`}
      role="listitem"
    >
      <span className="text-base mt-0.5 shrink-0" aria-hidden="true">
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${config.textClass}`}>
            {config.label}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {timeAgo(error.timestamp)}
          </span>
          {error.resolved && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              Résolu
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text)] mt-0.5">
          {error.humanMessage}
        </p>
        {viewMode === "advanced" && error.technicalCode && (
          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1 bg-black/20 px-2 py-0.5 rounded">
            {error.technicalCode}
          </p>
        )}
        <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
          Source : {error.source}
        </p>
      </div>
    </div>
  );
}

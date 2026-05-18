// src/components/health/HealthStatusBadge.tsx
// Badge couleur pour afficher l'état d'un service (opérationnel / ralentissement / incident)
import React from "react";
import { STATUS_TOKENS } from "../../theme/healthTheme";
import type { HealthStatus } from "../../types/systemHealth";

interface HealthStatusBadgeProps {
  status: HealthStatus;
  /** Afficher uniquement l'emoji sans texte (pour espaces réduits). */
  compact?: boolean;
  className?: string;
}

export function HealthStatusBadge({
  status,
  compact = false,
  className = "",
}: HealthStatusBadgeProps) {
  const tokens = STATUS_TOKENS[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${tokens.bg} ${className}`}
        aria-label={tokens.label}
        title={tokens.label}
      >
        <span
          className={`w-2 h-2 rounded-full inline-block ${
            status === "healthy"
              ? "bg-[var(--color-accent-green)]"
              : status === "warning"
              ? "bg-[var(--color-accent-amber)]"
              : status === "critical"
              ? "bg-[var(--color-error)] animate-pulse"
              : "bg-[var(--color-text-dim)]"
          }`}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${tokens.text} ${tokens.bg} border ${tokens.border} ${className}`}
      aria-label={tokens.label}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${
          status === "healthy"
            ? "bg-[var(--color-accent-green)]"
            : status === "warning"
            ? "bg-[var(--color-accent-amber)]"
            : status === "critical"
            ? "bg-[var(--color-error)] animate-pulse"
            : "bg-[var(--color-text-dim)]"
        }`}
      />
      {tokens.label}
    </span>
  );
}

// src/components/health/HealthMetric.tsx
// Affiche une métrique chiffrée avec label et sous-label optionnel
import React from "react";

interface HealthMetricProps {
  label: string;
  value: string | number;
  subLabel?: string;
  /** Classe de couleur Tailwind pour la valeur */
  valueColor?: string;
  icon?: string;
  /** Squelette de chargement */
  loading?: boolean;
}

export function HealthMetric({
  label,
  value,
  subLabel,
  valueColor = "text-[var(--color-text)]",
  icon,
  loading = false,
}: HealthMetricProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
        {subLabel && <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${valueColor}`}>
        {value}
      </p>
      {subLabel && (
        <p className="text-xs text-[var(--color-text-muted)]">{subLabel}</p>
      )}
    </div>
  );
}

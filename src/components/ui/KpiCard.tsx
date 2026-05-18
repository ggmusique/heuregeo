// src/components/ui/KpiCard.tsx
// Carte KPI glassmorphism tokenisée — valeur + label + optionnel trending.
import React from "react";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  trending?: "up" | "down" | "flat";
  className?: string;
}

const TREND_CLS = {
  up:   "text-[var(--color-success)]",
  down: "text-[var(--color-error)]",
  flat: "text-[var(--color-text-dim)]",
} as const;

export function KpiCard({ label, value, sub, icon, trending, className = "" }: KpiCardProps) {
  return (
    <div
      className={
        "relative bg-[var(--color-surface)] border border-[var(--color-border)] " +
        "rounded-[var(--radius-lg)] p-4 backdrop-blur-card overflow-hidden " +
        className
      }
    >
      {/* Fond subtil glow */}
      <div className="absolute inset-0 bg-[var(--color-primary)]/[0.03] pointer-events-none" />

      <div className="relative flex items-start gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--color-accent-violet)]/15 text-[var(--color-accent-violet)] flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            {label}
          </p>
          <p className={
            "text-2xl font-black text-[var(--color-text)] leading-none" +
            (trending ? " " + TREND_CLS[trending] : "")
          }>
            {value}
          </p>
          {sub && (
            <p className="text-xs text-[var(--color-text-dim)] mt-1">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// src/components/health/HealthTimeline.tsx
// Timeline verticale d'activité récente — événements en langage humain
import React from "react";
import type { TimelineEvent } from "../../types/systemHealth";
import type { HealthViewMode } from "../../types/systemHealth";

interface HealthTimelineProps {
  events: TimelineEvent[];
  viewMode: HealthViewMode;
  loading?: boolean;
}

const SEVERITY_DOT = {
  info: "bg-[var(--color-accent-cyan)]",
  warning: "bg-amber-400",
  critical: "bg-red-400 animate-pulse",
} as const;

const TYPE_ICON: Record<string, string> = {
  invite_sent: "✉️",
  bilan_generated: "📊",
  mission_created: "📝",
  mission_deleted: "🗑️",
  acompte_applied: "💰",
  patron_added: "👤",
  client_added: "🏢",
  deletion: "🗑️",
  rate_limit: "🛡️",
  error: "⚠️",
  info: "•",
};

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function TimelineSkeleton() {
  return (
    <div className="relative pl-6 space-y-5">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-[var(--color-border)]" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="relative flex items-start gap-3 animate-pulse">
          <div className="absolute -left-4 w-2 h-2 rounded-full bg-white/10 mt-1.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded bg-white/5" />
            <div className="h-3 w-1/3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HealthTimeline({ events, viewMode, loading = false }: HealthTimelineProps) {
  if (loading) return <TimelineSkeleton />;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
        <span className="text-2xl mb-2" aria-hidden="true">📭</span>
        <p className="text-sm">Aucune activité récente.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6" role="list" aria-label="Activité récente">
      {/* Ligne verticale */}
      <div
        className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-[var(--color-accent-cyan)]/30 via-[var(--color-border)] to-transparent"
        aria-hidden="true"
      />

      <div className="space-y-4">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="relative flex items-start gap-3 group"
            role="listitem"
          >
            {/* Point de timeline */}
            <div
              className={`absolute -left-4 mt-1.5 w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125 ${SEVERITY_DOT[event.severity]}`}
              aria-hidden="true"
            />

            <div className="flex-1 min-w-0">
              {/* Icône + message */}
              <div className="flex items-start gap-2">
                {index === 0 && (
                  <span className="text-xs" aria-hidden="true">
                    {TYPE_ICON[event.type] ?? "•"}
                  </span>
                )}
                <p className="text-sm text-[var(--color-text)] leading-snug">
                  {event.humanMessage}
                </p>
              </div>

              {/* Timestamp */}
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {formatTime(event.timestamp)}
              </p>

              {/* Détail technique (mode avancé uniquement) */}
              {viewMode === "advanced" && event.technicalDetail && (
                <p className="text-xs font-mono text-[var(--color-text-dim)] mt-1 bg-black/20 px-2 py-0.5 rounded inline-block">
                  {event.technicalDetail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

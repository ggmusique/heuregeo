import React from "react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GlowColor = "cyan" | "violet" | "green" | "amber";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  glowColor?: GlowColor;
  subtitle?: string;
}

// ─── Accent configs (couleurs sémantiques intentionnelles par carte) ──────────

const ACCENT_CONFIG: Record<
  GlowColor,
  { accent: string; accentBg: string; accentBorder: string }
> = {
  cyan: {
    accent: "text-[var(--color-accent-cyan)]",
    accentBg: "bg-[var(--color-accent-cyan)]/10",
    accentBorder: "border-[var(--color-accent-cyan)]/25",
  },
  violet: {
    accent: "text-[var(--color-accent-violet)]",
    accentBg: "bg-[var(--color-accent-violet)]/10",
    accentBorder: "border-[var(--color-accent-violet)]/25",
  },
  green: {
    accent: "text-[var(--color-accent-green)]",
    accentBg: "bg-[var(--color-accent-green)]/10",
    accentBorder: "border-[var(--color-accent-green)]/25",
  },
  amber: {
    accent: "text-[var(--color-accent-amber)]",
    accentBg: "bg-[var(--color-accent-amber)]/10",
    accentBorder: "border-[var(--color-accent-amber)]/25",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KPICard({
  title,
  value,
  icon: Icon,
  glowColor = "cyan",
  subtitle,
}: KPICardProps) {
  const cfg = ACCENT_CONFIG[glowColor];

  return (
    <div
      className={[
        "group relative flex flex-col gap-3 p-5 rounded-2xl",
        "bg-[var(--color-surface)] backdrop-blur-card",
        "border",
        cfg.accentBorder,
        "shadow-card",
        "duration-200 cursor-default",
        "hover:shadow-modal hover:-translate-y-0.5",
        "transition-[box-shadow,transform]",
      ].join(" ")}
    >
      {/* Icon badge + title */}
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.accentBg}`}>
          <Icon size={14} className={cfg.accent} aria-hidden="true" />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.accent} opacity-80`}>
          {title}
        </span>
      </div>

      {/* Main value */}
      <span className="text-2xl font-black text-[var(--color-text)] leading-none tracking-tight tabular-nums">
        {value}
      </span>

      {/* Optional subtitle */}
      {subtitle && (
        <span className="text-[10px] text-[var(--color-text-muted)] truncate font-medium">
          {subtitle}
        </span>
      )}

      {/* Subtle accent line bottom */}
      <div className={`absolute bottom-0 left-4 right-4 h-[1px] ${cfg.accentBg} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
    </div>
  );
}

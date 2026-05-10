import React from "react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GlowColor = "cyan" | "violet" | "green";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  glowColor?: GlowColor;
  subtitle?: string;
}

// ─── Glow configs ─────────────────────────────────────────────────────────────

const GLOW_CONFIG: Record<
  GlowColor,
  {
    border: string;
    shadow: string;
    shadowHover: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  cyan: {
    border: "border-cyan-400/30",
    shadow: "shadow-[0_0_15px_rgba(34,211,238,0.2)]",
    shadowHover: "hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]",
    iconColor: "text-cyan-400",
    titleColor: "text-cyan-300",
  },
  violet: {
    border: "border-violet-400/30",
    shadow: "shadow-[0_0_15px_rgba(167,139,250,0.2)]",
    shadowHover: "hover:shadow-[0_0_30px_rgba(167,139,250,0.45)]",
    iconColor: "text-violet-400",
    titleColor: "text-violet-300",
  },
  green: {
    border: "border-emerald-400/30",
    shadow: "shadow-[0_0_15px_rgba(52,211,153,0.2)]",
    shadowHover: "hover:shadow-[0_0_30px_rgba(52,211,153,0.45)]",
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-300",
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
  const cfg = GLOW_CONFIG[glowColor];

  return (
    <div
      className={[
        "relative flex flex-col gap-2 p-5 rounded-2xl",
        "bg-gray-800/60 backdrop-blur",
        "border",
        cfg.border,
        cfg.shadow,
        cfg.shadowHover,
        "transition-all duration-300 cursor-default",
        "hover:scale-105 hover:bg-gray-800/80",
      ].join(" ")}
    >
      {/* Icon + title */}
      <div className="flex items-center gap-2">
        <Icon size={18} className={cfg.iconColor} aria-hidden="true" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.titleColor}`}>
          {title}
        </span>
      </div>

      {/* Main value */}
      <span className="text-3xl font-bold text-white leading-none">{value}</span>

      {/* Optional subtitle */}
      {subtitle && (
        <span className="text-xs text-white/50 truncate">{subtitle}</span>
      )}
    </div>
  );
}

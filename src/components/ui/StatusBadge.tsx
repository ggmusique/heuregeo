// src/components/ui/StatusBadge.tsx
// Badge générique thémé — success / warning / danger / info / neutral
import React from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const VARIANT_CLS: Record<BadgeVariant, string> = {
  success: "bg-[var(--color-badge-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30",
  warning: "bg-[var(--color-badge-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  danger:  "bg-[var(--color-badge-danger-bg)]  text-[var(--color-error)]   border-[var(--color-error)]/30",
  info:    "bg-[var(--color-badge-info-bg)]    text-[var(--color-info)]    border-[var(--color-info)]/30",
  neutral: "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border-[var(--color-border)]",
};

const DOT_CLS: Record<BadgeVariant, string> = {
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  danger:  "bg-[var(--color-error)]",
  info:    "bg-[var(--color-info)]",
  neutral: "bg-[var(--color-text-dim)]",
};

export function StatusBadge({ variant = "neutral", children, dot = false, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider " +
        VARIANT_CLS[variant] +
        (className ? " " + className : "")
      }
    >
      {dot && <span className={"w-1.5 h-1.5 rounded-full flex-shrink-0 " + DOT_CLS[variant]} />}
      {children}
    </span>
  );
}

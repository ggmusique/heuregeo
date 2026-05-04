import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  color?: "primary" | "cyan" | "violet" | "green" | "neutral";
  padding?: "sm" | "md" | "lg";
  className?: string;
  glow?: boolean;
}

const borderVarMap: Record<string, string> = {
  primary: "var(--color-border-primary)",
  cyan:    "var(--color-border-cyan)",
  violet:  "var(--color-border-violet)",
  green:   "var(--color-border-green)",
  neutral: "var(--color-border-neutral)",
};

const glowVarMap: Record<string, string> = {
  primary: "var(--glow-primary)",
  cyan:    "var(--glow-cyan)",
  violet:  "var(--glow-violet)",
  green:   "var(--glow-green)",
  neutral: "none",
};

const paddingMap: Record<string, string> = {
  sm: "12px",
  md: "20px",
  lg: "32px",
};

export function GlassCard({
  children,
  color = "neutral",
  padding = "md",
  className,
  glow = false,
}: GlassCardProps) {
  const style: React.CSSProperties = {
    background: "var(--color-surface)",
    backdropFilter: "var(--blur-card)",
    WebkitBackdropFilter: "var(--blur-card)",
    border: `1px solid ${borderVarMap[color]}`,
    borderRadius: "var(--radius-lg)",
    padding: paddingMap[padding],
    boxShadow: glow ? glowVarMap[color] : "none",
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}

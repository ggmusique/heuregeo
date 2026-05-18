// src/components/health/HealthCard.tsx
// Carte glassmorphism générique pour la page Santé système
import React from "react";
import { GLASS_CARD } from "../../theme/healthTheme";

interface HealthCardProps {
  children: React.ReactNode;
  className?: string;
  /** Ajouter un effet hover interactif */
  interactive?: boolean;
  /** Glow coloré au survol */
  glowClass?: string;
  /** Rendre la carte cliquable */
  onClick?: () => void;
}

export function HealthCard({
  children,
  className = "",
  interactive = false,
  glowClass = "",
  onClick,
}: HealthCardProps) {
  const baseClass = `${GLASS_CARD} p-4 ${className}`;

  const interactiveClass = interactive
    ? "cursor-pointer hover:border-[rgba(255,255,255,0.12)] hover:bg-[var(--color-surface-hover)] hover:-translate-y-0.5 hover:scale-[1.005] " +
      glowClass
    : "";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`${baseClass} ${interactiveClass} outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-cyan)]/50`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

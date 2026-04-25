import React from "react";
import { tokens, mergeStyles } from "../../utils/designTokens";

/**
 * ==========================================================
 * <Card />
 * ==========================================================
 * Carte conteneur réutilisable avec le design glassmorphism
 * du dashboard HeureGeo.
 *
 * Usage :
 *   <Card>Contenu standard</Card>
 *   <Card elevated>Bilan, total, élément mis en avant</Card>
 *   <Card style={{ padding: "10px" }}>Padding custom</Card>
 *   <Card className="mon-extra-class">Avec classe CSS</Card>
 */

export function Card({
  children,
  elevated = false,
  compact = false,
  style = {},
  className = "",
  onClick,
  role,
  "aria-label": ariaLabel,
}) {
  const baseStyle = tokens.card.base;
  const elevatedStyle = elevated ? tokens.card.elevated : {};
  const compactStyle = compact ? tokens.card.compact : {};

  const mergedStyle = mergeStyles(baseStyle, elevatedStyle, compactStyle, style);

  return (
    <div
      className={className}
      style={mergedStyle}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

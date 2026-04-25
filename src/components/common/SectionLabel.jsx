import React from "react";
import { tokens } from "../../utils/designTokens";

/**
 * ==========================================================
 * <SectionLabel />
 * ==========================================================
 * Label de section standardisé : uppercase, petit, espacé,
 * couleur muted. Utilisé pour les titres de panneaux.
 *
 * Usage :
 *   <SectionLabel>Bilan</SectionLabel>
 *   <SectionLabel>Bilan <span accent>semaine 17</span></SectionLabel>
 *   <SectionLabel style={{ marginBottom: "20px" }}>Custom spacing</SectionLabel>
 */

export function SectionLabel({ children, style = {}, className = "" }) {
  const labelStyle = {
    ...tokens.text.label,
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    ...style,
  };

  return (
    <div className={className} style={labelStyle}>
      {children}
    </div>
  );
}

/**
 * ==========================================================
 * <AccentSpan />
 * ==========================================================
 * Petit span doré à utiliser À L'INTÉRIEUR d'un SectionLabel
 * pour mettre en valeur une valeur dynamique (numéro de
 * semaine, mois, etc.).
 *
 * Usage :
 *   <SectionLabel>
 *     Bilan <AccentSpan>semaine 17</AccentSpan>
 *   </SectionLabel>
 */

export function AccentSpan({ children, style = {} }) {
  return (
    <span
      style={{
        color: tokens.colors.gold.primary,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

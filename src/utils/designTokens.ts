/**
 * ==========================================================
 * DESIGN TOKENS — HeureGeo
 * ==========================================================
 * Système de design unifié pour l'application HeureGeo.
 * Source de vérité visuelle : le DashboardPanel.jsx (design premium sombre).
 *
 * Règle d'or : aucun composant ne doit définir ces valeurs en dur.
 * Tout passe par `tokens` ou les composants `Card` / `SectionLabel`.
 */

export const tokens = {
  // ─── Palette de couleurs ───────────────────────────────────────────────
  colors: {
    // Fonds
    bg: {
      /** Surface de base : verre dépoli sur fond sombre */
      surface: "rgba(10, 22, 40, 0.7)",
      /** Surface surélevée : légèrement plus claire, pour les éléments en relief */
      surfaceElevated: "rgba(15, 31, 61, 0.8)",
      /** Fond de page global */
      page: "#0A1628",
      /** Gradient de page */
      pageGradient: "linear-gradient(135deg, #0A1628 0%, #0D1F3C 100%)",
    },

    // Textes
    text: {
      /** Labels, sous-titres : blanc à 35% */
      muted: "rgba(255, 255, 255, 0.35)",
      /** Texte secondaire : blanc à 60% */
      secondary: "rgba(255, 255, 255, 0.6)",
      /** Texte principal : blanc pur */
      primary: "#FFFFFF",
      /** Texte tertiaire / désactivé */
      disabled: "rgba(255, 255, 255, 0.25)",
    },

    // Accents fonctionnels
    gold: {
      primary: "#D4AF37",
      glow: "rgba(212, 175, 55, 0.3)",
      light: "#F5D06A",
    },
    indigo: {
      primary: "#6366F1",
      glow: "rgba(99, 102, 241, 0.3)",
    },
    emerald: {
      primary: "#10B981",
      glow: "rgba(16, 185, 129, 0.3)",
    },
    amber: {
      primary: "#F59E0B",
      glow: "rgba(245, 158, 11, 0.3)",
    },
    cyan: {
      primary: "#06B6D4",
      glow: "rgba(6, 182, 212, 0.3)",
    },
    rose: {
      primary: "#F43F5E",
      glow: "rgba(244, 63, 94, 0.3)",
    },

    // Bordures
    border: {
      default: "rgba(255, 255, 255, 0.08)",
      hover: "rgba(255, 255, 255, 0.15)",
      accent: "rgba(212, 175, 55, 0.3)",
    },
  },

  // ─── Typographie ─────────────────────────────────────────────────────────
  font: {
    base: "'Syne', sans-serif",
    mono: "'DM Mono', monospace",
  },

  text: {
    /** Label de section : "CA MENSUEL", "BILAN", etc. */
    label: {
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.2em",
      color: "rgba(255, 255, 255, 0.35)",
      fontFamily: "'Syne', sans-serif",
    },
    /** Valeur monétaire ou numérique */
    value: {
      fontSize: "20px",
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      color: "#FFFFFF",
    },
    /** Petit texte d'information */
    caption: {
      fontSize: "11px",
      fontWeight: 400,
      color: "rgba(255, 255, 255, 0.45)",
      fontFamily: "'Syne', sans-serif",
    },
    /** Texte de badge / tag */
    badge: {
      fontSize: "9px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      fontFamily: "'Syne', sans-serif",
    },
  },

  // ─── Composants réutilisables ────────────────────────────────────────────
  card: {
    base: {
      background: "rgba(10, 22, 40, 0.7)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "20px",
      padding: "20px",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "#FFFFFF",
    },
    elevated: {
      background: "rgba(15, 31, 61, 0.8)",
      border: "1px solid rgba(212, 175, 55, 0.3)",
    },
    compact: {
      padding: "14px",
      borderRadius: "16px",
    },
  },

  badge: {
    base: {
      borderRadius: "10px",
      padding: "6px 14px",
      fontSize: "11px",
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
    },
    subtle: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      color: "rgba(255, 255, 255, 0.45)",
    },
  },

  input: {
    base: {
      background: "rgba(10, 22, 40, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "12px",
      padding: "8px 14px",
      color: "#FFFFFF",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      outline: "none",
    },
    focus: {
      borderColor: "rgba(212, 175, 55, 0.4)",
    },
  },

  select: {
    base: {
      background: "rgba(10, 22, 40, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "12px",
      padding: "8px 36px 8px 14px",
      color: "rgba(255, 255, 255, 0.7)",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      outline: "none",
      appearance: "none",
    },
    active: {
      color: "#D4AF37",
      borderColor: "rgba(212, 175, 55, 0.4)",
    },
  },

  button: {
    base: {
      borderRadius: "12px",
      padding: "10px 18px",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      border: "none",
      outline: "none",
      transition: "all 0.2s ease",
    },
    primary: {
      background: "linear-gradient(135deg, #D4AF37, #B8941F)",
      color: "#0A1628",
    },
    secondary: {
      background: "rgba(255, 255, 255, 0.08)",
      color: "#FFFFFF",
      border: "1px solid rgba(255, 255, 255, 0.12)",
    },
    ghost: {
      background: "transparent",
      color: "rgba(255, 255, 255, 0.6)",
    },
  },

  // ─── Espacement & Layout ───────────────────────────────────────────────
  spacing: {
    xs: "6px",
    sm: "10px",
    md: "14px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
  },

  grid: {
    gap: "14px",
    gapLarge: "16px",
  },

  // ─── Transitions & Animations ────────────────────────────────────────────
  transitions: {
    fast: "all 0.15s ease",
    default: "all 0.2s ease",
    slow: "all 0.3s ease",
  },

  // ─── Effets visuels ──────────────────────────────────────────────────────
  effects: {
    blur: "blur(12px)",
    glowGold: "0 0 20px rgba(212, 175, 55, 0.15)",
    glowIndigo: "0 0 20px rgba(99, 102, 241, 0.15)",
  },
};

/**
 * Helper : fusionne un style de base avec des overrides.
 * Usage interne dans les composants design system.
 */
export function mergeStyles(base: Record<string, any>, ...overrides: Array<Record<string, any> | null | undefined>): Record<string, any> {
  return overrides.reduce((acc: Record<string, any>, override) => {
    if (!override) return acc;
    return { ...acc, ...override };
  }, { ...base });
}

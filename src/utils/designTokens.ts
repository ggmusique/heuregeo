/**
 * ==========================================================
 * DESIGN TOKENS — HeureGeo (version CSS vars)
 * ==========================================================
 * Toutes les valeurs pointent vers des CSS custom properties.
 * Le thème est contrôlé par DarkModeContext via data-theme sur <html>.
 *
 * Compatible neon | oled | emerald | arctic (light).
 * Aucune couleur hardcodée — tout adapte automatiquement au thème actif.
 */

export const tokens = {
  // ─── Palette de couleurs ───────────────────────────────────────────────
  colors: {
    bg: {
      surface: "var(--color-surface)",
      surfaceElevated: "var(--color-surface-2)",
      page: "var(--color-bg)",
      pageGradient: "var(--color-bg)",
    },

    text: {
      muted: "var(--color-text-muted)",
      secondary: "var(--color-text-dim)",
      primary: "var(--color-text)",
      disabled: "var(--color-text-faint)",
    },

    gold: {
      primary: "var(--color-primary)",
      glow: "var(--color-border-primary)",
      light: "var(--color-primary)",
    },
    indigo: {
      primary: "var(--color-accent-violet)",
      glow: "var(--color-border-violet)",
    },
    emerald: {
      primary: "var(--color-accent-green)",
      glow: "var(--color-border-green)",
    },
    amber: {
      primary: "var(--color-accent-amber)",
      glow: "var(--color-accent-amber)",
    },
    cyan: {
      primary: "var(--color-accent-cyan)",
      glow: "var(--color-border-cyan)",
    },
    rose: {
      primary: "var(--color-accent-red)",
      glow: "var(--color-accent-red)",
    },

    border: {
      default: "var(--color-border)",
      hover: "var(--color-border-neutral)",
      accent: "var(--color-border-primary)",
    },
  },

  // ─── Typographie ─────────────────────────────────────────────────────────
  font: {
    base: "'Syne', sans-serif",
    mono: "'DM Mono', monospace",
  },

  text: {
    label: {
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.2em",
      color: "var(--color-text-muted)",
      fontFamily: "'Syne', sans-serif",
    },
    value: {
      fontSize: "20px",
      fontWeight: 600,
      fontFamily: "'DM Mono', monospace",
      color: "var(--color-text)",
    },
    caption: {
      fontSize: "11px",
      fontWeight: 400,
      color: "var(--color-text-dim)",
      fontFamily: "'Syne', sans-serif",
    },
    badge: {
      fontSize: "9px",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.15em",
      fontFamily: "'Syne', sans-serif",
    },
  },

  // ─── Composants réutilisables ────────────────────────────────────────────
  card: {
    base: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "20px",
      backdropFilter: "var(--blur-card)",
      WebkitBackdropFilter: "var(--blur-card)",
      color: "var(--color-text)",
    },
    elevated: {
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border-primary)",
    },
    compact: {
      padding: "14px",
      borderRadius: "var(--radius-md)",
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
      background: "var(--color-surface-offset)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-dim)",
    },
  },

  input: {
    base: {
      background: "var(--color-bg-input)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding: "8px 14px",
      color: "var(--color-text)",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      outline: "none",
    },
    focus: {
      borderColor: "var(--color-border-primary)",
    },
  },

  select: {
    base: {
      background: "var(--color-bg-input)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      padding: "8px 36px 8px 14px",
      color: "var(--color-text-muted)",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      outline: "none",
      appearance: "none" as const,
    },
    active: {
      color: "var(--color-primary)",
      borderColor: "var(--color-border-primary)",
    },
  },

  button: {
    base: {
      borderRadius: "var(--radius-md)",
      padding: "10px 18px",
      fontFamily: "'Syne', sans-serif",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      border: "none",
      outline: "none",
      transition: "var(--transition-normal)",
    },
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-bg)",
    },
    secondary: {
      background: "var(--color-surface-offset)",
      color: "var(--color-text)",
      border: "1px solid var(--color-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-muted)",
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
    fast: "var(--transition-fast)",
    default: "var(--transition-normal)",
    slow: "colors 0.35s ease",
  },

  // ─── Effets visuels ──────────────────────────────────────────────────────
  effects: {
    blur: "var(--blur-card)",
    glowGold: "var(--glow-primary)",
    glowIndigo: "var(--glow-violet)",
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

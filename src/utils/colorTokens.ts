// src/utils/colorTokens.ts
// Remplace colorMap + colorMapLight dans ParametresTab.
// Mappe chaque clé de couleur vers les tokens CSS vars du thème actif.
// Fonctionne pour tous les thèmes (neon, oled, emerald, arctic, light).

export interface ColorTokens {
  active: string;
  icon: string;
  dot: string;
  header: string;
  headerText: string;
  badge: string;
}

export interface ButtonTokens {
  primary: string;
  secondary: string;
  ghost: string;
  danger: string;
  success: string;
  outline: string;
}

export const colorTokens: Record<string, ColorTokens> = {
  indigo: {
    active:     "bg-[var(--color-accent-violet)]/15 border-[var(--color-accent-violet)]/40",
    icon:       "text-[var(--color-accent-violet)] bg-[var(--color-accent-violet)]/15",
    dot:        "bg-[var(--color-accent-violet)]",
    header:     "from-[var(--color-accent-violet)]/15 to-transparent border-[var(--color-accent-violet)]/20",
    headerText: "text-[var(--color-accent-violet)]",
    badge:      "bg-[var(--color-badge-info-bg)] text-[var(--color-accent-violet)] border-[var(--color-accent-violet)]/30",
  },
  violet: {
    active:     "bg-[var(--color-accent-violet)]/15 border-[var(--color-accent-violet)]/40",
    icon:       "text-[var(--color-accent-violet)] bg-[var(--color-accent-violet)]/15",
    dot:        "bg-[var(--color-accent-violet)]",
    header:     "from-[var(--color-accent-violet)]/15 to-transparent border-[var(--color-accent-violet)]/20",
    headerText: "text-[var(--color-accent-violet)]",
    badge:      "bg-[var(--color-badge-info-bg)] text-[var(--color-accent-violet)] border-[var(--color-accent-violet)]/30",
  },
  yellow: {
    active:     "bg-[var(--color-accent-amber)]/15 border-[var(--color-accent-amber)]/40",
    icon:       "text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/15",
    dot:        "bg-[var(--color-accent-amber)]",
    header:     "from-[var(--color-accent-amber)]/15 to-transparent border-[var(--color-accent-amber)]/20",
    headerText: "text-[var(--color-accent-amber)]",
    badge:      "bg-[var(--color-badge-warning-bg)] text-[var(--color-accent-amber)] border-[var(--color-accent-amber)]/30",
  },
  teal: {
    active:     "bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/40",
    icon:       "text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15",
    dot:        "bg-[var(--color-accent-cyan)]",
    header:     "from-[var(--color-accent-cyan)]/15 to-transparent border-[var(--color-accent-cyan)]/20",
    headerText: "text-[var(--color-accent-cyan)]",
    badge:      "bg-[var(--color-badge-info-bg)] text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30",
  },
  red: {
    active:     "bg-[var(--color-error)]/15 border-[var(--color-error)]/40",
    icon:       "text-[var(--color-error)] bg-[var(--color-error)]/15",
    dot:        "bg-[var(--color-error)]",
    header:     "from-[var(--color-error)]/15 to-transparent border-[var(--color-error)]/20",
    headerText: "text-[var(--color-error)]",
    badge:      "bg-[var(--color-badge-danger-bg)] text-[var(--color-error)] border-[var(--color-error)]/30",
  },
  cyan: {
    active:     "bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/40",
    icon:       "text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15",
    dot:        "bg-[var(--color-accent-cyan)]",
    header:     "from-[var(--color-accent-cyan)]/15 to-transparent border-[var(--color-accent-cyan)]/20",
    headerText: "text-[var(--color-accent-cyan)]",
    badge:      "bg-[var(--color-badge-info-bg)] text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30",
  },
  green: {
    active:     "bg-[var(--color-accent-green)]/15 border-[var(--color-accent-green)]/40",
    icon:       "text-[var(--color-accent-green)] bg-[var(--color-accent-green)]/15",
    dot:        "bg-[var(--color-accent-green)]",
    header:     "from-[var(--color-accent-green)]/15 to-transparent border-[var(--color-accent-green)]/20",
    headerText: "text-[var(--color-accent-green)]",
    badge:      "bg-[var(--color-badge-success-bg)] text-[var(--color-accent-green)] border-[var(--color-accent-green)]/30",
  },
};

export const buttonTokens: ButtonTokens = {
  primary:
    "bg-gradient-to-r from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)] text-white " +
    "hover:opacity-90 focus:ring-2 focus:ring-[var(--color-accent-violet)]/40 " +
    "shadow-lg shadow-[var(--color-accent-violet)]/20",
  secondary:
    "bg-[var(--color-surface-offset)] text-[var(--color-text)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-primary)] " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]",
  ghost:
    "bg-transparent text-[var(--color-text)] " +
    "hover:bg-[var(--color-surface-offset)] " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]",
  danger:
    "bg-gradient-to-r from-[var(--color-accent-red)] to-[var(--color-accent-orange)] text-white " +
    "hover:opacity-90 focus:ring-2 focus:ring-[var(--color-accent-red)]/40 " +
    "shadow-lg shadow-[var(--color-accent-red)]/20",
  success:
    "bg-gradient-to-r from-[var(--color-accent-green)] to-[color-mix(in_srgb,var(--color-accent-green)_60%,var(--color-accent-cyan))] text-white " +
    "hover:opacity-90 focus:ring-2 focus:ring-[var(--color-accent-green)]/40 " +
    "shadow-lg shadow-[var(--color-accent-green)]/20",
  outline:
    "bg-transparent border-2 border-[var(--color-border-primary)] text-[var(--color-text)] " +
    "hover:bg-[var(--color-border-primary)]/10 " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]",
};

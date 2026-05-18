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

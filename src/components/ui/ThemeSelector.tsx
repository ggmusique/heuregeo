// src/components/ui/ThemeSelector.tsx
import React from "react";
import { useDarkMode } from "../../contexts/DarkModeContext";
import type { AppTheme } from "../../contexts/DarkModeContext";

const THEMES: { value: AppTheme; label: string; icon: string; bg: string }[] = [
  { value: "neon",    label: "Glass Neon",   icon: "⚡", bg: "#020818" },
  { value: "oled",    label: "OLED Black",   icon: "🖤", bg: "#000000" },
  { value: "emerald", label: "Emerald Pro",  icon: "🌿", bg: "#020f0b" },
  { value: "arctic",  label: "Arctic Light", icon: "❄️", bg: "#e0f2fe" },
];

interface ThemeSelectorProps {
  /** Disposition : grille 2×2 ou liste horizontale */
  layout?: "grid" | "row";
}

export function ThemeSelector({ layout = "row" }: ThemeSelectorProps) {
  const { theme, setTheme } = useDarkMode();

  const wrapperCls = layout === "grid"
    ? "grid grid-cols-2 gap-2"
    : "flex flex-wrap gap-2";

  return (
    <div className={wrapperCls}>
      {THEMES.map((t) => {
        const active = theme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => setTheme(t.value)}
            aria-pressed={active}
            className={
              "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-bold transition-all " +
              (active
                ? "border-[var(--color-border-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] hover:border-[var(--color-border-neutral)] hover:text-[var(--color-text)]")
            }
          >
            {/* Pastille couleur du fond du thème */}
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
              style={{ background: t.bg }}
            />
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

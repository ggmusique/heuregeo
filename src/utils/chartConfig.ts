/**
 * chartConfig.ts — Configuration Chart.js thémable
 *
 * Toutes les couleurs sont lues depuis les CSS custom properties via
 * getComputedStyle(document.documentElement). Le résultat change
 * automatiquement avec le thème (neon / oled / emerald / arctic).
 *
 * IMPORTANT : appeler getChartConfig() à chaque rendu (pas une constante
 * globale) pour que les couleurs reflètent le thème courant.
 */

function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─── Couleurs d'accents des séries ──────────────────────────────────────────

export function getChartColors() {
  return {
    violet: {
      primary: cssVar("--color-accent-violet"),
      gradient: [
        cssVar("--color-accent-violet") + "cc", // ~80% opacité
        cssVar("--color-accent-violet") + "1a", // ~10% opacité
      ],
    },
    amber: {
      primary: cssVar("--color-accent-amber"),
      gradient: [
        cssVar("--color-accent-amber") + "cc",
        cssVar("--color-accent-amber") + "1a",
      ],
    },
    green: {
      primary: cssVar("--color-accent-green"),
      gradient: [
        cssVar("--color-accent-green") + "cc",
        cssVar("--color-accent-green") + "1a",
      ],
    },
    cyan: {
      primary: cssVar("--color-accent-cyan"),
      gradient: [
        cssVar("--color-accent-cyan") + "cc",
        cssVar("--color-accent-cyan") + "1a",
      ],
    },
    primary: {
      primary: cssVar("--color-primary"),
      gradient: [
        cssVar("--color-primary") + "cc",
        cssVar("--color-primary") + "1a",
      ],
    },
  };
}

/**
 * Rétro-compatibilité : chartColors avec les mêmes clés qu'avant,
 * maintenant thémées.
 */
export const chartColors = {
  get indigo() { return getChartColors().violet; },
  get amber()  { return getChartColors().amber; },
  get emerald() { return getChartColors().green; },
  get cyan()   { return getChartColors().cyan; },
};

// ─── Options globales thémées ────────────────────────────────────────────────

export function getChartOptions(overrides: Record<string, any> = {}) {
  const tooltipBg     = cssVar("--color-chart-tooltip-bg");
  const tooltipBorder = cssVar("--color-chart-tooltip-border");
  const tooltipTitle  = cssVar("--color-chart-tooltip-title");
  const axisText      = cssVar("--color-chart-axis-text");
  const gridColor     = cssVar("--color-chart-grid");
  const textMuted     = cssVar("--color-text-muted");

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeInOutQuart" },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: tooltipBg   || "rgba(2,8,24,0.95)",
        borderColor:     tooltipBorder || "rgba(201,168,76,0.3)",
        borderWidth: 1,
        titleColor: tooltipTitle || "#C9A84C",
        bodyColor:  textMuted    || "rgba(255,255,255,0.7)",
        padding: 12,
        callbacks: {
          label: (ctx: any) =>
            ` ${ctx.parsed.y.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: axisText || "rgba(255,255,255,0.3)",
          font: { size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: gridColor || "rgba(255,255,255,0.05)",
          drawBorder: false,
        },
        ticks: {
          color: axisText || "rgba(255,255,255,0.3)",
          font: { size: 11 },
          callback: (v: any) => v.toLocaleString("fr-FR") + " €",
        },
        border: { display: false },
      },
    },
    ...overrides,
  };
}

/**
 * Rétro-compatibilité : chartOptions statiques → désormais un getter thémé.
 * Les composants qui utilisaient `chartOptions` directement continueront
 * de fonctionner mais les couleurs seront maintenant dynamiques au rendu.
 */
export const chartOptions = new Proxy({} as ReturnType<typeof getChartOptions>, {
  get(_target, prop) {
    return getChartOptions()[prop as keyof ReturnType<typeof getChartOptions>];
  },
});


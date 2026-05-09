/**
 * Constantes et options de l'application
 * - Centralise les listes d'options (pause, tarif, horaires)
 * - Centralise les styles des modales (danger / warning / info)
 */

/**
 * ✅ Options de pause (en minutes)
 * 0 → 180 min par pas de 15 (13 valeurs)
 * Ex: [0, 15, 30, ..., 180]
 */
export const PAUSE_OPTIONS: number[] = Array.from({ length: 13 }, (_, i) => i * 15);

/**
 * ✅ Tarifs horaires prédéfinis (en € / h)
 * (Tu peux en rajouter ou les charger depuis settings plus tard)
 */
export const TARIF_OPTIONS: number[] = [10, 12.5, 15, 17.5, 20, 22.5, 25];

/**
 * ✅ Liste de toutes les heures possibles par pas de 15 min
 * Format "HH:MM"
 * Ex: "00:00", "00:15", ... "23:45"
 *
 * Note: IIFE pour générer une seule fois au chargement du module
 * (pas recalculé à chaque render)
 */
export const TIME_OPTIONS: string[] = (() => {
  const times: string[] = [];

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }

  return times;
})();

/**
 * ✅ Types de modales disponibles
 * (Optionnel mais utile pour éviter les strings "magic" partout)
 */
export const MODAL_TYPES = {
  DANGER: "danger",
  WARNING: "warning",
  INFO: "info",
};

/**
 * ✅ Styles associés à chaque type de modal
 * - gradient: classes Tailwind pour le fond du header
 * - border: classes Tailwind pour le contour
 * - buttonBg: classes Tailwind pour le bouton principal
 * - icon: emoji affiché dans le badge
 * - iconBg: fond du badge icône
 *
 * ⚠️ Tu utilises ces clés dans ConfirmModal via MODAL_STYLES[type]
 * Donc bien garder danger/warning/info comme clés (minuscule)
 */
export const MODAL_STYLES: Record<string, { gradient: string; border: string; buttonBg: string; icon: string; iconBg: string }> = {
  danger: {
    gradient: "from-[var(--color-accent-red)] to-[color-mix(in_srgb,var(--color-accent-red)_80%,black)]",
    border: "border-[var(--color-accent-red)]/50",
    buttonBg: "bg-[var(--color-accent-red)] hover:bg-[color-mix(in_srgb,var(--color-accent-red)_80%,black)]",
    icon: "⚠️",
    iconBg: "bg-[var(--color-accent-red)]/20",
  },
  warning: {
    gradient: "from-[var(--color-accent-amber)] to-[color-mix(in_srgb,var(--color-accent-amber)_80%,black)]",
    border: "border-[var(--color-accent-amber)]/50",
    buttonBg: "bg-[var(--color-accent-amber)] hover:bg-[color-mix(in_srgb,var(--color-accent-amber)_80%,black)]",
    icon: "⚡",
    iconBg: "bg-[var(--color-accent-amber)]/20",
  },
  info: {
    gradient: "from-[var(--color-accent-violet)] to-[color-mix(in_srgb,var(--color-accent-violet)_80%,black)]",
    border: "border-[var(--color-accent-violet)]/50",
    buttonBg: "bg-[var(--color-accent-violet)] hover:bg-[color-mix(in_srgb,var(--color-accent-violet)_80%,black)]",
    icon: "ℹ️",
    iconBg: "bg-[var(--color-accent-violet)]/20",
  },
};

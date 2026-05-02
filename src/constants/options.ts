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
    gradient: "from-red-600 to-red-800",
    border: "border-red-500/50",
    buttonBg: "bg-red-600 hover:bg-red-700",
    icon: "⚠️",
    iconBg: "bg-red-500/20",
  },
  warning: {
    gradient: "from-amber-600 to-amber-800",
    border: "border-amber-500/50",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
    icon: "⚡",
    iconBg: "bg-amber-500/20",
  },
  info: {
    gradient: "from-indigo-600 to-indigo-800",
    border: "border-indigo-500/50",
    buttonBg: "bg-indigo-600 hover:bg-indigo-700",
    icon: "ℹ️",
    iconBg: "bg-indigo-500/20",
  },
};

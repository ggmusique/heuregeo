/**
 * Constantes et options de l'application
 */

export const PAUSE_OPTIONS = Array.from({ length: 13 }, (_, i) => i * 15);

export const TARIF_OPTIONS = [10, 12.5, 15, 17.5, 20, 22.5, 25];

export const TIME_OPTIONS = (() => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  return times;
})();

export const MODAL_TYPES = {
  DANGER: "danger",
  WARNING: "warning",
  INFO: "info",
};

export const MODAL_STYLES = {
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

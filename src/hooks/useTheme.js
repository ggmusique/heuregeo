import { useState, useEffect } from "react";

/**
 * Définition des 3 thèmes disponibles.
 * Chaque thème définit :
 * - label      : nom affiché dans le sélecteur
 * - icon       : emoji affiché dans le bouton
 * - isDark     : true = fond sombre, false = fond clair
 * - dataTheme  : valeur posée sur <html data-theme="..."> pour les variables CSS
 * - bg         : classe Tailwind fond principal
 * - text       : classe Tailwind texte principal
 * - headerBg   : gradient du header
 * - navBg      : fond de la barre de nav
 * - navBorder  : bordure de la nav
 * - accent     : couleur d'accent principale (texte)
 * - accentBorder: bordure accent
 */
export const THEMES = {
  navy: {
    label: "Navy",
    icon: "🌙",
    isDark: true,
    dataTheme: "navy",
    bg: "bg-[#020818] text-white",
    headerBg: "bg-gradient-to-br from-[#020818] via-[#0A1628] to-[#020818]",
    navBg: "bg-[#030d22]/95",
    navBorder: "border-yellow-500/30",
    navInactiveText: "text-white/35",
    accent: "text-[#D4AF37]",
    accentBorder: "border-yellow-600/30",
    overlay: "bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-800/10",
  },
  purple: {
    label: "Violet",
    icon: "💜",
    isDark: true,
    dataTheme: "purple",
    bg: "bg-[#0D0520] text-white",
    headerBg: "bg-gradient-to-br from-[#0D0520] via-[#1A0A3A] to-[#0D0520]",
    navBg: "bg-[#1A0A3A]/95",
    navBorder: "border-purple-500/30",
    navInactiveText: "text-white/35",
    accent: "text-purple-300",
    accentBorder: "border-purple-600/30",
    overlay: "bg-gradient-to-tr from-purple-900/20 via-transparent to-violet-800/10",
  },
  emerald: {
    label: "Clair",
    icon: "☀️",
    isDark: false,
    dataTheme: "emerald",
    bg: "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900",
    headerBg: "bg-gradient-to-br from-white via-slate-50 to-indigo-50/60",
    navBg: "bg-white/95",
    navBorder: "border-slate-200/80",
    navInactiveText: "text-slate-400",
    accent: "text-[#D4AF37]",
    accentBorder: "border-amber-500/50",
    overlay: "",
  },
};

/**
 * useThemeProvider — à utiliser UNE SEULE FOIS dans App.jsx pour initialiser le thème.
 * Retourne les valeurs à passer dans <ThemeContext.Provider value={...}>.
 *
 * Les composants enfants utilisent useTheme() depuis ThemeContext.jsx.
 */
export function useThemeProvider() {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("app-theme");
    // Migration : si l'ancien darkMode=false était sauvegardé, on passe à emerald
    if (!saved) {
      const oldDarkMode = localStorage.getItem("darkMode");
      if (oldDarkMode === "false") return "emerald";
      return "navy";
    }
    return THEMES[saved] ? saved : "navy";
  });

  useEffect(() => {
    const config = THEMES[theme];
    document.documentElement.setAttribute("data-theme", config.dataTheme);
    localStorage.setItem("app-theme", theme);
    // Nettoyage de l'ancien localStorage darkMode
    localStorage.removeItem("darkMode");
  }, [theme]);

  const setTheme = (newTheme) => {
    if (THEMES[newTheme]) setThemeState(newTheme);
  };

  const cycleTheme = () => {
    const keys = Object.keys(THEMES);
    const idx = keys.indexOf(theme);
    setTheme(keys[(idx + 1) % keys.length]);
  };

  const config = THEMES[theme];

  return {
    theme,
    setTheme,
    cycleTheme,
    isDark: config.isDark,
    themeConfig: config,
  };
}

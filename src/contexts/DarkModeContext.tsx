import { createContext, useContext, useState, useEffect } from "react";
import type React from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Thèmes supportés. Ajouter de nouveaux thèmes ici ET créer leur fichier CSS. */
export type AppTheme = "neon" | "oled" | "emerald" | "arctic";

/** Thèmes considérés « dark » (darkMode = true pour l'compat backwards). */
const DARK_THEMES: AppTheme[] = ["neon", "oled", "emerald"];

export interface ThemeContextType {
  /** Thème actif (string). Source de vérité. */
  theme: AppTheme;
  /** Setter de thème. */
  setTheme: (v: AppTheme) => void;
  /**
   * Compatibilité backwards : true si le thème est sombre.
   * Utilisé par les composants legacy qui attendent un boolean.
   * @deprecated Utiliser `theme` directement pour les nouveaux composants.
   */
  darkMode: boolean;
  /** @deprecated Utiliser setTheme("arctic") / setTheme("neon") */
  setDarkMode: (v: boolean) => void;
}

// ─── Contexte ────────────────────────────────────────────────────────────────

export const DarkModeContext = createContext<ThemeContextType | undefined>(undefined);

/** Hook principal — utiliser dans n'importe quel composant. */
export function useDarkMode(): ThemeContextType {
  const ctx = useContext(DarkModeContext);
  if (ctx === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return ctx;
}

/**
 * Migration localStorage : lit "app-theme" ou l'ancien "darkMode" (boolean).
 * Garantit qu'aucune session utilisateur existante n'est perdue.
 */
function readInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "neon";

  const saved = window.localStorage.getItem("app-theme") as AppTheme | null;
  if (saved && ["neon", "oled", "emerald", "arctic"].includes(saved)) {
    return saved;
  }

  // Migration depuis l'ancienne clé "darkMode"
  const legacyDark = window.localStorage.getItem("darkMode");
  if (legacyDark === "false") return "arctic";

  return "neon";
}

/** Provider principal — à placer une seule fois à la racine de l'app. */
export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(readInitialTheme);

  const setTheme = (v: AppTheme) => {
    setThemeState(v);
  };

  // Compatibilité backwards
  const setDarkMode = (v: boolean) => {
    setThemeState(v ? "neon" : "arctic");
  };

  const darkMode = DARK_THEMES.includes(theme);

  useEffect(() => {
    window.localStorage.setItem("app-theme", theme);
    // Nettoyer l'ancienne clé pour éviter confusion future
    window.localStorage.removeItem("darkMode");
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <DarkModeContext.Provider value={{ theme, setTheme, darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

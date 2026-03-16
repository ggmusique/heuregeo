import { createContext, useContext } from "react";

/**
 * ThemeContext — fournit { theme, setTheme, isDark, themeConfig } à toute l'app.
 * Remplace la prop darkMode passée en cascade dans chaque composant.
 *
 * Utilisation dans un composant :
 *   import { useTheme } from "../contexts/ThemeContext";
 *   const { isDark, theme } = useTheme();
 */
export const ThemeContext = createContext({
  theme: "navy",
  setTheme: () => {},
  isDark: true,
  themeConfig: {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

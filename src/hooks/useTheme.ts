import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppTheme = "navy" | "purple" | "emerald";

export interface UseThemeReturn {
  theme: AppTheme;
  toggleTheme: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem("app-theme") || "navy") as AppTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((current) => {
      const themes: AppTheme[] = ["navy", "purple", "emerald"];
      const currentIndex = themes.indexOf(current);
      const nextIndex = (currentIndex + 1) % themes.length;
      return themes[nextIndex];
    });
  };

  return { theme, toggleTheme };
}

import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppTheme = "neon" | "light";

export interface UseThemeReturn {
  theme: AppTheme;
  toggleTheme: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem("app-theme") || "neon") as AppTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((current) => (current === "neon" ? "light" : "neon"));
  };

  return { theme, toggleTheme };
}

import { createContext, useContext, useState, useEffect } from "react";
import type React from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DarkModeContextType {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

// ─── Contexte ────────────────────────────────────────────────────────────────

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function useDarkMode(): DarkModeContextType {
  const ctx = useContext(DarkModeContext);
  if (ctx === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return ctx;
}

/** Provider autonome — gère l'état darkMode + persistance localStorage. */
export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("darkMode");
    return saved === null ? true : saved !== "false";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("darkMode", darkMode ? "true" : "false");
      document.documentElement.setAttribute("data-theme", darkMode ? "neon" : "light");
    }
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

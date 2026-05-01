import { createContext, useContext, useState, useEffect } from "react";

export const DarkModeContext = createContext({ darkMode: true, setDarkMode: () => {} });

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function useDarkMode() {
  return useContext(DarkModeContext);
}

/** Provider autonome — gère l'état darkMode + persistance localStorage. */
export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("darkMode");
    return saved === null ? true : saved !== "false";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("darkMode", darkMode ? "true" : "false");
    }
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

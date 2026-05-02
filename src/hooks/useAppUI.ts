import { useState, useEffect, useCallback } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import type { AlertState } from "../types/ui";

// ─── Retour ──────────────────────────────────────────────────────────────────

export interface UseAppUIReturn {
  darkMode: boolean;
  liveTime: string;
  isIOS: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  triggerAlert: (message: string, type?: string) => void;
  customAlert: AlertState;
  dismissAlert: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAppUI(): UseAppUIReturn {
  const { darkMode } = useDarkMode();

  const [loading, setLoading] = useState<boolean>(false);
  const [customAlert, setCustomAlert] = useState<AlertState>({ show: false, message: "" });
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [liveTime, setLiveTime] = useState<string>("");

  const triggerAlert = useCallback((msg: string, _type?: string): void => {
    setCustomAlert({ show: true, message: msg });
  }, []);

  const dismissAlert = useCallback((): void => {
    setCustomAlert((prev) => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { darkMode, liveTime, isIOS, loading, setLoading, triggerAlert, customAlert, dismissAlert };
}

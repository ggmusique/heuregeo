import { useState, useEffect, useCallback } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";

export function useAppUI() {
  const { darkMode } = useDarkMode();

  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, message: "" });
  const [isIOS, setIsIOS] = useState(false);
  const [liveTime, setLiveTime] = useState("");

  const triggerAlert = useCallback((msg) => {
    setCustomAlert({ show: true, message: msg });
  }, []);

  const dismissAlert = useCallback(() => {
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

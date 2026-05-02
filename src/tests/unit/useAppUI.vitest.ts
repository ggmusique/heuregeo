import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppUI } from "../../hooks/useAppUI";

// Mock DarkModeContext — useAppUI consomme useDarkMode() via ce contexte
vi.mock("../../contexts/DarkModeContext", () => ({
  useDarkMode: () => ({ darkMode: false }),
}));

// ─── 1. isIOS ──────────────────────────────────────────────────────────────

describe("useAppUI – isIOS", () => {
  const defineUA = (value) =>
    Object.defineProperty(navigator, "userAgent", {
      value,
      configurable: true,
      writable: true,
    });

  afterEach(() => {
    // Restore à un userAgent neutre pour ne pas polluer les autres suites
    defineUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
  });

  it("est true quand userAgent contient 'iPhone'", () => {
    defineUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    const { result } = renderHook(() => useAppUI());
    expect(result.current.isIOS).toBe(true);
  });

  it("est true quand userAgent contient 'iPad'", () => {
    defineUA(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    const { result } = renderHook(() => useAppUI());
    expect(result.current.isIOS).toBe(true);
  });

  it("est false pour un userAgent desktop Windows", () => {
    defineUA(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );
    const { result } = renderHook(() => useAppUI());
    expect(result.current.isIOS).toBe(false);
  });

  it("est false pour un userAgent Android", () => {
    defineUA(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36"
    );
    const { result } = renderHook(() => useAppUI());
    expect(result.current.isIOS).toBe(false);
  });
});

// ─── 2. liveTime ───────────────────────────────────────────────────────────

describe("useAppUI – liveTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("vaut une chaîne au format HH:MM après le premier tick", () => {
    vi.setSystemTime(new Date("2026-05-02T10:30:00"));
    const { result } = renderHook(() => useAppUI());

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.liveTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("affiche 10:30 à 10h30 (fr-FR HH:MM)", () => {
    vi.setSystemTime(new Date("2026-05-02T10:30:00"));
    const { result } = renderHook(() => useAppUI());

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.liveTime).toBe("10:30");
  });

  it("change après 60 secondes (minute suivante)", () => {
    // Démarrer à :30 dans la minute — avancer 31s traverse naturellement 10:31
    vi.setSystemTime(new Date("2026-05-02T10:30:30"));
    const { result } = renderHook(() => useAppUI());

    // Premier tick → 10:30
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.liveTime).toBe("10:30");

    // +31 s : le fake clock avance jusqu'à 10:31:01 → liveTime = "10:31"
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(result.current.liveTime).toBe("10:31");
  });
});

// ─── 3. loading / setLoading ───────────────────────────────────────────────

describe("useAppUI – loading / setLoading", () => {
  it("loading vaut false à l'initialisation", () => {
    const { result } = renderHook(() => useAppUI());
    expect(result.current.loading).toBe(false);
  });

  it("setLoading(true) passe loading à true", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);
  });

  it("setLoading(false) repasse loading à false", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.setLoading(true);
    });
    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.loading).toBe(false);
  });
});

// ─── 4. triggerAlert ───────────────────────────────────────────────────────

describe("useAppUI – triggerAlert", () => {
  it("customAlert.show vaut false à l'initialisation", () => {
    const { result } = renderHook(() => useAppUI());
    expect(result.current.customAlert.show).toBe(false);
  });

  it("customAlert.message est vide à l'initialisation", () => {
    const { result } = renderHook(() => useAppUI());
    expect(result.current.customAlert.message).toBe("");
  });

  it("triggerAlert('Erreur') passe show à true avec le bon message", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.triggerAlert("Erreur réseau");
    });

    expect(result.current.customAlert).toEqual({
      show: true,
      message: "Erreur réseau",
    });
  });

  it("remplace le message à chaque appel", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.triggerAlert("Premier");
    });
    act(() => {
      result.current.triggerAlert("Deuxième");
    });

    expect(result.current.customAlert.message).toBe("Deuxième");
    expect(result.current.customAlert.show).toBe(true);
  });
});

// ─── 5. dismissAlert ───────────────────────────────────────────────────────

describe("useAppUI – dismissAlert", () => {
  it("dismissAlert remet show à false (message conservé)", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.triggerAlert("À fermer");
    });
    expect(result.current.customAlert.show).toBe(true);

    act(() => {
      result.current.dismissAlert();
    });

    expect(result.current.customAlert.show).toBe(false);
    // Le message est conservé (comportement réel du hook)
    expect(result.current.customAlert.message).toBe("À fermer");
  });

  it("dismissAlert est sans effet si show est déjà false", () => {
    const { result } = renderHook(() => useAppUI());

    act(() => {
      result.current.dismissAlert();
    });

    expect(result.current.customAlert.show).toBe(false);
    expect(result.current.customAlert.message).toBe("");
  });
});

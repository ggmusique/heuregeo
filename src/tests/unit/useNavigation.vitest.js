import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigation } from "../../hooks/useNavigation";

// ─── helpers ───────────────────────────────────────────────────────────────

function makeProfile(overrides = {}) {
  return {
    role: "user",
    features: {
      plan: "free",
      agenda: false,
      dashboard: false,
      ...overrides.features,
    },
    ...overrides,
  };
}

// ─── 1. isViewer → activeTab forcé sur "suivi" ─────────────────────────────

describe("useNavigation – isViewer", () => {
  it("force activeTab sur 'suivi' quand role=viewer", () => {
    const profile = makeProfile({ role: "viewer" });
    const { result } = renderHook(() => useNavigation(profile));
    expect(result.current.activeTab).toBe("suivi");
    expect(result.current.isViewer).toBe(true);
  });

  it("ne force pas 'suivi' quand role != viewer", () => {
    const profile = makeProfile({ role: "user" });
    const { result } = renderHook(() => useNavigation(profile));
    expect(result.current.activeTab).toBe("saisie");
    expect(result.current.isViewer).toBe(false);
  });
});

// ─── 2. canAgenda=false → activeTab forcé sur "saisie" si était "agenda" ───

describe("useNavigation – canAgenda guard", () => {
  it("repousse vers 'saisie' quand on navigue sur 'agenda' sans la feature", () => {
    const profile = makeProfile({ features: { agenda: false } });
    const { result } = renderHook(() => useNavigation(profile));

    act(() => result.current.setActiveTab("agenda"));

    expect(result.current.activeTab).toBe("saisie");
    expect(result.current.canAgenda).toBe(false);
  });

  it("autorise 'agenda' quand la feature est activée", () => {
    const profile = makeProfile({ features: { agenda: true } });
    const { result } = renderHook(() => useNavigation(profile));

    act(() => result.current.setActiveTab("agenda"));

    expect(result.current.activeTab).toBe("agenda");
    expect(result.current.canAgenda).toBe(true);
  });
});

// ─── 3. canDashboard=false → activeTab forcé sur "suivi" si était "dashboard"

describe("useNavigation – canDashboard guard", () => {
  it("repousse vers 'suivi' quand on navigue sur 'dashboard' sans la feature", () => {
    const profile = makeProfile({ features: { dashboard: false } });
    const { result } = renderHook(() => useNavigation(profile));

    act(() => result.current.setActiveTab("dashboard"));

    expect(result.current.activeTab).toBe("suivi");
    expect(result.current.canDashboard).toBe(false);
  });

  it("autorise 'dashboard' quand la feature est activée", () => {
    const profile = makeProfile({ features: { dashboard: true } });
    const { result } = renderHook(() => useNavigation(profile));

    act(() => result.current.setActiveTab("dashboard"));

    expect(result.current.activeTab).toBe("dashboard");
    expect(result.current.canDashboard).toBe(true);
  });
});

// ─── 4. proNavItems filtré selon les features ──────────────────────────────

describe("useNavigation – proNavItems", () => {
  it("contient toujours saisie, suivi, parametres", () => {
    const profile = makeProfile();
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).toContain("saisie");
    expect(keys).toContain("suivi");
    expect(keys).toContain("parametres");
  });

  it("n'inclut pas 'dashboard' sans la feature", () => {
    const profile = makeProfile({ features: { dashboard: false } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).not.toContain("dashboard");
  });

  it("inclut 'dashboard' avec la feature (non-viewer)", () => {
    const profile = makeProfile({ features: { dashboard: true } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).toContain("dashboard");
  });

  it("n'inclut pas 'dashboard' pour un viewer même avec la feature", () => {
    const profile = makeProfile({ role: "viewer", features: { dashboard: true } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).not.toContain("dashboard");
  });

  it("n'inclut pas 'agenda' sans la feature", () => {
    const profile = makeProfile({ features: { agenda: false } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).not.toContain("agenda");
  });

  it("inclut 'agenda' avec la feature", () => {
    const profile = makeProfile({ features: { agenda: true } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).toContain("agenda");
  });

  it("respecte l'ordre saisie → dashboard? → suivi → agenda? → parametres", () => {
    const profile = makeProfile({ features: { dashboard: true, agenda: true } });
    const { result } = renderHook(() => useNavigation(profile));
    const keys = result.current.proNavItems.map((i) => i.key);
    expect(keys).toEqual(["saisie", "dashboard", "suivi", "agenda", "parametres"]);
  });
});

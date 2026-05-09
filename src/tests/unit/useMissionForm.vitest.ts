import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useMissionForm } from "../../hooks/useMissionForm";
import type { Mission, Lieu } from "../../types/entities";

// ─── Pas de vi.mock() — toutes les dépendances sont injectées comme paramètres.
// window.scrollTo est appelé par handleMissionEdit : on le neutralise.
vi.stubGlobal("scrollTo", vi.fn());

// Références stables — créées UNE SEULE FOIS au module pour ne pas provoquer de
// boucles dans les useCallback/useEffect qui dépendent des refs.
const createMission = vi.fn();
const updateMission = vi.fn();
const deleteMission = vi.fn();
const setLoading = vi.fn();
const triggerAlert = vi.fn();
const showConfirm = vi.fn();
const setActiveTab = vi.fn();

beforeEach(() => vi.clearAllMocks());

// ─── Factories ────────────────────────────────────────────────────────────────

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    user_id: "uid",
    patron_id: "patron-1",
    client_id: "client-1",
    lieu_id: "lieu-1",
    client: "Client A",
    lieu: "Bureau",
    date_mission: "2026-01-05",
    date_iso: "2026-01-05",
    debut: "09:00",
    fin: "11:00",
    duree: 2,
    pause: 0,
    montant: 80,
    ...overrides,
  } as unknown as Mission;
}

// makeParams() UNE SEULE FOIS hors renderHook — les vi.fn() sont des refs stables.
function makeParams(overrides: {
  missions?: Mission[];
} = {}) {
  return {
    createMission,
    updateMission,
    deleteMission,
    missions: overrides.missions ?? [],
    setLoading,
    triggerAlert,
    showConfirm,
    setActiveTab,
  };
}

// ─── 1. État initial ───────────────────────────────────────────────────────────

describe("useMissionForm — état initial", () => {
  it("editingMissionId est null", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));
    expect(result.current.editingMissionId).toBeNull();
  });

  it("editingMissionData est null", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));
    expect(result.current.editingMissionData).toBeNull();
  });

  it("selectedClientId / selectedLieuId / selectedPatronId sont null", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));
    expect(result.current.selectedClientId).toBeNull();
    expect(result.current.selectedLieuId).toBeNull();
    expect(result.current.selectedPatronId).toBeNull();
  });
});

// ─── 2. handleMissionSubmit — validation ──────────────────────────────────────

describe("handleMissionSubmit — validation", () => {
  it("triggerAlert et retour anticipé si debut manquant", async () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => {
      await result.current.handleMissionSubmit({ fin: "11:00" });
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("debut"));
    expect(createMission).not.toHaveBeenCalled();
  });

  it("triggerAlert et retour anticipé si fin manquant", async () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "09:00" });
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("fin"));
    expect(createMission).not.toHaveBeenCalled();
  });
});

// ─── 3. handleMissionSubmit — création ────────────────────────────────────────

describe("handleMissionSubmit — création (editingMissionId=null)", () => {
  it("appelle createMission et triggerAlert 'Mission enregistree'", async () => {
    createMission.mockResolvedValue(makeMission());
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "09:00", fin: "11:00" });
    });

    expect(createMission).toHaveBeenCalledTimes(1);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("enregistree"));
  });

  it("remet le formulaire à zéro après création", async () => {
    createMission.mockResolvedValue(makeMission());
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    // Pré-remplir editingMissionData pour vérifier le reset
    act(() => {
      result.current.setEditingMissionData({ debut: "08:00", fin: "10:00" });
    });

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "08:00", fin: "10:00" });
    });

    expect(result.current.editingMissionData).toBeNull();
    expect(result.current.editingMissionId).toBeNull();
  });

  it("setLoading(true) puis setLoading(false) (finally)", async () => {
    createMission.mockResolvedValue(makeMission());
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "09:00", fin: "11:00" });
    });

    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });

  it("erreur API → triggerAlert contient 'Erreur'", async () => {
    createMission.mockRejectedValue(new Error("DB crash"));
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "09:00", fin: "11:00" });
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });
});

// ─── 4. handleMissionSubmit — mise à jour ─────────────────────────────────────

describe("handleMissionSubmit — mise à jour (editingMissionId défini)", () => {
  it("appelle updateMission avec l'id en cours et triggerAlert 'mise a jour'", async () => {
    updateMission.mockResolvedValue(makeMission());
    const params = makeParams({ missions: [makeMission()] });
    const { result } = renderHook(() => useMissionForm(params));

    // Passer en mode édition
    act(() => { result.current.handleMissionEdit(makeMission()); });

    await act(async () => {
      await result.current.handleMissionSubmit({ debut: "09:00", fin: "11:00" });
    });

    expect(updateMission).toHaveBeenCalledWith("m1", { debut: "09:00", fin: "11:00" });
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("mise a jour"));
  });
});

// ─── 5. handleMissionEdit ─────────────────────────────────────────────────────

describe("handleMissionEdit", () => {
  it("positionne editingMissionId, editingMissionData et les selects", () => {
    const mission = makeMission({ id: "m42", client_id: "c9", lieu_id: "l3", patron_id: "p7" });
    const params = makeParams({ missions: [mission] });
    const { result } = renderHook(() => useMissionForm(params));

    act(() => { result.current.handleMissionEdit(mission); });

    expect(result.current.editingMissionId).toBe("m42");
    expect(result.current.editingMissionData).toMatchObject({ id: "m42" });
    expect(result.current.selectedClientId).toBe("c9");
    expect(result.current.selectedLieuId).toBe("l3");
    expect(result.current.selectedPatronId).toBe("p7");
  });

  it("appelle setActiveTab('saisie')", () => {
    const mission = makeMission();
    const params = makeParams({ missions: [mission] });
    const { result } = renderHook(() => useMissionForm(params));

    act(() => { result.current.handleMissionEdit(mission); });

    expect(setActiveTab).toHaveBeenCalledWith("saisie");
  });
});

// ─── 6. handleMissionDelete ───────────────────────────────────────────────────

describe("handleMissionDelete", () => {
  it("ne fait rien si la mission est introuvable dans missions[]", async () => {
    const params = makeParams({ missions: [] });
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => { await result.current.handleMissionDelete("unknown"); });

    expect(showConfirm).not.toHaveBeenCalled();
    expect(deleteMission).not.toHaveBeenCalled();
  });

  it("ne supprime pas si showConfirm retourne false", async () => {
    showConfirm.mockResolvedValue(false);
    const params = makeParams({ missions: [makeMission()] });
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => { await result.current.handleMissionDelete("m1"); });

    expect(deleteMission).not.toHaveBeenCalled();
  });

  it("supprime et triggerAlert 'supprimee' si confirmé", async () => {
    showConfirm.mockResolvedValue(true);
    deleteMission.mockResolvedValue(undefined);
    const params = makeParams({ missions: [makeMission()] });
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => { await result.current.handleMissionDelete("m1"); });

    expect(deleteMission).toHaveBeenCalledWith("m1");
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("supprimee"));
  });

  it("erreur suppression → triggerAlert 'Erreur suppression'", async () => {
    showConfirm.mockResolvedValue(true);
    deleteMission.mockRejectedValue(new Error("fail"));
    const params = makeParams({ missions: [makeMission()] });
    const { result } = renderHook(() => useMissionForm(params));

    await act(async () => { await result.current.handleMissionDelete("m1"); });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur suppression"));
  });
});

// ─── 7. resetMissionForm ──────────────────────────────────────────────────────

describe("resetMissionForm", () => {
  it("remet tous les champs à null", () => {
    const mission = makeMission();
    const params = makeParams({ missions: [mission] });
    const { result } = renderHook(() => useMissionForm(params));

    act(() => { result.current.handleMissionEdit(mission); });
    act(() => { result.current.resetMissionForm(); });

    expect(result.current.editingMissionId).toBeNull();
    expect(result.current.editingMissionData).toBeNull();
    expect(result.current.selectedClientId).toBeNull();
    expect(result.current.selectedLieuId).toBeNull();
    expect(result.current.selectedPatronId).toBeNull();
  });
});

// ─── 8. copierDerniereMission ─────────────────────────────────────────────────

describe("copierDerniereMission", () => {
  it("triggerAlert 'Aucune mission' si missions est vide", () => {
    const params = makeParams({ missions: [] });
    const { result } = renderHook(() => useMissionForm(params));

    act(() => { result.current.copierDerniereMission(); });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucune mission"));
  });

  it("copie les champs de la mission la plus récente (par date_iso)", () => {
    const old = makeMission({ id: "old", date_iso: "2026-01-01", lieu_id: "l-old", debut: "08:00", fin: "10:00" });
    const recent = makeMission({ id: "recent", date_iso: "2026-01-15", lieu_id: "l-rec", debut: "14:00", fin: "18:00" });
    const params = makeParams({ missions: [old, recent] });
    const { result } = renderHook(() => useMissionForm(params));

    act(() => { result.current.copierDerniereMission(); });

    expect(result.current.editingMissionData).toMatchObject({
      lieu_id: "l-rec",
      debut: "14:00",
      fin: "18:00",
    });
    expect(result.current.selectedLieuId).toBe("l-rec");
  });
});

// ─── 9. onLieuCreated ─────────────────────────────────────────────────────────

describe("onLieuCreated", () => {
  it("sélectionne le nouveau lieu et met à jour editingMissionData", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    const lieu: Lieu = {
      id: "lieu-new",
      user_id: "uid",
      nom: "Nouveau bureau",
      adresse_complete: null,
      latitude: null,
      longitude: null,
      notes: null,
      type: null,
    };

    act(() => { result.current.onLieuCreated(lieu); });

    expect(result.current.selectedLieuId).toBe("lieu-new");
    expect(result.current.editingMissionData).toMatchObject({
      lieu_id: "lieu-new",
      lieu: "Nouveau bureau",
    });
  });
});

// ─── 10. useEffect — synchronisation lieu_id / client_id ──────────────────────

describe("useEffect — synchronisation des selects depuis editingMissionData", () => {
  it("setEditingMissionData avec lieu_id met à jour selectedLieuId", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    act(() => {
      result.current.setEditingMissionData({ lieu_id: "sync-lieu" });
    });

    expect(result.current.selectedLieuId).toBe("sync-lieu");
  });

  it("setEditingMissionData avec client_id met à jour selectedClientId", () => {
    const params = makeParams();
    const { result } = renderHook(() => useMissionForm(params));

    act(() => {
      result.current.setEditingMissionData({ client_id: "sync-client" });
    });

    expect(result.current.selectedClientId).toBe("sync-client");
  });
});

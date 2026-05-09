import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useFraisModal } from "../../hooks/useFraisModal";
import type { FraisDivers } from "../../types/entities";

// ─── Mocks stables (hors renderHook) ─────────────────────────────────────────

const createFrais  = vi.fn();
const updateFrais  = vi.fn();
const deleteFrais  = vi.fn();
const setLoading   = vi.fn();
const triggerAlert = vi.fn();
const showConfirm  = vi.fn();

beforeEach(() => vi.clearAllMocks());

beforeEach(() => {
  createFrais.mockResolvedValue(undefined);
  updateFrais.mockResolvedValue(undefined);
  deleteFrais.mockResolvedValue(undefined);
  showConfirm.mockResolvedValue(true);
});

function makeArgs() {
  return { createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm };
}

function makeFrais(overrides: Partial<FraisDivers> = {}): FraisDivers {
  return {
    id: "f1",
    user_id: "uid",
    patron_id: "p1",
    description: "Carburant",
    montant: 50,
    date_frais: "2026-05-01",
    ...overrides,
  };
}

// ─── 1. closeFraisModal ───────────────────────────────────────────────────────

describe("closeFraisModal", () => {
  it("ferme le modal et réinitialise le formulaire", () => {
    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => { result.current.handleFraisEdit(makeFrais()); });

    expect(result.current.showFraisModal).toBe(true);
    expect(result.current.fraisDescription).toBe("Carburant");
    expect(result.current.editingFraisId).toBe("f1");
    expect(result.current.fraisPatronId).toBe("p1");

    act(() => { result.current.closeFraisModal(); });

    expect(result.current.showFraisModal).toBe(false);
    expect(result.current.fraisDescription).toBe("");
    expect(result.current.fraisMontant).toBe("");
    expect(result.current.editingFraisId).toBeNull();
    expect(result.current.fraisPatronId).toBeNull();
  });

  it("resetFraisForm réinitialise les champs sans fermer le modal", () => {
    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => { result.current.handleFraisEdit(makeFrais()); });
    expect(result.current.fraisDescription).toBe("Carburant");

    act(() => { result.current.resetFraisForm(); });

    expect(result.current.fraisDescription).toBe("");
    expect(result.current.editingFraisId).toBeNull();
  });

  it("closeFraisModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => useFraisModal(makeArgs()));
    expect(() => act(() => { result.current.closeFraisModal(); })).not.toThrow();
  });
});

// ─── 2. handleFraisSubmit — verrou isSaving ───────────────────────────────────

describe("handleFraisSubmit — verrou isSaving", () => {
  it("isSaving est true pendant l'appel API et false après", async () => {
    let resolveCreate!: () => void;
    createFrais.mockImplementation(
      () => new Promise<void>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => {
      result.current.setFraisDescription("Péage");
      result.current.setFraisMontant("20");
      result.current.setFraisPatronId("p1");
    });

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleFraisSubmit(); });
    await act(async () => {});

    expect(result.current.isSaving).toBe(true);

    await act(async () => { resolveCreate(); await p1; });

    expect(result.current.isSaving).toBe(false);
  });

  it("double-clic sur submit — API appelée une seule fois", async () => {
    let resolveFirst!: () => void;
    createFrais.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => {
      result.current.setFraisDescription("Péage");
      result.current.setFraisMontant("20");
      result.current.setFraisPatronId("p1");
    });

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleFraisSubmit(); });
    await act(async () => {});
    await act(async () => { await result.current.handleFraisSubmit(); });
    await act(async () => { resolveFirst(); await p1; });

    expect(createFrais).toHaveBeenCalledTimes(1);
  });

  it("formulaire invalide → API non appelée", async () => {
    const { result } = renderHook(() => useFraisModal(makeArgs()));

    await act(async () => { await result.current.handleFraisSubmit(); });

    expect(createFrais).not.toHaveBeenCalled();
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    createFrais.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => {
      result.current.setFraisDescription("Péage");
      result.current.setFraisMontant("20");
      result.current.setFraisPatronId("p1");
    });

    await act(async () => { await result.current.handleFraisSubmit(); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });

  it("succès → modal fermé et formulaire réinitialisé", async () => {
    createFrais.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    act(() => {
      result.current.openFraisModal();
      result.current.setFraisDescription("Taxi");
      result.current.setFraisMontant("35");
      result.current.setFraisPatronId("p1");
    });

    await act(async () => { await result.current.handleFraisSubmit(); });

    expect(result.current.showFraisModal).toBe(false);
    expect(result.current.fraisDescription).toBe("");
    expect(result.current.fraisPatronId).toBeNull();
  });
});

// ─── 3. handleFraisDelete — verrou isSaving ──────────────────────────────────

describe("handleFraisDelete — verrou isSaving", () => {
  it("double-clic sur delete — API appelée une seule fois", async () => {
    let resolveDelete!: () => void;
    deleteFrais.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDelete = res; })
    );

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleFraisDelete(makeFrais()); });
    await act(async () => {});
    await act(async () => { await result.current.handleFraisDelete(makeFrais()); });
    await act(async () => { resolveDelete(); await p1; });

    expect(deleteFrais).toHaveBeenCalledTimes(1);
  });

  it("non confirmé → deleteFrais non appelé", async () => {
    showConfirm.mockResolvedValue(false);

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    await act(async () => { await result.current.handleFraisDelete(makeFrais()); });

    expect(deleteFrais).not.toHaveBeenCalled();
  });

  it("suppression réussie → triggerAlert appelé", async () => {
    deleteFrais.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    await act(async () => { await result.current.handleFraisDelete(makeFrais()); });

    expect(deleteFrais).toHaveBeenCalledWith("f1");
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    deleteFrais.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useFraisModal(makeArgs()));

    await act(async () => { await result.current.handleFraisDelete(makeFrais()); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePatronModal } from "../../hooks/usePatronModal";
import type { Patron } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../contexts/LabelsContext", () => ({
  useLabels: () => ({ client: "Client", lieu: "Lieu", patron: "Patron" }),
}));

// ─── Mocks stables (hors renderHook) ─────────────────────────────────────────

const createPatron = vi.fn();
const updatePatron = vi.fn();
const deletePatron = vi.fn();
const setLoading   = vi.fn();
const triggerAlert = vi.fn();
const showConfirm  = vi.fn();

beforeEach(() => vi.clearAllMocks());

beforeEach(() => {
  createPatron.mockResolvedValue(undefined);
  updatePatron.mockResolvedValue(undefined);
  deletePatron.mockResolvedValue(undefined);
  showConfirm.mockResolvedValue(true);
});

function makeArgs() {
  return { createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm };
}

function makePatron(overrides: Partial<Patron> = {}): Patron {
  return {
    id: "p1",
    user_id: "uid",
    nom: "Dupont",
    taux_horaire: 15,
    couleur: null,
    adresse: null,
    code_postal: null,
    ville: null,
    telephone: null,
    email: null,
    siret: null,
    actif: true,
    ...overrides,
  };
}

// ─── 1. closePatronModal ──────────────────────────────────────────────────────

describe("closePatronModal", () => {
  it("ferme le modal et réinitialise l'état d'édition", () => {
    const { result } = renderHook(() => usePatronModal(makeArgs()));

    act(() => { result.current.handlePatronEdit(makePatron()); });

    expect(result.current.showPatronModal).toBe(true);
    expect(result.current.editingPatronId).toBe("p1");
    expect(result.current.editingPatronData).not.toBeNull();

    act(() => { result.current.closePatronModal(); });

    expect(result.current.showPatronModal).toBe(false);
    expect(result.current.editingPatronId).toBeNull();
    expect(result.current.editingPatronData).toBeNull();
  });

  it("openPatronModal ouvre le modal et réinitialise l'état d'édition", () => {
    const { result } = renderHook(() => usePatronModal(makeArgs()));

    act(() => { result.current.handlePatronEdit(makePatron()); });
    expect(result.current.editingPatronId).toBe("p1");

    act(() => { result.current.openPatronModal(); });

    expect(result.current.showPatronModal).toBe(true);
    expect(result.current.editingPatronId).toBeNull();
    expect(result.current.editingPatronData).toBeNull();
  });

  it("closePatronModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => usePatronModal(makeArgs()));
    expect(() => act(() => { result.current.closePatronModal(); })).not.toThrow();
  });
});

// ─── 2. handlePatronSubmit — verrou isSaving ─────────────────────────────────

describe("handlePatronSubmit — verrou isSaving", () => {
  it("isSaving est true pendant l'appel API et false après", async () => {
    let resolveCreate!: () => void;
    createPatron.mockImplementation(
      () => new Promise<void>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handlePatronSubmit({ nom: "Dupont" }); });
    await act(async () => {});

    expect(result.current.isSaving).toBe(true);

    await act(async () => { resolveCreate(); await p1; });

    expect(result.current.isSaving).toBe(false);
  });

  it("double-clic sur submit — API appelée une seule fois", async () => {
    let resolveFirst!: () => void;
    createPatron.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handlePatronSubmit({ nom: "Dupont" }); });
    await act(async () => {});
    await act(async () => { await result.current.handlePatronSubmit({ nom: "Martin" }); });
    await act(async () => { resolveFirst(); await p1; });

    expect(createPatron).toHaveBeenCalledTimes(1);
  });

  it("succès création → modal fermé et état réinitialisé", async () => {
    createPatron.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    act(() => { result.current.openPatronModal(); });

    await act(async () => { await result.current.handlePatronSubmit({ nom: "Dupont" }); });

    expect(result.current.showPatronModal).toBe(false);
    expect(result.current.editingPatronId).toBeNull();
  });

  it("succès édition → updatePatron appelé, modal fermé", async () => {
    updatePatron.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    act(() => { result.current.handlePatronEdit(makePatron()); });

    await act(async () => { await result.current.handlePatronSubmit({ nom: "Dupont modifié" }); });

    expect(updatePatron).toHaveBeenCalledWith("p1", { nom: "Dupont modifié" });
    expect(result.current.showPatronModal).toBe(false);
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    createPatron.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    await act(async () => { await result.current.handlePatronSubmit({ nom: "Test" }); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

// ─── 3. handlePatronDelete — verrou isSaving ─────────────────────────────────

describe("handlePatronDelete — verrou isSaving", () => {
  it("double-clic sur delete — API appelée une seule fois", async () => {
    let resolveDelete!: () => void;
    deletePatron.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDelete = res; })
    );

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handlePatronDelete(makePatron()); });
    await act(async () => {});
    await act(async () => { await result.current.handlePatronDelete(makePatron()); });
    await act(async () => { resolveDelete(); await p1; });

    expect(deletePatron).toHaveBeenCalledTimes(1);
  });

  it("non confirmé → deletePatron non appelé", async () => {
    showConfirm.mockResolvedValue(false);

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    await act(async () => { await result.current.handlePatronDelete(makePatron()); });

    expect(deletePatron).not.toHaveBeenCalled();
  });

  it("suppression réussie → triggerAlert appelé", async () => {
    deletePatron.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    await act(async () => { await result.current.handlePatronDelete(makePatron()); });

    expect(deletePatron).toHaveBeenCalledWith("p1");
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    deletePatron.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => usePatronModal(makeArgs()));

    await act(async () => { await result.current.handlePatronDelete(makePatron()); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useClientModal } from "../../hooks/useClientModal";
import type { Client } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../contexts/LabelsContext", () => ({
  useLabels: () => ({ client: "Client", lieu: "Lieu", patron: "Patron" }),
}));

// ─── Mocks stables (hors renderHook) ─────────────────────────────────────────

const createClient = vi.fn();
const updateClient = vi.fn();
const deleteClient = vi.fn();
const setLoading   = vi.fn();
const triggerAlert = vi.fn();
const showConfirm  = vi.fn();

beforeEach(() => vi.clearAllMocks());

beforeEach(() => {
  createClient.mockResolvedValue(undefined);
  updateClient.mockResolvedValue(undefined);
  deleteClient.mockResolvedValue(undefined);
  showConfirm.mockResolvedValue(true);
});

function makeArgs() {
  return { createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    user_id: "uid",
    nom: "Alice",
    contact: null,
    lieu_travail: null,
    notes: null,
    actif: true,
    ...overrides,
  };
}

// ─── 1. closeClientModal ──────────────────────────────────────────────────────

describe("closeClientModal", () => {
  it("ferme le modal et réinitialise l'état d'édition", () => {
    const { result } = renderHook(() => useClientModal(makeArgs()));

    act(() => { result.current.handleClientEdit(makeClient()); });

    expect(result.current.showClientModal).toBe(true);
    expect(result.current.editingClientId).toBe("c1");
    expect(result.current.editingClientData).not.toBeNull();

    act(() => { result.current.closeClientModal(); });

    expect(result.current.showClientModal).toBe(false);
    expect(result.current.editingClientId).toBeNull();
    expect(result.current.editingClientData).toBeNull();
  });

  it("openClientModal ouvre le modal et réinitialise l'état d'édition", () => {
    const { result } = renderHook(() => useClientModal(makeArgs()));

    act(() => { result.current.handleClientEdit(makeClient()); });
    expect(result.current.editingClientId).toBe("c1");

    act(() => { result.current.openClientModal(); });

    expect(result.current.showClientModal).toBe(true);
    expect(result.current.editingClientId).toBeNull();
    expect(result.current.editingClientData).toBeNull();
  });

  it("closeClientModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => useClientModal(makeArgs()));
    expect(() => act(() => { result.current.closeClientModal(); })).not.toThrow();
  });
});

// ─── 2. handleClientSubmit — verrou isSaving ─────────────────────────────────

describe("handleClientSubmit — verrou isSaving", () => {
  it("isSaving est true pendant l'appel API et false après", async () => {
    let resolveCreate!: () => void;
    createClient.mockImplementation(
      () => new Promise<void>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => useClientModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleClientSubmit({ nom: "Alice" }); });
    await act(async () => {});

    expect(result.current.isSaving).toBe(true);

    await act(async () => { resolveCreate(); await p1; });

    expect(result.current.isSaving).toBe(false);
  });

  it("double-clic sur submit — API appelée une seule fois", async () => {
    let resolveFirst!: () => void;
    createClient.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => useClientModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleClientSubmit({ nom: "Alice" }); });
    await act(async () => {});
    await act(async () => { await result.current.handleClientSubmit({ nom: "Bob" }); });
    await act(async () => { resolveFirst(); await p1; });

    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("succès création → modal fermé et état réinitialisé", async () => {
    createClient.mockResolvedValue(undefined);

    const { result } = renderHook(() => useClientModal(makeArgs()));

    act(() => { result.current.openClientModal(); });

    await act(async () => { await result.current.handleClientSubmit({ nom: "Alice" }); });

    expect(result.current.showClientModal).toBe(false);
    expect(result.current.editingClientId).toBeNull();
  });

  it("succès édition → updateClient appelé, modal fermé", async () => {
    updateClient.mockResolvedValue(undefined);

    const { result } = renderHook(() => useClientModal(makeArgs()));

    act(() => { result.current.handleClientEdit(makeClient()); });

    await act(async () => { await result.current.handleClientSubmit({ nom: "Alice modifiée" }); });

    expect(updateClient).toHaveBeenCalledWith("c1", { nom: "Alice modifiée" });
    expect(result.current.showClientModal).toBe(false);
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    createClient.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useClientModal(makeArgs()));

    await act(async () => { await result.current.handleClientSubmit({ nom: "Test" }); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

// ─── 3. handleClientDelete — verrou isSaving ─────────────────────────────────

describe("handleClientDelete — verrou isSaving", () => {
  it("double-clic sur delete — API appelée une seule fois", async () => {
    let resolveDelete!: () => void;
    deleteClient.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDelete = res; })
    );

    const { result } = renderHook(() => useClientModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleClientDelete(makeClient()); });
    await act(async () => {});
    await act(async () => { await result.current.handleClientDelete(makeClient()); });
    await act(async () => { resolveDelete(); await p1; });

    expect(deleteClient).toHaveBeenCalledTimes(1);
  });

  it("non confirmé → deleteClient non appelé", async () => {
    showConfirm.mockResolvedValue(false);

    const { result } = renderHook(() => useClientModal(makeArgs()));

    await act(async () => { await result.current.handleClientDelete(makeClient()); });

    expect(deleteClient).not.toHaveBeenCalled();
  });

  it("suppression réussie → triggerAlert appelé", async () => {
    deleteClient.mockResolvedValue(undefined);

    const { result } = renderHook(() => useClientModal(makeArgs()));

    await act(async () => { await result.current.handleClientDelete(makeClient()); });

    expect(deleteClient).toHaveBeenCalledWith("c1");
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    deleteClient.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useClientModal(makeArgs()));

    await act(async () => { await result.current.handleClientDelete(makeClient()); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

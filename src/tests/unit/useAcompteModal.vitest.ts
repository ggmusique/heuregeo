import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAcompteModal } from "../../hooks/useAcompteModal";

// ─── Mocks stables (hors renderHook) ─────────────────────────────────────────

const createAcompte     = vi.fn();
const fetchAcomptes     = vi.fn();
const setLoading        = vi.fn();
const triggerAlert      = vi.fn();
const chargerHistorique = vi.fn();

const mockBilan = {
  fetchHistoriqueBilans: vi.fn(),
  showBilan: false,
  bilanPeriodValue: "",
  genererBilan: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

beforeEach(() => {
  fetchAcomptes.mockResolvedValue([]);
  chargerHistorique.mockResolvedValue(undefined);
  mockBilan.fetchHistoriqueBilans.mockResolvedValue(undefined);
  mockBilan.genererBilan.mockResolvedValue(undefined);
});

function makeArgs() {
  return {
    createAcompte,
    fetchAcomptes,
    setLoading,
    triggerAlert,
    bilanPatronId: null,
    chargerHistorique,
    bilan: mockBilan,
  };
}

// ─── 1. closeAcompteModal ─────────────────────────────────────────────────────

describe("closeAcompteModal", () => {
  it("ferme le modal et réinitialise le formulaire", () => {
    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => { result.current.openAcompteModal(); });
    act(() => {
      result.current.setAcompteMontant("150");
      result.current.setAcomptePatronId("p1");
    });

    expect(result.current.showAcompteModal).toBe(true);
    expect(result.current.acompteMontant).toBe("150");
    expect(result.current.acomptePatronId).toBe("p1");

    act(() => { result.current.closeAcompteModal(); });

    expect(result.current.showAcompteModal).toBe(false);
    expect(result.current.acompteMontant).toBe("");
    expect(result.current.acomptePatronId).toBeNull();
  });

  it("resetAcompteForm réinitialise les champs sans fermer le modal", () => {
    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => { result.current.openAcompteModal(); });
    act(() => {
      result.current.setAcompteMontant("50");
      result.current.setAcomptePatronId("p2");
    });

    act(() => { result.current.resetAcompteForm(); });

    expect(result.current.acompteMontant).toBe("");
    expect(result.current.acomptePatronId).toBeNull();
  });

  it("closeAcompteModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => useAcompteModal(makeArgs()));
    expect(() => act(() => { result.current.closeAcompteModal(); })).not.toThrow();
  });
});

// ─── 2. handleAcompteSubmit — verrou isSavingAcompte ─────────────────────────

describe("handleAcompteSubmit — verrou isSavingAcompte", () => {
  it("isSavingAcompte est true pendant l'appel API et false après", async () => {
    let resolveCreate!: () => void;
    createAcompte.mockImplementation(
      () => new Promise<void>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => {
      result.current.setAcompteMontant("100");
      result.current.setAcomptePatronId("p1");
    });

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleAcompteSubmit(); });
    await act(async () => {});

    expect(result.current.isSavingAcompte).toBe(true);

    await act(async () => { resolveCreate(); await p1; });

    expect(result.current.isSavingAcompte).toBe(false);
  });

  it("double-clic sur submit — API appelée une seule fois", async () => {
    let resolveFirst!: () => void;
    createAcompte.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => {
      result.current.setAcompteMontant("100");
      result.current.setAcomptePatronId("p1");
    });

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleAcompteSubmit(); });
    await act(async () => {});
    await act(async () => { await result.current.handleAcompteSubmit(); });
    await act(async () => { resolveFirst(); await p1; });

    expect(createAcompte).toHaveBeenCalledTimes(1);
  });

  it("formulaire invalide → API non appelée", async () => {
    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    await act(async () => { await result.current.handleAcompteSubmit(); });

    expect(createAcompte).not.toHaveBeenCalled();
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSavingAcompte revient à false (finally)", async () => {
    createAcompte.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => {
      result.current.setAcompteMontant("100");
      result.current.setAcomptePatronId("p1");
    });

    await act(async () => { await result.current.handleAcompteSubmit(); });

    expect(result.current.isSavingAcompte).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });

  it("succès → modal fermé et formulaire réinitialisé", async () => {
    createAcompte.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAcompteModal(makeArgs()));

    act(() => {
      result.current.openAcompteModal();
      result.current.setAcompteMontant("200");
      result.current.setAcomptePatronId("p1");
    });

    await act(async () => { await result.current.handleAcompteSubmit(); });

    expect(result.current.showAcompteModal).toBe(false);
    expect(result.current.acompteMontant).toBe("");
    expect(result.current.acomptePatronId).toBeNull();
  });
});

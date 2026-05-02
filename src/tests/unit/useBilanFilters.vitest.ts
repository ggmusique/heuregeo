import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBilanFilters } from "../../hooks/useBilanFilters";

// ─── helpers ───────────────────────────────────────────────────────────────

function makeArgs(overrides = {}) {
  return {
    showConfirm: vi.fn().mockResolvedValue(true),
    bilan: { marquerCommePaye: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

// ─── 1. États initiaux ─────────────────────────────────────────────────────

describe("useBilanFilters – états initiaux", () => {
  it("bilanPatronId vaut null", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));
    expect(result.current.bilanPatronId).toBeNull();
  });

  it("bilanClientId vaut null", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));
    expect(result.current.bilanClientId).toBeNull();
  });

  it("showImportModal vaut false", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));
    expect(result.current.showImportModal).toBe(false);
  });
});

// ─── 2. setBilanPatronId / setBilanClientId ────────────────────────────────

describe("useBilanFilters – setters patron / client", () => {
  it("setBilanPatronId met à jour bilanPatronId", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));

    act(() => result.current.setBilanPatronId("patron-42"));

    expect(result.current.bilanPatronId).toBe("patron-42");
  });

  it("setBilanClientId met à jour bilanClientId", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));

    act(() => result.current.setBilanClientId("client-99"));

    expect(result.current.bilanClientId).toBe("client-99");
  });

  it("les deux états sont indépendants", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));

    act(() => {
      result.current.setBilanPatronId("patron-1");
      result.current.setBilanClientId("client-2");
    });

    expect(result.current.bilanPatronId).toBe("patron-1");
    expect(result.current.bilanClientId).toBe("client-2");
  });
});

// ─── 3. setShowImportModal ─────────────────────────────────────────────────

describe("useBilanFilters – setShowImportModal", () => {
  it("passe à true", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));

    act(() => result.current.setShowImportModal(true));

    expect(result.current.showImportModal).toBe(true);
  });

  it("repasse à false après avoir été true", () => {
    const { result } = renderHook(() => useBilanFilters(makeArgs()));

    act(() => result.current.setShowImportModal(true));
    act(() => result.current.setShowImportModal(false));

    expect(result.current.showImportModal).toBe(false);
  });
});

// ─── 4. marquerCommePaye – showConfirm=true ────────────────────────────────

describe("useBilanFilters – marquerCommePaye confirmé", () => {
  it("appelle bilan.marquerCommePaye avec le bilanPatronId courant", async () => {
    const args = makeArgs({ showConfirm: vi.fn().mockResolvedValue(true) });
    const { result } = renderHook(() => useBilanFilters(args));

    act(() => result.current.setBilanPatronId("patron-7"));
    await act(() => result.current.marquerCommePaye());

    expect(args.showConfirm).toHaveBeenCalledOnce();
    expect(args.bilan.marquerCommePaye).toHaveBeenCalledOnce();
    expect(args.bilan.marquerCommePaye).toHaveBeenCalledWith("patron-7");
  });

  it("appelle showConfirm avec les bons paramètres", async () => {
    const args = makeArgs({ showConfirm: vi.fn().mockResolvedValue(true) });
    const { result } = renderHook(() => useBilanFilters(args));

    await act(() => result.current.marquerCommePaye());

    expect(args.showConfirm).toHaveBeenCalledWith({
      title: "Marquer comme paye",
      message: "Voulez-vous marquer ce bilan comme paye ?",
      confirmText: "Confirmer",
      cancelText: "Annuler",
      type: "info",
    });
  });
});

// ─── 5. marquerCommePaye – showConfirm=false ──────────────────────────────

describe("useBilanFilters – marquerCommePaye annulé", () => {
  it("n'appelle pas bilan.marquerCommePaye si showConfirm résout false", async () => {
    const args = makeArgs({ showConfirm: vi.fn().mockResolvedValue(false) });
    const { result } = renderHook(() => useBilanFilters(args));

    await act(() => result.current.marquerCommePaye());

    expect(args.showConfirm).toHaveBeenCalledOnce();
    expect(args.bilan.marquerCommePaye).not.toHaveBeenCalled();
  });
});

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useLieuModal } from "../../hooks/useLieuModal";
import type { Lieu } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../utils/geocode", () => ({
  geocodeAddress: vi.fn(),
}));

import * as geocodeModule from "../../utils/geocode";

// ─── Refs stables (hors renderHook) ──────────────────────────────────────────

const createLieu   = vi.fn();
const updateLieu   = vi.fn();
const deleteLieu   = vi.fn();
const fetchLieux   = vi.fn();
const setLoading   = vi.fn();
const triggerAlert = vi.fn();
const showConfirm  = vi.fn();
const onLieuCreated = vi.fn();

beforeEach(() => vi.clearAllMocks());

// Par défaut
beforeEach(() => {
  fetchLieux.mockResolvedValue([]);
  showConfirm.mockResolvedValue(true);
});

function makeArgs() {
  return { createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated };
}

function makeLieu(overrides: Partial<Lieu> = {}): Lieu {
  return {
    id: "l1",
    user_id: "uid",
    nom: "Bureau",
    adresse_complete: "1 rue des Tests",
    latitude: 50.0,
    longitude: 4.0,
    notes: null,
    type: null,
    ...overrides,
  };
}

// ─── 1. openLieuModal / closeLieuModal ───────────────────────────────────────

describe("openLieuModal / closeLieuModal", () => {
  it("openLieuModal ouvre le modal et reset editingLieuId/Data", async () => {
    const { result } = renderHook(() => useLieuModal(makeArgs()));

    // Placer d'abord en mode édition
    act(() => { result.current.handleLieuEdit(makeLieu()); });
    expect(result.current.editingLieuId).toBe("l1");

    act(() => { result.current.openLieuModal(); });

    expect(result.current.showLieuModal).toBe(true);
    expect(result.current.editingLieuId).toBeNull();
    expect(result.current.editingLieuData).toBeNull();
  });

  it("closeLieuModal ferme le modal et reset l'état d'édition", async () => {
    const { result } = renderHook(() => useLieuModal(makeArgs()));

    act(() => { result.current.handleLieuEdit(makeLieu()); });
    expect(result.current.showLieuModal).toBe(true);
    expect(result.current.editingLieuId).toBe("l1");

    act(() => { result.current.closeLieuModal(); });

    expect(result.current.showLieuModal).toBe(false);
    expect(result.current.editingLieuId).toBeNull();
    expect(result.current.editingLieuData).toBeNull();
  });

  it("closeLieuModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => useLieuModal(makeArgs()));
    expect(() => act(() => { result.current.closeLieuModal(); })).not.toThrow();
  });
});

// ─── 2. handleLieuSubmit — verrou isSaving ───────────────────────────────────

describe("handleLieuSubmit — verrou isSaving", () => {
  it("isSaving est true pendant l'appel API et false après", async () => {
    let resolveCreate!: (lieu: Lieu) => void;
    createLieu.mockImplementation(
      () => new Promise<Lieu>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => useLieuModal(makeArgs()));

    // Démarrer sans attendre
    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleLieuSubmit({ nom: "Test" }); });
    // Flush React → isSaving=true
    await act(async () => {});
    expect(result.current.isSaving).toBe(true);

    // Résoudre et vérifier reset (finally)
    await act(async () => { resolveCreate(makeLieu()); await p1; });
    expect(result.current.isSaving).toBe(false);
  });

  it("double-appel concurrent ignoré — API appelée une seule fois", async () => {
    let resolveFirst!: (v: Lieu) => void;
    createLieu.mockImplementationOnce(
      () => new Promise<Lieu>((res) => { resolveFirst = () => res(makeLieu()); })
    );

    const { result } = renderHook(() => useLieuModal(makeArgs()));

    // Démarrer le 1er appel sans l'attendre
    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleLieuSubmit({ nom: "A" }); });
    // Flush React → isSaving devient true
    await act(async () => {});
    // 2e appel : isSaving=true → ignoré
    await act(async () => { await result.current.handleLieuSubmit({ nom: "B" }); });
    // Résoudre le 1er
    await act(async () => { resolveFirst(makeLieu()); await p1; });

    expect(createLieu).toHaveBeenCalledTimes(1);
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    createLieu.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuSubmit({ nom: "Test" }); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });

  it("création → ferme modal + reset + onLieuCreated appelé", async () => {
    const newLieu = makeLieu({ id: "new-l" });
    createLieu.mockResolvedValue(newLieu);

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuSubmit({ nom: "Nouveau" }); });

    expect(onLieuCreated).toHaveBeenCalledWith(newLieu);
    expect(result.current.showLieuModal).toBe(false);
    expect(result.current.editingLieuId).toBeNull();
  });

  it("createLieu retourne null → onLieuCreated NON appelé", async () => {
    createLieu.mockResolvedValue(null);

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuSubmit({ nom: "Test" }); });

    expect(onLieuCreated).not.toHaveBeenCalled();
  });
});

// ─── 3. handleLieuDelete — verrou isSaving ───────────────────────────────────

describe("handleLieuDelete — verrou isSaving", () => {
  it("supprime le lieu et appelle triggerAlert", async () => {
    deleteLieu.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuDelete(makeLieu()); });

    expect(deleteLieu).toHaveBeenCalledWith("l1");
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("supprimé"));
  });

  it("double-appel concurrent ignoré — deleteLieu appelé une seule fois", async () => {
    let resolveDelete!: () => void;
    deleteLieu.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDelete = res; })
    );

    const { result } = renderHook(() => useLieuModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleLieuDelete(makeLieu()); });
    // Flush React → isSaving devient true
    await act(async () => {});
    // 2e appel ignoré
    await act(async () => { await result.current.handleLieuDelete(makeLieu()); });
    // Résoudre le 1er
    await act(async () => { resolveDelete(); await p1; });

    expect(deleteLieu).toHaveBeenCalledTimes(1);
  });

  it("non confirmé → deleteLieu non appelé", async () => {
    showConfirm.mockResolvedValue(false);

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuDelete(makeLieu()); });

    expect(deleteLieu).not.toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    deleteLieu.mockRejectedValue(new Error("FK"));

    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleLieuDelete(makeLieu()); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith("Erreur suppression");
  });
});

// ─── 4. handleRegeocoderBatch — verrou isGeocoding ───────────────────────────

describe("handleRegeocoderBatch — verrou isGeocoding", () => {
  it("liste vide → retourne 'Aucun lieu à géocoder' sans appel API", async () => {
    const { result } = renderHook(() => useLieuModal(makeArgs()));
    let res!: { message: string };
    await act(async () => { res = await result.current.handleRegeocoderBatch([]); });
    expect(res.message).toBe("Aucun lieu à géocoder");
    expect(geocodeModule.geocodeAddress).not.toHaveBeenCalled();
  });

  it("géocode les lieux et retourne le nombre de succès", async () => {
    vi.mocked(geocodeModule.geocodeAddress).mockResolvedValue({ lat: 50.1, lng: 4.1 });
    updateLieu.mockResolvedValue(makeLieu());

    const lieux = [makeLieu({ id: "l1", adresse_complete: "1 rue Test" })];
    const { result } = renderHook(() => useLieuModal(makeArgs()));

    let res!: { message: string };
    await act(async () => { res = await result.current.handleRegeocoderBatch(lieux); });

    expect(res.message).toContain("1 lieu(x) géocodé(s)");
    expect(updateLieu).toHaveBeenCalledWith("l1", { latitude: 50.1, longitude: 4.1 });
  });

  it("double-appel concurrent → 2e retourne 'Géocodage déjà en cours'", async () => {
    // fake timers pour court-circuiter le délai Nominatim de 1100ms
    vi.useFakeTimers();
    try {
      vi.mocked(geocodeModule.geocodeAddress).mockResolvedValue({ lat: 50.0, lng: 4.0 });
      updateLieu.mockResolvedValue(makeLieu());

      const lieux = [makeLieu({ id: "l1", adresse_complete: "1 rue Test" })];
      const { result } = renderHook(() => useLieuModal(makeArgs()));

      // Démarrer le 1er batch (bloqué sur setTimeout 1100ms)
      let p1: Promise<{ message: string }>;
      act(() => { p1 = result.current.handleRegeocoderBatch(lieux); });
      // Flush React → isGeocoding=true
      await act(async () => {});

      // 2e appel : isGeocoding=true → bloqué
      let res2!: { message: string };
      await act(async () => { res2 = await result.current.handleRegeocoderBatch(lieux); });
      expect(res2.message).toBe("Géocodage déjà en cours");

      // Laisser le 1er batch se terminer
      await act(async () => { await vi.runAllTimersAsync(); await p1; });
    } finally {
      vi.useRealTimers();
    }
  });

  it("isGeocoding est false après la fin (finally)", async () => {
    vi.mocked(geocodeModule.geocodeAddress).mockResolvedValue({ lat: 50.0, lng: 4.0 });
    updateLieu.mockResolvedValue(makeLieu());

    const lieux = [makeLieu({ adresse_complete: "1 rue Test" })];
    const { result } = renderHook(() => useLieuModal(makeArgs()));
    await act(async () => { await result.current.handleRegeocoderBatch(lieux); });

    expect(result.current.isGeocoding).toBe(false);
  });

  it("fetchLieux dans le try → erreur de fetchLieux n'empêche pas le retour du résultat", async () => {
    vi.mocked(geocodeModule.geocodeAddress).mockResolvedValue({ lat: 50.0, lng: 4.0 });
    updateLieu.mockResolvedValue(makeLieu());
    fetchLieux.mockRejectedValueOnce(new Error("fetch fail"));

    const lieux = [makeLieu({ adresse_complete: "1 rue Test" })];
    const { result } = renderHook(() => useLieuModal(makeArgs()));

    // fetchLieux throw mais le finally reset isGeocoding
    await act(async () => {
      await expect(result.current.handleRegeocoderBatch(lieux)).rejects.toThrow("fetch fail");
    });

    expect(result.current.isGeocoding).toBe(false);
  });

  it("erreurs de géocodage individuelles signalées dans le message de retour", async () => {
    vi.mocked(geocodeModule.geocodeAddress).mockRejectedValue(new Error("Nominatim down"));

    const lieux = [makeLieu({ id: "l1", nom: "Bureau", adresse_complete: "1 rue Test" })];
    const { result } = renderHook(() => useLieuModal(makeArgs()));

    let res!: { message: string };
    await act(async () => { res = await result.current.handleRegeocoderBatch(lieux); });

    expect(res.message).toContain("erreur(s)");
    expect(res.message).toContain("0 lieu(x)");
  });
});

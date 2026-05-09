import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAgendaModal } from "../../hooks/useAgendaModal";
import type { AgendaEvent } from "../../hooks/useAgendaModal";

// ─── Mocks stables (hors renderHook) ─────────────────────────────────────────

const createEvent  = vi.fn();
const updateEvent  = vi.fn();
const deleteEvent  = vi.fn();
const triggerAlert = vi.fn();

beforeEach(() => vi.clearAllMocks());

beforeEach(() => {
  createEvent.mockResolvedValue(undefined);
  updateEvent.mockResolvedValue(undefined);
  deleteEvent.mockResolvedValue(undefined);
});

function makeArgs() {
  return { createEvent, updateEvent, deleteEvent, triggerAlert };
}

function makeEvent(overrides: Partial<AgendaEvent> = {}): AgendaEvent {
  return { id: "e1", date_iso: "2026-05-10", titre: "Réunion", ...overrides };
}

// ─── 1. closeAgendaModal ─────────────────────────────────────────────────────

describe("closeAgendaModal", () => {
  it("ferme le modal et réinitialise l'état d'édition", () => {
    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    act(() => { result.current.handleEventEdit(makeEvent()); });

    expect(result.current.showAgendaModal).toBe(true);
    expect(result.current.editingEventId).toBe("e1");

    act(() => { result.current.closeAgendaModal(); });

    expect(result.current.showAgendaModal).toBe(false);
    expect(result.current.editingEventId).toBeNull();
    expect(result.current.editingEventData).toBeNull();
    expect(result.current.selectedDate).toBeNull();
  });

  it("resetEventForm réinitialise sans fermer", () => {
    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    act(() => { result.current.handleEventEdit(makeEvent()); });
    expect(result.current.editingEventId).toBe("e1");

    act(() => { result.current.resetEventForm(); });

    expect(result.current.editingEventId).toBeNull();
    expect(result.current.editingEventData).toBeNull();
    expect(result.current.selectedDate).toBeNull();
  });

  it("closeAgendaModal sans modal ouvert ne provoque pas d'erreur", () => {
    const { result } = renderHook(() => useAgendaModal(makeArgs()));
    expect(() => act(() => { result.current.closeAgendaModal(); })).not.toThrow();
  });
});

// ─── 2. handleEventSubmit — verrou isSaving ───────────────────────────────────

describe("handleEventSubmit — verrou isSaving", () => {
  it("isSaving est true pendant l'appel API et false après", async () => {
    let resolveCreate!: () => void;
    createEvent.mockImplementation(
      () => new Promise<void>((res) => { resolveCreate = res; })
    );

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleEventSubmit({ titre: "A" }); });
    await act(async () => {});

    expect(result.current.isSaving).toBe(true);

    await act(async () => { resolveCreate(); await p1; });

    expect(result.current.isSaving).toBe(false);
  });

  it("double-clic sur submit — API appelée une seule fois", async () => {
    let resolveFirst!: () => void;
    createEvent.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleEventSubmit({ titre: "A" }); });
    await act(async () => {});
    await act(async () => { await result.current.handleEventSubmit({ titre: "B" }); });
    await act(async () => { resolveFirst(); await p1; });

    expect(createEvent).toHaveBeenCalledTimes(1);
  });

  it("succès création → modal fermé et état réinitialisé", async () => {
    createEvent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    act(() => { result.current.openForDate("2026-05-10"); });
    expect(result.current.showAgendaModal).toBe(true);

    await act(async () => { await result.current.handleEventSubmit({ titre: "Test" }); });

    expect(result.current.showAgendaModal).toBe(false);
    expect(result.current.editingEventId).toBeNull();
  });

  it("succès édition → updateEvent appelé, modal fermé", async () => {
    updateEvent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    act(() => { result.current.handleEventEdit(makeEvent()); });

    await act(async () => { await result.current.handleEventSubmit({ titre: "Modifié" }); });

    expect(updateEvent).toHaveBeenCalledWith("e1", { titre: "Modifié" });
    expect(result.current.showAgendaModal).toBe(false);
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    createEvent.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    await act(async () => { await result.current.handleEventSubmit({ titre: "Test" }); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

// ─── 3. handleEventDelete — verrou isSaving ──────────────────────────────────

describe("handleEventDelete — verrou isSaving", () => {
  it("double-clic sur delete — API appelée une seule fois", async () => {
    let resolveDelete!: () => void;
    deleteEvent.mockImplementationOnce(
      () => new Promise<void>((res) => { resolveDelete = res; })
    );

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    let p1!: Promise<void>;
    act(() => { p1 = result.current.handleEventDelete("e1"); });
    await act(async () => {});
    await act(async () => { await result.current.handleEventDelete("e1"); });
    await act(async () => { resolveDelete(); await p1; });

    expect(deleteEvent).toHaveBeenCalledTimes(1);
  });

  it("suppression réussie → modal fermé", async () => {
    deleteEvent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    act(() => { result.current.handleEventEdit(makeEvent()); });
    expect(result.current.showAgendaModal).toBe(true);

    await act(async () => { await result.current.handleEventDelete("e1"); });

    expect(result.current.showAgendaModal).toBe(false);
    expect(triggerAlert).toHaveBeenCalled();
  });

  it("erreur → isSaving revient à false (finally)", async () => {
    deleteEvent.mockRejectedValue(new Error("API fail"));

    const { result } = renderHook(() => useAgendaModal(makeArgs()));

    await act(async () => { await result.current.handleEventDelete("e1"); });

    expect(result.current.isSaving).toBe(false);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

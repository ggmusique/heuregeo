import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAgenda, getMondayOf } from "../../hooks/useAgenda";
import type { AgendaEvent } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/api/agendaApi", () => ({
  fetchAgendaEvents: vi.fn(),
  fetchAgendaReminders: vi.fn(),
  createAgendaEvent: vi.fn(),
  updateAgendaEvent: vi.fn(),
  deleteAgendaEvent: vi.fn(),
}));

import * as agendaApi from "../../services/api/agendaApi";

// Références stables — créées UNE SEULE FOIS hors renderHook
const triggerAlert = vi.fn();

beforeEach(() => vi.clearAllMocks());

// Par défaut, les deux API retournent [] pour ne pas parasiter les tests
beforeEach(() => {
  vi.mocked(agendaApi.fetchAgendaEvents).mockResolvedValue([]);
  vi.mocked(agendaApi.fetchAgendaReminders).mockResolvedValue([]);
});

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<AgendaEvent> = {}): AgendaEvent {
  return {
    id: "e1",
    user_id: "uid",
    titre: "Réunion",
    date_iso: "2026-05-12",
    type: "rdv",
    heure_debut: "10:00",
    heure_fin: "11:00",
    rappel_minutes: null,
    description: null,
    ...overrides,
  };
}

// ─── 1. getMondayOf (helper exporté) ─────────────────────────────────────────

describe("getMondayOf", () => {
  it("retourne le lundi de la semaine pour un vendredi", () => {
    // 2026-05-08 = vendredi → lundi = 2026-05-04
    expect(getMondayOf(new Date("2026-05-08T12:00:00"))).toBe("2026-05-04");
  });

  it("retourne le même jour pour un lundi", () => {
    expect(getMondayOf(new Date("2026-05-04T12:00:00"))).toBe("2026-05-04");
  });

  it("retourne le lundi précédent pour un dimanche", () => {
    // 2026-05-10 = dimanche → lundi = 2026-05-04
    expect(getMondayOf(new Date("2026-05-10T12:00:00"))).toBe("2026-05-04");
  });
});

// ─── 2. fetchEvents ───────────────────────────────────────────────────────────

describe("fetchEvents", () => {
  it("appelle agendaApi.fetchAgendaEvents avec userId, year, month et popule events", async () => {
    const data = [makeEvent({ id: "e1" }), makeEvent({ id: "e2", titre: "Stand-up" })];
    vi.mocked(agendaApi.fetchAgendaEvents).mockResolvedValue(data);

    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    expect(agendaApi.fetchAgendaEvents).toHaveBeenCalledWith(
      "uid",
      expect.any(Number),
      expect.any(Number)
    );
    expect(result.current.events).toHaveLength(2);
  });

  it("userId null → events reste [] sans appeler l'API", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: null, triggerAlert })
    );
    await act(async () => {});

    expect(agendaApi.fetchAgendaEvents).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
  });

  it("loading est false après le chargement", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it("erreur API → triggerAlert + events inchangé", async () => {
    vi.mocked(agendaApi.fetchAgendaEvents).mockRejectedValue(new Error("DB fail"));

    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    expect(triggerAlert).toHaveBeenCalledWith(
      expect.stringContaining("chargement agenda")
    );
    expect(result.current.events).toEqual([]);
  });
});

// ─── 3. createEvent ───────────────────────────────────────────────────────────

describe("createEvent", () => {
  it("appelle createAgendaEvent avec userId et les données, puis refetch", async () => {
    vi.mocked(agendaApi.createAgendaEvent).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const callsBefore = vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length;

    await act(async () => {
      await result.current.createEvent({ titre: "Nouveau", date_iso: "2026-05-12" });
    });

    expect(agendaApi.createAgendaEvent).toHaveBeenCalledWith(
      "uid",
      expect.objectContaining({ titre: "Nouveau" })
    );
    // fetchEvents re-appelé après la création
    expect(vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("userId null → triggerAlert + pas d'appel API", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: null, triggerAlert })
    );
    await act(async () => {});

    await act(async () => {
      await result.current.createEvent({ titre: "Ghost", date_iso: "2026-05-12" });
    });

    expect(agendaApi.createAgendaEvent).not.toHaveBeenCalled();
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("non connecté"));
  });
});

// ─── 4. updateEvent ───────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("appelle updateAgendaEvent avec l'id et les données, puis refetch", async () => {
    vi.mocked(agendaApi.updateAgendaEvent).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const callsBefore = vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length;

    await act(async () => {
      await result.current.updateEvent("e1", { titre: "Modifié" });
    });

    expect(agendaApi.updateAgendaEvent).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({ titre: "Modifié" })
    );
    expect(vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ─── 5. deleteEvent ───────────────────────────────────────────────────────────

describe("deleteEvent", () => {
  it("appelle deleteAgendaEvent avec l'id, puis refetch", async () => {
    vi.mocked(agendaApi.deleteAgendaEvent).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const callsBefore = vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length;

    await act(async () => {
      await result.current.deleteEvent("e1");
    });

    expect(agendaApi.deleteAgendaEvent).toHaveBeenCalledWith("e1");
    expect(vi.mocked(agendaApi.fetchAgendaEvents).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ─── 6. Navigation Mois ───────────────────────────────────────────────────────

describe("navigation mois", () => {
  it("goToPrevMonth décrémente le mois", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const monthBefore = result.current.currentMonth;
    const yearBefore = result.current.currentYear;

    act(() => { result.current.goToPrevMonth(); });

    if (monthBefore === 1) {
      expect(result.current.currentMonth).toBe(12);
      expect(result.current.currentYear).toBe(yearBefore - 1);
    } else {
      expect(result.current.currentMonth).toBe(monthBefore - 1);
      expect(result.current.currentYear).toBe(yearBefore);
    }
  });

  it("goToNextMonth incrémente le mois", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const monthBefore = result.current.currentMonth;
    const yearBefore = result.current.currentYear;

    act(() => { result.current.goToNextMonth(); });

    if (monthBefore === 12) {
      expect(result.current.currentMonth).toBe(1);
      expect(result.current.currentYear).toBe(yearBefore + 1);
    } else {
      expect(result.current.currentMonth).toBe(monthBefore + 1);
      expect(result.current.currentYear).toBe(yearBefore);
    }
  });

  it("goToPrevMonth depuis janvier → décembre de l'année précédente", async () => {
    // On navigue jusqu'à janvier avec un hack propre : appel direct des setters
    // via des navigations successives — mais c'est long. On teste directement
    // en mocquant la date via plusieurs goToPrevMonth depuis le mois courant.
    // Approche pragmatique : forcer mois 1 avec goToNextMonth/goToPrevMonth
    // n'est pas possible sans accès aux setters internes.
    // Le test "goToPrevMonth décrémente le mois" couvre les deux branches
    // (mois === 1 et mois !== 1) dynamiquement selon la date d'exécution.
    // Ce test vérifie explicitement le wrapping janvier→décembre.
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    // Naviguer jusqu'à janvier (au plus 11 fois)
    const stepsToJan = result.current.currentMonth - 1; // 0 si déjà janvier
    for (let i = 0; i < stepsToJan; i++) {
      act(() => { result.current.goToPrevMonth(); });
    }
    // Maintenant on est en janvier
    const yearAtJan = result.current.currentYear;
    act(() => { result.current.goToPrevMonth(); });

    expect(result.current.currentMonth).toBe(12);
    expect(result.current.currentYear).toBe(yearAtJan - 1);
  });

  it("goToNextMonth depuis décembre → janvier de l'année suivante", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const stepsToDecember = 12 - result.current.currentMonth;
    for (let i = 0; i < stepsToDecember; i++) {
      act(() => { result.current.goToNextMonth(); });
    }
    const yearAtDec = result.current.currentYear;
    act(() => { result.current.goToNextMonth(); });

    expect(result.current.currentMonth).toBe(1);
    expect(result.current.currentYear).toBe(yearAtDec + 1);
  });

  it("goToToday remet year/month/weekStart à aujourd'hui", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    act(() => { result.current.goToNextMonth(); });
    act(() => { result.current.goToNextMonth(); });
    act(() => { result.current.goToToday(); });

    const now = new Date();
    expect(result.current.currentYear).toBe(now.getFullYear());
    expect(result.current.currentMonth).toBe(now.getMonth() + 1);
    expect(result.current.currentWeekStart).toBe(getMondayOf(now));
  });
});

// ─── 7. Navigation Semaine ────────────────────────────────────────────────────

describe("navigation semaine", () => {
  it("goToPrevWeek recule d'une semaine (−7 jours)", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const wsBefore = result.current.currentWeekStart;
    act(() => { result.current.goToPrevWeek(); });

    const dBefore = new Date(wsBefore + "T12:00:00");
    const dAfter = new Date(result.current.currentWeekStart + "T12:00:00");
    const diffDays = (dBefore.getTime() - dAfter.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("goToNextWeek avance d'une semaine (+7 jours)", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    const wsBefore = result.current.currentWeekStart;
    act(() => { result.current.goToNextWeek(); });

    const dBefore = new Date(wsBefore + "T12:00:00");
    const dAfter = new Date(result.current.currentWeekStart + "T12:00:00");
    const diffDays = (dAfter.getTime() - dBefore.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("goToNextWeek met aussi à jour currentYear et currentMonth", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    act(() => { result.current.goToNextWeek(); });

    // currentYear/currentMonth doit correspondre à la nouvelle semaine
    const d = new Date(result.current.currentWeekStart + "T12:00:00");
    expect(result.current.currentYear).toBe(d.getFullYear());
    expect(result.current.currentMonth).toBe(d.getMonth() + 1);
  });

  it("goToPrevWeek met aussi à jour currentYear et currentMonth", async () => {
    const { result } = renderHook(() =>
      useAgenda({ userId: "uid", triggerAlert })
    );
    await act(async () => {});

    act(() => { result.current.goToPrevWeek(); });

    const d = new Date(result.current.currentWeekStart + "T12:00:00");
    expect(result.current.currentYear).toBe(d.getFullYear());
    expect(result.current.currentMonth).toBe(d.getMonth() + 1);
  });
});

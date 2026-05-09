import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBilan } from "../../hooks/useBilan";
import type { Mission, FraisDivers } from "../../types/entities";
import type { UseBilanParams } from "../../hooks/useBilanTypes";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn().mockResolvedValue({ id: "test-uid" }),
}));

vi.mock("../../services/bilanRepository", () => ({
  fetchWeeklyBilansHistory: vi.fn().mockResolvedValue([]),
  fetchAcompteAllocationsByPatron: vi.fn().mockResolvedValue([]),
  fetchWeeklyAcompteMetrics: vi.fn().mockResolvedValue({
    allocCetteSemaine: 0,
    totalAlloueJusqua: 0,
    totalAlloueAvant: 0,
    acompteConsommePeriode: 0,
    acomptesCumules: 0,
    acomptesDansPeriode: 0,
  }),
  fetchBilanByPeriodAndPatron: vi.fn().mockResolvedValue(null),
  insertBilanRow: vi.fn().mockResolvedValue(undefined),
  updateBilanRowById: vi.fn().mockResolvedValue(undefined),
  fetchLatestBilanStatus: vi.fn().mockResolvedValue(null),
  fetchUnpaidWeeklyBilansBefore: vi.fn().mockResolvedValue([]),
  fetchAcompteAllocationsBefore: vi.fn().mockResolvedValue([]),
  fetchAcompteAmountsBefore: vi.fn().mockResolvedValue([]),
  fetchWeeklyBilansForRepair: vi.fn().mockResolvedValue([]),
  upsertFraisKmRows: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../hooks/useBilanWeather", () => ({
  enrichWithWeather: vi.fn().mockImplementation((missions: Mission[]) =>
    Promise.resolve(missions)
  ),
}));

vi.mock("../../hooks/useBilanKm", () => ({
  computeKmItems: vi.fn().mockReturnValue({ items: [], totalKm: 0, totalAmount: 0 }),
  useBilanKm: vi.fn().mockReturnValue({
    isRecalculatingKm: false,
    recalculerFraisKm: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../utils/bilanLogger", () => ({
  logBilanError: vi.fn(),
}));

// ─── Imports après mocks (Vitest hisse les vi.mock) ──────────────────────────

import * as bilanRepository from "../../services/bilanRepository";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    user_id: "test-uid",
    patron_id: null,
    client_id: null,
    lieu_id: null,
    client: null,
    lieu: null,
    date_mission: "2026-01-05",
    date_iso: "2026-01-05",
    debut: "09:00",
    fin: "11:00",
    duree: 2,
    pause: 0,
    montant: 40,
    tarif: 20,
    ...overrides,
  };
}

function makeParams(
  missions: Mission[],
  overrides: Partial<UseBilanParams> = {}
): UseBilanParams {
  return {
    missions,
    fraisDivers: [] as FraisDivers[],
    patrons: [],
    getMissionsByWeek: () => missions,
    getMissionsByPeriod: () => missions,
    getFraisByWeek: () => [],
    getTotalFrais: () => 0,
    getSoldeAvant: () => 0,
    getAcomptesDansPeriode: () => 0,
    getTotalAcomptesJusqua: () => 0,
    triggerAlert: vi.fn(),
    kmSettings: null,
    domicileLatLng: null,
    lieux: [],
    ...overrides,
  };
}

// ─── 1. Période vide ─────────────────────────────────────────────────────────

describe("genererBilan — période vide", () => {
  it("alerte si bilanPeriodValue est vide et ne génère pas le bilan", async () => {
    const triggerAlert = vi.fn();
    const { result } = renderHook(() => useBilan(makeParams([], { triggerAlert })));

    // Ne pas définir bilanPeriodValue — reste vide par défaut
    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("période"));
    expect(result.current.showBilan).toBe(false);
  });
});

// ─── 2 & 3. Aucune mission ───────────────────────────────────────────────────

describe("genererBilan — aucune mission", () => {
  beforeEach(() => {
    vi.mocked(bilanRepository.fetchWeeklyAcompteMetrics).mockResolvedValue({
      allocCetteSemaine: 0,
      totalAlloueJusqua: 0,
      totalAlloueAvant: 0,
      acompteConsommePeriode: 0,
      acomptesCumules: 0,
      acomptesDansPeriode: 0,
    });
  });

  it("alerte et laisse showBilan à false en SEMAINE sans mission", async () => {
    const triggerAlert = vi.fn();
    const { result } = renderHook(() =>
      useBilan(makeParams([], { triggerAlert, getMissionsByPeriod: () => [] }))
    );

    await act(async () => {
      result.current.setBilanPeriodType("semaine");
      result.current.setBilanPeriodValue("2");
    });

    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucune mission"));
    expect(result.current.showBilan).toBe(false);
  });

  it("alerte et laisse showBilan à false en MOIS sans mission", async () => {
    const triggerAlert = vi.fn();
    const { result } = renderHook(() =>
      useBilan(makeParams([], { triggerAlert, getMissionsByPeriod: () => [] }))
    );

    await act(async () => {
      result.current.setBilanPeriodType("mois");
      result.current.setBilanPeriodValue("2026-01");
    });

    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucune mission"));
    expect(result.current.showBilan).toBe(false);
  });
});

// ─── 4 & 5. Calculs financiers ───────────────────────────────────────────────

describe("genererBilan — calculs financiers (SEMAINE)", () => {
  beforeEach(() => {
    vi.mocked(bilanRepository.fetchWeeklyAcompteMetrics).mockResolvedValue({
      allocCetteSemaine: 0,
      totalAlloueJusqua: 0,
      totalAlloueAvant: 0,
      acompteConsommePeriode: 0,
      acomptesCumules: 0,
      acomptesDansPeriode: 0,
    });
  });

  it("ouvre le bilan avec totalE et totalH corrects pour 2 missions", async () => {
    const m1 = makeMission({ id: "m1", montant: 40, duree: 2 });
    const m2 = makeMission({ id: "m2", montant: 40, duree: 2, date_iso: "2026-01-06", date_mission: "2026-01-06" });
    const missions = [m1, m2];

    const { result } = renderHook(() =>
      useBilan(makeParams(missions, { getMissionsByPeriod: () => missions }))
    );

    await act(async () => {
      result.current.setBilanPeriodType("semaine");
      result.current.setBilanPeriodValue("2");
    });

    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.totalE).toBe(80);
    expect(result.current.bilanContent.totalH).toBe(4);
    expect(result.current.bilanContent.resteAPercevoir).toBeGreaterThanOrEqual(0);
  });

  it("resteAPercevoir vaut 0 quand l'acompte alloué dépasse le CA", async () => {
    const m = makeMission({ id: "m1", montant: 100, duree: 5 });

    // Simuler un acompte de 150 € pour un CA de 100 €
    vi.mocked(bilanRepository.fetchWeeklyAcompteMetrics).mockResolvedValueOnce({
      allocCetteSemaine: 150,
      totalAlloueJusqua: 150,
      totalAlloueAvant: 0,
      acompteConsommePeriode: 150,
      acomptesCumules: 150,
      acomptesDansPeriode: 0,
    });

    const { result } = renderHook(() =>
      useBilan(makeParams([m], { getMissionsByPeriod: () => [m] }))
    );

    await act(async () => {
      result.current.setBilanPeriodType("semaine");
      result.current.setBilanPeriodValue("2");
    });

    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.resteAPercevoir).toBe(0);
  });
});

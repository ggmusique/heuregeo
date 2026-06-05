import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBilan } from "../../hooks/useBilan";
import type { Mission, FraisDivers } from "../../types/entities";
import type { UseBilanParams } from "../../hooks/useBilanTypes";
import { getWeekStartDate } from "../../utils/dateUtils";

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

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function runWeeklyBilan(input: {
  missions: Mission[];
  weekValue: string;
  profileFeatures?: UseBilanParams["profileFeatures"];
}) {
  const { result } = renderHook(() =>
    useBilan(
      makeParams(input.missions, {
        getMissionsByPeriod: () => input.missions,
        profileFeatures: input.profileFeatures,
      }),
    ),
  );

  await act(async () => {
    result.current.setBilanPeriodType("semaine");
    result.current.setBilanPeriodValue(input.weekValue);
  });

  await act(async () => {
    await result.current.genererBilan(null);
  });

  return result;
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

describe("useBilan — contrat actif selon contract_active_since", () => {
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

  it("A1 — semaine avant activation: pas de quota appliqué", async () => {
    const year = new Date().getFullYear();
    const weekValue = "10";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const activeSince = addDays(weekStart, 7);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "banque",
        surplus_split_pct: 0,
        contract_active_since: activeSince,
      },
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.contractSummary?.mode).toBe("free");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(0);
    expect(result.current.bilanContent.totalE).toBe(240);
  });

  it("A2 — semaine avant activation: overflow_rule ignorée", async () => {
    const year = new Date().getFullYear();
    const weekValue = "11";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "banque",
        surplus_split_pct: 0,
        contract_active_since: addDays(weekStart, 7),
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("free");
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(12);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);
  });

  it("A3 — semaine avant activation: resteAPercevoir = missions brutes", async () => {
    const year = new Date().getFullYear();
    const weekValue = "12";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 8,
      montant: 160,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 6,
        surplus_rule: "les_deux",
        surplus_split_pct: 30,
        contract_active_since: addDays(weekStart, 7),
      },
    });

    expect(result.current.bilanContent.totalE).toBe(160);
    expect(result.current.bilanContent.resteAPercevoir).toBe(160);
  });

  it("A4 — semaine avant activation: aucun overtime_to_reserve", async () => {
    const year = new Date().getFullYear();
    const weekValue = "13";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 14,
      montant: 280,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "banque",
        surplus_split_pct: 0,
        contract_active_since: addDays(weekStart, 7),
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("free");
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(0);
  });

  it("B1 — après activation: mode tout payable = 100% heures sup payées", async () => {
    const year = new Date().getFullYear();
    const weekValue = "14";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(2);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);
    expect(result.current.bilanContent.totalE).toBe(40);
    expect(result.current.bilanContent.resteAPercevoir).toBe(40);
  });

  it("B2 — après activation: mode tout en banque = 100% heures sup en réserve", async () => {
    const year = new Date().getFullYear();
    const weekValue = "15";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "banque",
        surplus_split_pct: 0,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(2);
    expect(result.current.bilanContent.totalE).toBe(0);
    expect(result.current.bilanContent.resteAPercevoir).toBe(0);
  });

  it("B3 — après activation: mode mixte = split selon ratio", async () => {
    const year = new Date().getFullYear();
    const weekValue = "16";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 30,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(0.6);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(1.4);
    expect(result.current.bilanContent.totalE).toBe(12);
    expect(result.current.bilanContent.resteAPercevoir).toBe(12);
  });

  it("B4 — quota respecté: pas d'heures sup", async () => {
    const year = new Date().getFullYear();
    const weekValue = "17";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 10,
      montant: 200,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);
  });

  it("C1 — semaine égale à contract_active_since: contrat actif", async () => {
    const year = new Date().getFullYear();
    const weekValue = "18";
    const weekStart = getWeekStartDate(Number(weekValue), year);
    const mission = makeMission({
      date_iso: weekStart,
      date_mission: weekStart,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const result = await runWeeklyBilan({
      missions: [mission],
      weekValue,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(2);
  });

  it("C2 — 0h travaillées après activation et aucune mission: pas de déficit calculé", async () => {
    const triggerAlert = vi.fn();
    const year = new Date().getFullYear();
    const weekValue = "19";
    const weekStart = getWeekStartDate(Number(weekValue), year);

    const { result } = renderHook(() =>
      useBilan(
        makeParams([], {
          triggerAlert,
          getMissionsByPeriod: () => [],
          profileFeatures: {
            plan: "pro",
            contract_active: true,
            contract_hours_week: 10,
            surplus_rule: "payable",
            contract_active_since: weekStart,
          },
        }),
      ),
    );

    await act(async () => {
      result.current.setBilanPeriodType("semaine");
      result.current.setBilanPeriodValue(weekValue);
    });

    await act(async () => {
      await result.current.genererBilan(null);
    });

    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucune mission"));
    expect(result.current.showBilan).toBe(false);
  });

  it("C3 — frontière S52/S1: comparaison basée sur la date de début ISO semaine", async () => {
    const year = new Date().getFullYear();
    const week1Start = getWeekStartDate(1, year);
    const activeSince = `${year}-01-01`;

    const missionW1 = makeMission({
      id: "w1",
      date_iso: activeSince,
      date_mission: activeSince,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const w1 = await runWeeklyBilan({
      missions: [missionW1],
      weekValue: "1",
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: activeSince,
      },
    });

    // Semaine chevauchant l'activation : finPeriode >= activeSince → mode pro
    expect(w1.current.bilanContent.contractSummary?.mode).toBe("pro");

    const week52Start = getWeekStartDate(52, year);
    const missionW52 = makeMission({
      id: "w52",
      date_iso: week52Start,
      date_mission: week52Start,
      duree: 12,
      montant: 240,
      tarif: 20,
    });

    const w52 = await runWeeklyBilan({
      missions: [missionW52],
      weekValue: "52",
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: activeSince,
      },
    });

    expect(w52.current.bilanContent.contractSummary?.mode).toBe("pro");
  });
});

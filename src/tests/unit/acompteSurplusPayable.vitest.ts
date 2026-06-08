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
  enrichWithWeather: vi.fn().mockImplementation((missions: Mission[]) => Promise.resolve(missions)),
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

interface AcompteMetrics {
  allocCetteSemaine: number;
  totalAlloueJusqua: number;
  totalAlloueAvant: number;
  acompteConsommePeriode: number;
  acomptesCumules: number;
  acomptesDansPeriode: number;
}

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
    fin: "21:00",
    duree: 12,
    pause: 0,
    montant: 240,
    tarif: 20,
    ...overrides,
  };
}

function makeParams(missions: Mission[], overrides: Partial<UseBilanParams> = {}): UseBilanParams {
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

async function runWeeklyBilan(input: {
  missions: Mission[];
  weekValue: string;
  profileFeatures: UseBilanParams["profileFeatures"];
  metrics: AcompteMetrics;
}) {
  vi.mocked(bilanRepository.fetchWeeklyAcompteMetrics).mockResolvedValue(input.metrics);

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

// ─── Tests : l'acompte se déduit du surplus PAYABLE, pas du total missions ───

describe("useBilan — acompte imputé sur le surplus payable (mode contrat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("déduit l'acompte du surplus payable et NON du total missions brut", async () => {
    // 12h travaillées, quota 10h, tout payable -> 2h payables x 20 EUR/h = 40 EUR de surplus.
    // Un acompte de 30 EUR est imputé sur cette semaine.
    const result = await runWeeklyBilan({
      missions: [makeMission()],
      weekValue: "2",
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: null,
      },
      metrics: {
        allocCetteSemaine: 30,
        totalAlloueJusqua: 30,
        totalAlloueAvant: 0,
        acompteConsommePeriode: 30,
        acomptesCumules: 30,
        acomptesDansPeriode: 0,
      },
    });

    expect(result.current.showBilan).toBe(true);
    // Le CA de la période = surplus payable (40 EUR), pas les 240 EUR bruts.
    expect(result.current.bilanContent.totalE).toBe(40);
    expect(result.current.bilanContent.totalMissionsReel).toBe(240);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(2);
    expect(result.current.bilanContent.contractSummary?.surplusGrossAmount).toBe(40);
    // Reste = 40 - 30 = 10 EUR. (Si l'acompte se deduisait du brut : 240 - 30 = 210.)
    expect(result.current.bilanContent.resteAPercevoir).toBe(10);
    expect(result.current.bilanContent.soldeAcomptesAvant).toBe(30);
    expect(result.current.bilanContent.soldeAcomptesApres).toBe(0);
  });

  it("plafonne la consommation au surplus payable : l'excedent reste en solde d'acompte", async () => {
    // Acompte de 100 EUR mais surplus payable de seulement 40 EUR -> 40 consommes, 60 restants.
    const result = await runWeeklyBilan({
      missions: [makeMission()],
      weekValue: "2",
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: null,
      },
      metrics: {
        allocCetteSemaine: 40,
        totalAlloueJusqua: 40,
        totalAlloueAvant: 0,
        acompteConsommePeriode: 40,
        acomptesCumules: 100,
        acomptesDansPeriode: 0,
      },
    });

    expect(result.current.bilanContent.totalE).toBe(40);
    expect(result.current.bilanContent.resteAPercevoir).toBe(0);
    // 100 EUR verses - 40 EUR imputables = 60 EUR d'acompte encore disponible.
    expect(result.current.bilanContent.soldeAcomptesApres).toBe(60);
  });

  it("mode tout-en-banque : surplus payable nul, l'acompte n'est pas consomme", async () => {
    // 12h, quota 10h, 100% en reserve -> 0h payable, CA = 0.
    const result = await runWeeklyBilan({
      missions: [makeMission()],
      weekValue: "2",
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "banque",
        surplus_split_pct: 0,
        contract_active_since: null,
      },
      metrics: {
        allocCetteSemaine: 0,
        totalAlloueJusqua: 0,
        totalAlloueAvant: 0,
        acompteConsommePeriode: 0,
        acomptesCumules: 50,
        acomptesDansPeriode: 0,
      },
    });

    expect(result.current.bilanContent.totalE).toBe(0);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(2);
    expect(result.current.bilanContent.resteAPercevoir).toBe(0);
    // L'acompte (50 EUR) reste entierement disponible : rien de payable a eponger.
    expect(result.current.bilanContent.soldeAcomptesApres).toBe(50);
  });
});

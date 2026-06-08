/**
 * contractMonthYearActivation.vitest.ts
 *
 * Non-régression : la garde contract_active_since doit aussi s'appliquer aux
 * bilans MOIS et ANNÉE. Avant le correctif, toutes les semaines d'un mois/année
 * étaient traitées comme sous contrat, mettant à tort des heures en banque pour
 * les semaines antérieures à l'activation (ex: avril alors que le contrat
 * démarre en mai).
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBilan } from "../../hooks/useBilan";
import type { UseBilanParams } from "../../hooks/useBilanTypes";
import type { FraisDivers, Mission } from "../../types/entities";

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
  fetchUnpaidWeeklyBilansBefore: vi.fn().mockResolvedValue([]),
  fetchAcompteAllocationsBefore: vi.fn().mockResolvedValue([]),
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

function makeMission(overrides: Partial<Mission>): Mission {
  return {
    id: overrides.id ?? "m1",
    user_id: "test-uid",
    patron_id: null,
    client_id: null,
    lieu_id: null,
    client: null,
    lieu: null,
    date_mission: overrides.date_mission ?? "2026-04-06",
    date_iso: overrides.date_iso ?? "2026-04-06",
    debut: "09:00",
    fin: "17:00",
    duree: overrides.duree ?? 8,
    pause: 0,
    montant: overrides.montant ?? 140,
    tarif: overrides.tarif ?? 17.5,
    ...overrides,
  };
}

function makeParams(
  missions: Mission[],
  profileFeatures: UseBilanParams["profileFeatures"],
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
    profileFeatures,
  };
}

async function runBilan(input: {
  periodType: "mois" | "annee";
  periodValue: string;
  missions: Mission[];
  profileFeatures: UseBilanParams["profileFeatures"];
}) {
  const { result } = renderHook(() => useBilan(makeParams(input.missions, input.profileFeatures)));

  await act(async () => {
    result.current.setBilanPeriodType(input.periodType);
    result.current.setBilanPeriodValue(input.periodValue);
  });

  await act(async () => {
    await result.current.genererBilan(null);
  });

  return result;
}

describe("contract_active_since — agrégation mois / année", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("MOIS avril (avant activation mai): 0h en banque, toutes les heures payables", async () => {
    const missionsAvril = [
      makeMission({ id: "a1", date_mission: "2026-04-06", date_iso: "2026-04-06", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "a2", date_mission: "2026-04-07", date_iso: "2026-04-07", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "a3", date_mission: "2026-04-08", date_iso: "2026-04-08", duree: 8, montant: 140 }),
    ];

    const result = await runBilan({
      periodType: "mois",
      periodValue: "2026-04",
      missions: missionsAvril,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-12",
      },
    });

    expect(result.current.bilanContent.totalH).toBe(25);
    // Cur de la non-régression : aucune heure en banque pour un mois pré-activation.
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(25);
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(0);
    expect(result.current.bilanContent.totalE).toBeCloseTo(437.5, 6);
  });

  it("ANNÉE 2026: seules les semaines à partir de mai alimentent la banque", async () => {
    const missions = [
      // Semaine d'avril — avant activation → mode free, pas de banque.
      makeMission({ id: "a1", date_mission: "2026-04-06", date_iso: "2026-04-06", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "a2", date_mission: "2026-04-07", date_iso: "2026-04-07", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "a3", date_mission: "2026-04-08", date_iso: "2026-04-08", duree: 8, montant: 140 }),
      // Semaine de mai — après activation → contrat, surplus 15h réparti 50/50.
      makeMission({ id: "m1", date_mission: "2026-05-18", date_iso: "2026-05-18", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "m2", date_mission: "2026-05-19", date_iso: "2026-05-19", duree: 8.5, montant: 148.75 }),
      makeMission({ id: "m3", date_mission: "2026-05-20", date_iso: "2026-05-20", duree: 8, montant: 140 }),
    ];

    const result = await runBilan({
      periodType: "annee",
      periodValue: "2026",
      missions,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-12",
      },
    });

    expect(result.current.bilanContent.totalH).toBe(50);
    // Seule la semaine de mai (surplus 15h, les_deux 50/50) met 7.5h en banque.
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(7.5);
    // Avril (25h payables en free) + mai (7.5h payables) = 32.5h.
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(32.5);
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(15);
  });
});

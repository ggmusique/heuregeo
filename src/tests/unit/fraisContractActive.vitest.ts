/**
 * fraisContractActive.vitest.ts
 *
 * Point 3 de l'audit : comportement des frais en mode contrat.
 *  - en mode pro, les frais s'ajoutent au caBrutPeriode PAR-DESSUS le surplus
 *    payable (et non par-dessus le total missions brut)
 *  - en pre-activation (mode free), les frais s'ajoutent au total missions brut
 *  - les frais d'une semaine impayee se reportent via impayePrecedent
 *  - une fois la semaine payee, elle sort de l'impaye (les frais ne se
 *    reportent plus)
 *
 * Le repository (Supabase) est mocke ; useBilanDB tourne pour de vrai et lit
 * l'impaye via fetchUnpaidWeeklyBilansBefore (mocke par test).
 *
 * Execution :
 *   npm run test:hooks -- fraisContractActive
 */

import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBilan } from "../../hooks/useBilan";
import type { Mission, FraisDivers } from "../../types/entities";
import type { UseBilanParams } from "../../hooks/useBilanTypes";
import { getWeekStartDate } from "../../utils/dateUtils";

// --- Mocks ---------------------------------------------------------------------

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

import * as bilanRepository from "../../services/bilanRepository";

// --- Factories -----------------------------------------------------------------

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

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function runWeeklyBilan(input: {
  missions: Mission[];
  weekValue: string;
  totalFrais?: number;
  profileFeatures?: UseBilanParams["profileFeatures"];
}) {
  const frais = input.totalFrais ?? 0;
  const { result } = renderHook(() =>
    useBilan(
      makeParams(input.missions, {
        getMissionsByPeriod: () => input.missions,
        getTotalFrais: () => frais,
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

const YEAR = new Date().getFullYear();

beforeEach(() => {
  vi.mocked(bilanRepository.fetchWeeklyAcompteMetrics).mockResolvedValue({
    allocCetteSemaine: 0,
    totalAlloueJusqua: 0,
    totalAlloueAvant: 0,
    acompteConsommePeriode: 0,
    acomptesCumules: 0,
    acomptesDansPeriode: 0,
  });
  vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([]);
  vi.mocked(bilanRepository.fetchAcompteAllocationsBefore).mockResolvedValue([]);
});

// --- Tests ---------------------------------------------------------------------

describe("Frais + contrat actif (mode pro)", () => {
  it("ajoute les frais PAR-DESSUS le surplus payable, pas par-dessus le total brut", async () => {
    const weekValue = "20";
    const weekStart = getWeekStartDate(Number(weekValue), YEAR);
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
      totalFrais: 25,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    // surplus payable = 2h * 20 EUR = 40 ; frais = 25 ; caBrut = 65 (et NON 240 + 25)
    expect(result.current.bilanContent.contractSummary?.surplusGrossAmount).toBe(40);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(2);
    expect(result.current.bilanContent.totalE).toBe(65);
    expect(result.current.bilanContent.totalFrais).toBe(25);
    expect(result.current.bilanContent.contractSummary?.fraisRemboursablesAmount).toBe(25);
    // le total missions reel reste 240 (info), independant du caBrut
    expect(result.current.bilanContent.totalMissionsReel).toBe(240);
    expect(result.current.bilanContent.resteAPercevoir).toBe(65);
  });
});

describe("Frais + semaine pre-activation (mode free)", () => {
  it("ajoute les frais au total missions brut quand le contrat n'est pas encore actif", async () => {
    const weekValue = "21";
    const weekStart = getWeekStartDate(Number(weekValue), YEAR);
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
      totalFrais: 25,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: addDays(weekStart, 7),
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("free");
    // mode free : caBrut = 240 (brut) + 25 (frais) = 265
    expect(result.current.bilanContent.contractSummary?.surplusGrossAmount).toBe(240);
    expect(result.current.bilanContent.totalE).toBe(265);
    expect(result.current.bilanContent.totalFrais).toBe(25);
    expect(result.current.bilanContent.resteAPercevoir).toBe(265);
  });
});

describe("Frais reportes via l'impaye", () => {
  it("reporte une semaine impayee (frais inclus) dans le resteAPercevoir courant", async () => {
    // semaine precedente impayee : caBrut 60 (incl. ses frais), aucune alloc
    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([
      { ca_brut_periode: 60, periode_index: 19 },
    ] as unknown as Awaited<ReturnType<typeof bilanRepository.fetchUnpaidWeeklyBilansBefore>>);

    const weekValue = "20";
    const weekStart = getWeekStartDate(Number(weekValue), YEAR);
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
      totalFrais: 0,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    // caBrut courant = surplus payable 40 ; impaye precedent = 60
    expect(result.current.bilanContent.totalE).toBe(40);
    expect(result.current.bilanContent.impayePrecedent).toBe(60);
    // reste = 60 (reporte) + 40 (courant) = 100
    expect(result.current.bilanContent.resteAPercevoir).toBe(100);
  });

  it("une fois la semaine precedente payee, elle sort de l'impaye (frais non reportes)", async () => {
    // semaine precedente payee -> exclue de fetchUnpaidWeeklyBilansBefore -> []
    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([]);

    const weekValue = "22";
    const weekStart = getWeekStartDate(Number(weekValue), YEAR);
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
      totalFrais: 0,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "payable",
        surplus_split_pct: 100,
        contract_active_since: weekStart,
      },
    });

    expect(result.current.bilanContent.impayePrecedent).toBe(0);
    expect(result.current.bilanContent.totalE).toBe(40);
    expect(result.current.bilanContent.resteAPercevoir).toBe(40);
  });
});

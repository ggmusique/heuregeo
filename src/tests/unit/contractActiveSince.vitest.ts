import React from "react";
import { renderHook, render, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { useBilan } from "../../hooks/useBilan";
import type { UseBilanParams } from "../../hooks/useBilanTypes";
import type { FraisDivers, Mission } from "../../types/entities";
import * as bilanRepository from "../../services/bilanRepository";
import { BilanTab } from "../../pages/BilanTab";

const testMocks = vi.hoisted(() => ({
  syncWeeklySettlement: vi.fn(),
  useReserve: vi.fn(),
  usePermissions: vi.fn(),
}));

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

vi.mock("../../contexts/LabelsContext", () => ({
  useLabels: vi.fn().mockReturnValue({}),
}));

vi.mock("../../contexts/PermissionsContext", () => ({
  usePermissions: testMocks.usePermissions,
}));

vi.mock("../../features/contracts/reserve", () => ({
  useReserve: testMocks.useReserve,
}));

vi.mock("../../components/mission/MissionCard", () => ({
  MissionCard: () => null,
}));

vi.mock("../../components/bilan/RapportBilanVisualV1", () => ({
  RapportBilanVisualV1: () => null,
}));

vi.mock("../../components/common/WhatsAppSecureModal", () => ({
  WhatsAppSecureModal: () => null,
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
    date_mission: overrides.date_mission ?? "2026-05-26",
    date_iso: overrides.date_iso ?? "2026-05-26",
    debut: "09:00",
    fin: "17:00",
    duree: overrides.duree ?? 8,
    pause: 0,
    montant: overrides.montant ?? 140,
    tarif: overrides.tarif ?? 17.5,
    ...overrides,
  };
}

function makeBilanTabProps(weekValue: string) {
  const bilan = {
    showBilan: true,
    setShowBilan: vi.fn(),
    showPeriodModal: false,
    setShowPeriodModal: vi.fn(),
    bilanPeriodType: "semaine",
    setBilanPeriodType: vi.fn(),
    bilanPeriodValue: weekValue,
    setBilanPeriodValue: vi.fn(),
    availablePeriods: [weekValue],
    bilanPaye: false,
    bilanContent: {
      totalH: 0,
      totalE: 0,
      totalAcomptes: 0,
      totalFrais: 0,
      filteredData: [],
      fraisDivers: [],
      fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
    },
    isRecalculatingKm: false,
    formatPeriodLabel: (val: string | number) => String(val),
    calculerPeriodesDisponibles: vi.fn(),
    genererBilan: vi.fn(),
    marquerCommePaye: vi.fn(),
    autoPayerBilans: vi.fn(),
    fetchHistoriqueBilans: vi.fn(),
    gotoPreviousWeek: vi.fn(),
    gotoNextWeek: vi.fn(),
    hasPreviousWeek: false,
    hasNextWeek: false,
    handleWeekChange: vi.fn(),
    recalculerFraisKm: vi.fn(),
    rebuildBilans: vi.fn(),
    repairBilansDB: vi.fn(),
  };

  return {
    bilan: bilan as unknown as ReturnType<typeof useBilan>,
    bilanPatronId: null,
    currentWeek: Number(weekValue),
    missionsThisWeek: [],
    patrons: [],
    getPatronNom: () => "",
    getPatronColor: () => "",
    profile: {
      id: "test-uid",
      role: "admin",
      features: { contract_active_since: "2026-05-12" },
      is_admin: true,
      patron_id: null,
    },
  };
}

function makePermissions(activeSince: string | null) {
  return {
    contract: {
      source: { mode: "pro", isPro: true, activeSince },
      isViewer: false,
      contractType: "cdi",
      hoursPerWeek: 10,
      surplusRule: "les_deux",
      surplusSplitPct: 50,
      weeklyQuotaHours: 10,
      reserveEnabled: true,
      payableRule: "capped_quota",
      overflowRule: "to_reserve",
      visibility: {
        suivi: { showReserveTab: true },
        bilan: {
          showOvertimeKpi: true,
          showPayableHoursKpi: true,
          showReserveKpi: true,
        },
      },
    },
    isViewer: false,
    viewerPatronId: null,
    isAdmin: true,
    isPro: true,
    canBilanMois: true,
    canBilanAnnee: true,
    canExportPDF: true,
    canExportExcel: true,
    canExportCSV: true,
    canKilometrage: true,
    canAgenda: true,
    canFacture: true,
    canDashboard: true,
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

async function runWeeklyBilan(input: {
  weekValue: string;
  missions: Mission[];
  profileFeatures: UseBilanParams["profileFeatures"];
}) {
  const { result } = renderHook(() =>
    useBilan(makeParams(input.missions, input.profileFeatures)),
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

describe("contract_active_since — scénarios métier", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    vi.clearAllMocks();

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

    testMocks.syncWeeklySettlement.mockReset();
    testMocks.useReserve.mockReturnValue({
      loading: false,
      saving: false,
      error: null,
      balanceHours: 0,
      movements: [],
      refresh: vi.fn(),
      addMovement: vi.fn(),
      removeMovement: vi.fn(),
      syncWeeklySettlement: testMocks.syncWeeklySettlement,
      getFilteredHistory: vi.fn(),
    });
    testMocks.usePermissions.mockReturnValue(makePermissions("2026-05-12"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TEST 1A — S19 avant activation: mode sans contrat, 3 missions visibles", async () => {
    const missionsS19 = [
      makeMission({ id: "s19-1", date_mission: "2026-05-05", date_iso: "2026-05-05", duree: 6.5, montant: 113.75, tarif: 17.5 }),
      makeMission({ id: "s19-2", date_mission: "2026-05-06", date_iso: "2026-05-06", duree: 7.5, montant: 131.25, tarif: 17.5 }),
      makeMission({ id: "s19-3", date_mission: "2026-05-07", date_iso: "2026-05-07", duree: 6, montant: 105, tarif: 17.5 }),
    ];

    const result = await runWeeklyBilan({
      weekValue: "19",
      missions: missionsS19,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-12",
      },
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.totalH).toBe(20);
    expect(result.current.bilanContent.totalE).toBe(350);
    expect(result.current.bilanContent.resteAPercevoir).toBe(350);
    expect(result.current.bilanContent.impayePrecedent).toBe(0);

    expect(result.current.bilanContent.contractSummary?.mode).toBe("free");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(0);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(0);

    expect(result.current.bilanContent.filteredData).toHaveLength(3);
    expect(result.current.bilanContent.filteredData.map((m) => m.montant)).toEqual([113.75, 131.25, 105]);
  });

  it("TEST 1B — S22 après activation: split 50/50 + impayé S19 reporté", async () => {
    const missionsS22 = [
      makeMission({ id: "s22-1", date_mission: "2026-05-26", date_iso: "2026-05-26", duree: 8.5, montant: 148.75, tarif: 17.5 }),
      makeMission({ id: "s22-2", date_mission: "2026-05-27", date_iso: "2026-05-27", duree: 8.5, montant: 148.75, tarif: 17.5 }),
    ];

    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValueOnce([
      {
        periode_index: 19,
        ca_brut_periode: 350,
        acompte_consomme: 0,
        reste_a_percevoir: 350,
        paye: false,
      } as unknown as Record<string, unknown>,
    ]);
    vi.mocked(bilanRepository.fetchAcompteAllocationsBefore).mockResolvedValueOnce([]);

    const result = await runWeeklyBilan({
      weekValue: "22",
      missions: missionsS22,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-12",
      },
    });

    expect(result.current.showBilan).toBe(true);
    expect(result.current.bilanContent.totalH).toBe(17);
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(7);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(3.5);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(3.5);
    expect(result.current.bilanContent.totalE).toBeCloseTo(61.25, 6);
    expect(result.current.bilanContent.resteAPercevoir).toBeCloseTo(411.25, 6);
    expect(result.current.bilanContent.impayePrecedent).toBe(350);
    expect(result.current.bilanContent.filteredData).toHaveLength(2);
    expect(result.current.bilanContent.filteredData.map((m) => m.montant)).toEqual([148.75, 148.75]);
  });

  it("TEST 2 — S22 post-activation: 17h, quota 10h, les_deux => 3.5h payables + 3.5h banque", async () => {
    const missionsS22 = [
      makeMission({ id: "s22-1", date_mission: "2026-05-26", date_iso: "2026-05-26", duree: 8.5, montant: 148.75, tarif: 17.5 }),
      makeMission({ id: "s22-2", date_mission: "2026-05-27", date_iso: "2026-05-27", duree: 8.5, montant: 148.75, tarif: 17.5 }),
    ];

    const result = await runWeeklyBilan({
      weekValue: "22",
      missions: missionsS22,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-12",
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(7);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(3.5);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(3.5);
  });

  it("TEST 3 — contract_active_since absent: comportement inchangé (pas de régression)", async () => {
    const missionsS22 = [
      makeMission({ id: "s22-1", date_mission: "2026-05-26", date_iso: "2026-05-26", duree: 8.5, montant: 148.75, tarif: 17.5 }),
      makeMission({ id: "s22-2", date_mission: "2026-05-27", date_iso: "2026-05-27", duree: 8.5, montant: 148.75, tarif: 17.5 }),
    ];

    const result = await runWeeklyBilan({
      weekValue: "22",
      missions: missionsS22,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: null,
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(7);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(3.5);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(3.5);
    expect(result.current.bilanContent.totalE).toBeCloseTo(61.25, 6);
  });

  it("TEST 4 — semaine = date d'activation: activation incluse", async () => {
    const missionsS22 = [
      makeMission({ id: "s22-1", date_mission: "2026-05-26", date_iso: "2026-05-26", duree: 8.5, montant: 148.75, tarif: 17.5 }),
      makeMission({ id: "s22-2", date_mission: "2026-05-27", date_iso: "2026-05-27", duree: 8.5, montant: 148.75, tarif: 17.5 }),
    ];

    const result = await runWeeklyBilan({
      weekValue: "22",
      missions: missionsS22,
      profileFeatures: {
        plan: "pro",
        contract_active: true,
        contract_hours_week: 10,
        surplus_rule: "les_deux",
        surplus_split_pct: 50,
        contract_active_since: "2026-05-26",
      },
    });

    expect(result.current.bilanContent.contractSummary?.mode).toBe("pro");
    expect(result.current.bilanContent.contractSummary?.quotaOverflowHours).toBe(7);
    expect(result.current.bilanContent.contractSummary?.payableHours).toBe(3.5);
    expect(result.current.bilanContent.contractSummary?.reserveHours).toBe(3.5);
  });

  it("TEST 5 — syncWeeklySettlement ne doit pas être appelé pour une semaine antérieure à contract_active_since", async () => {
    render(React.createElement(BilanTab, makeBilanTabProps("19")));

    await act(async () => {
      await Promise.resolve();
    });

    expect(testMocks.syncWeeklySettlement).not.toHaveBeenCalled();
  });

  it("TEST 6 — syncWeeklySettlement doit être appelé pour S22", async () => {
    render(React.createElement(BilanTab, makeBilanTabProps("22")));

    await act(async () => {
      await Promise.resolve();
    });

    expect(testMocks.syncWeeklySettlement).toHaveBeenCalledTimes(1);
  });
});

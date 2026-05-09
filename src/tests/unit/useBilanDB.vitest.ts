import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBilanDB } from "../../hooks/useBilanDB";
import type { BilanContent } from "../../types/bilan";
import type { Patron } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../../services/bilanRepository", () => ({
  fetchLatestBilanStatus: vi.fn(),
  fetchUnpaidWeeklyBilansBefore: vi.fn(),
  fetchAcompteAllocationsBefore: vi.fn(),
  fetchAcompteAmountsBefore: vi.fn(),
  fetchAcompteAllocationsByPatron: vi.fn(),
  fetchWeeklyBilansForRepair: vi.fn(),
  fetchBilanByPeriodAndPatron: vi.fn(),
  insertBilanRow: vi.fn().mockResolvedValue(undefined),
  updateBilanRowById: vi.fn().mockResolvedValue(undefined),
}));

import * as authService from "../../services/authService";
import * as bilanRepository from "../../services/bilanRepository";

// Réinitialise les compteurs d'appels entre chaque test (pas les implémentations)
beforeEach(() => vi.clearAllMocks());

// ─── Constantes ───────────────────────────────────────────────────────────────

const MOCK_USER = { id: "test-uid" };
const PATRON_ID = "patron-abc";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBilanContent(overrides: Partial<BilanContent> = {}): BilanContent {
  return {
    titre: "",
    totalE: 0,
    totalH: 0,
    filteredData: [],
    groupedData: [],
    totalFrais: 0,
    fraisDivers: [],
    impayePrecedent: 0,
    resteCettePeriode: 0,
    resteAPercevoir: 0,
    soldeAcomptesAvant: 0,
    soldeAcomptesApres: 0,
    acomptesDansPeriode: 0,
    totalAcomptes: 0,
    acompteConsommePeriode: 0,
    selectedPatronId: null,
    selectedPatronNom: "Tous les patrons",
    fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
    ...overrides,
  };
}

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    bilanPeriodType: "semaine",
    bilanPeriodValue: "10",
    bilanContent: makeBilanContent(),
    patrons: [] as Patron[],
    triggerAlert: vi.fn(),
    setBilanPaye: vi.fn(),
    getMissionsByPeriod: vi.fn().mockReturnValue([]),
    getFraisByWeek: vi.fn().mockReturnValue([]),
    getTotalFrais: vi.fn().mockReturnValue(0),
    ...overrides,
  };
}

// ─── 1. getStatutPaiement ────────────────────────────────────────────────────

describe("getStatutPaiement — transformation row DB → booléen", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
  });

  it("retourne false si aucune ligne en DB (nouveau bilan)", async () => {
    vi.mocked(bilanRepository.fetchLatestBilanStatus).mockResolvedValue(null);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let statut!: boolean;
    await act(async () => { statut = await result.current.getStatutPaiement(PATRON_ID); });
    expect(statut).toBe(false);
  });

  it("retourne true si paye=true en DB, même avec reste > 0", async () => {
    vi.mocked(bilanRepository.fetchLatestBilanStatus).mockResolvedValue({
      paye: true,
      reste_a_percevoir: 50,
    });
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let statut!: boolean;
    await act(async () => { statut = await result.current.getStatutPaiement(PATRON_ID); });
    expect(statut).toBe(true);
  });

  it("retourne true si paye=false mais reste_a_percevoir ≤ 0.01 (règle quasi-nul)", async () => {
    vi.mocked(bilanRepository.fetchLatestBilanStatus).mockResolvedValue({
      paye: false,
      reste_a_percevoir: 0.005,
    });
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let statut!: boolean;
    await act(async () => { statut = await result.current.getStatutPaiement(PATRON_ID); });
    expect(statut).toBe(true);
  });

  it("retourne false si paye=false et reste = 50 € (impayé réel)", async () => {
    vi.mocked(bilanRepository.fetchLatestBilanStatus).mockResolvedValue({
      paye: false,
      reste_a_percevoir: 50,
    });
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let statut!: boolean;
    await act(async () => { statut = await result.current.getStatutPaiement(PATRON_ID); });
    expect(statut).toBe(false);
  });

  it("retourne false sans appel DB si l'utilisateur n'est pas connecté", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let statut!: boolean;
    await act(async () => { statut = await result.current.getStatutPaiement(PATRON_ID); });
    expect(statut).toBe(false);
    expect(bilanRepository.fetchLatestBilanStatus).not.toHaveBeenCalled();
  });
});

// ─── 2. getImpayePrecedent ───────────────────────────────────────────────────

describe("getImpayePrecedent — bilans + allocations → impayé cumulé réel", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
  });

  it("court-circuite à 0 sans appel DB si currentWeek < 2", async () => {
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let impaye!: number;
    await act(async () => { impaye = await result.current.getImpayePrecedent(1, PATRON_ID); });
    expect(impaye).toBe(0);
    expect(bilanRepository.fetchUnpaidWeeklyBilansBefore).not.toHaveBeenCalled();
  });

  it("retourne 0 quand il n'y a aucun bilan impayé précédent", async () => {
    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let impaye!: number;
    await act(async () => { impaye = await result.current.getImpayePrecedent(8, PATRON_ID); });
    expect(impaye).toBe(0);
  });

  it("calcule CA − allocation pour chaque semaine et cumule (cas nominal)", async () => {
    // S5 : CA=100, alloc=60 → reste=40
    // S6 : CA=80,  alloc=80 → reste=0  (allocation couvre tout)
    // total attendu : 40
    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([
      { periode_index: 5, ca_brut_periode: 100 },
      { periode_index: 6, ca_brut_periode: 80 },
    ] as never);
    vi.mocked(bilanRepository.fetchAcompteAllocationsBefore).mockResolvedValue([
      { periode_index: 5, amount: 60 },
      { periode_index: 6, amount: 80 },
    ]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let impaye!: number;
    await act(async () => { impaye = await result.current.getImpayePrecedent(8, PATRON_ID); });
    expect(impaye).toBeCloseTo(40, 5);
  });

  it("cumule plusieurs acomptes sur la même semaine avant de soustraire du CA", async () => {
    // S5 : CA=100, allocs=40+35=75 → reste=25
    vi.mocked(bilanRepository.fetchUnpaidWeeklyBilansBefore).mockResolvedValue([
      { periode_index: 5, ca_brut_periode: 100 },
    ] as never);
    vi.mocked(bilanRepository.fetchAcompteAllocationsBefore).mockResolvedValue([
      { periode_index: 5, amount: 40 },
      { periode_index: 5, amount: 35 },
    ]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let impaye!: number;
    await act(async () => { impaye = await result.current.getImpayePrecedent(8, PATRON_ID); });
    expect(impaye).toBeCloseTo(25, 5);
  });
});

// ─── 3. getAcomptesUtilisesAvantPeriode ──────────────────────────────────────

describe("getAcomptesUtilisesAvantPeriode — raw amounts → somme", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
  });

  it("retourne 0 sans appel DB si weekNum est falsy (0)", async () => {
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let total!: number;
    await act(async () => { total = await result.current.getAcomptesUtilisesAvantPeriode(0, PATRON_ID); });
    expect(total).toBe(0);
    expect(bilanRepository.fetchAcompteAmountsBefore).not.toHaveBeenCalled();
  });

  it("additionne correctement des montants numériques et chaînes", async () => {
    vi.mocked(bilanRepository.fetchAcompteAmountsBefore).mockResolvedValue([
      { amount: 100 },
      { amount: "50.5" as unknown as number },
    ]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let total!: number;
    await act(async () => { total = await result.current.getAcomptesUtilisesAvantPeriode(8, PATRON_ID); });
    expect(total).toBeCloseTo(150.5, 5);
  });
});

// ─── 4. marquerCommePaye ──────────────────────────────────────────────────────

describe("marquerCommePaye — insert vs update + effets de bord", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
    vi.mocked(bilanRepository.insertBilanRow).mockResolvedValue(undefined);
    vi.mocked(bilanRepository.updateBilanRowById).mockResolvedValue(undefined);
  });

  it("insère une nouvelle ligne quand aucun bilan n'existe encore, puis notifie", async () => {
    vi.mocked(bilanRepository.fetchBilanByPeriodAndPatron).mockResolvedValue(null);
    const setBilanPaye = vi.fn();
    const triggerAlert = vi.fn();
    const { result } = renderHook(() =>
      useBilanDB(makeParams({
        bilanContent: makeBilanContent({ totalE: 200 }),
        setBilanPaye,
        triggerAlert,
      }))
    );
    let ok!: boolean;
    await act(async () => { ok = await result.current.marquerCommePaye(PATRON_ID); });
    expect(ok).toBe(true);
    expect(bilanRepository.insertBilanRow).toHaveBeenCalledWith(
      expect.objectContaining({ paye: true, reste_a_percevoir: 0, ca_brut_periode: 200 })
    );
    expect(bilanRepository.updateBilanRowById).not.toHaveBeenCalled();
    expect(setBilanPaye).toHaveBeenCalledWith(true);
    expect(triggerAlert).toHaveBeenCalledWith(expect.stringContaining("payé"));
  });

  it("met à jour la ligne existante quand un bilan est déjà en DB", async () => {
    vi.mocked(bilanRepository.fetchBilanByPeriodAndPatron).mockResolvedValue({ id: "bilan-42" } as never);
    const setBilanPaye = vi.fn();
    const { result } = renderHook(() => useBilanDB(makeParams({ setBilanPaye })));
    let ok!: boolean;
    await act(async () => { ok = await result.current.marquerCommePaye(PATRON_ID); });
    expect(ok).toBe(true);
    expect(bilanRepository.updateBilanRowById).toHaveBeenCalledWith(
      "bilan-42",
      expect.objectContaining({ paye: true, reste_a_percevoir: 0 })
    );
    expect(bilanRepository.insertBilanRow).not.toHaveBeenCalled();
    expect(setBilanPaye).toHaveBeenCalledWith(true);
  });
});

// ─── 5. repairBilansDB ────────────────────────────────────────────────────────

describe("repairBilansDB — décision skip/fix par ligne de bilan", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
    vi.mocked(bilanRepository.updateBilanRowById).mockResolvedValue(undefined);
  });

  it("retourne fixed=0 skipped=0 et un message explicite quand aucune ligne en DB", async () => {
    vi.mocked(bilanRepository.fetchWeeklyBilansForRepair).mockResolvedValue([]);
    vi.mocked(bilanRepository.fetchAcompteAllocationsByPatron).mockResolvedValue([]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.repairBilansDB>>;
    await act(async () => { res = await result.current.repairBilansDB(PATRON_ID); });
    expect(res.success).toBe(true);
    expect(res.fixed).toBe(0);
    expect(res.skipped).toBe(0);
    expect(res.message).toMatch(/Aucune/i);
  });

  it("skippe une ligne déjà correcte (CA=100, alloc=100, reste=0, paye=true)", async () => {
    vi.mocked(bilanRepository.fetchWeeklyBilansForRepair).mockResolvedValue([
      { id: "b1", periode_index: 5, ca_brut_periode: 100, acompte_consomme: 100, reste_a_percevoir: 0, paye: true },
    ] as never);
    vi.mocked(bilanRepository.fetchAcompteAllocationsByPatron).mockResolvedValue([
      { periode_index: 5, amount: 100 },
    ]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.repairBilansDB>>;
    await act(async () => { res = await result.current.repairBilansDB(PATRON_ID); });
    expect(res.skipped).toBe(1);
    expect(res.fixed).toBe(0);
    expect(bilanRepository.updateBilanRowById).not.toHaveBeenCalled();
  });

  it("corrige une ligne dont le reste en DB ne correspond pas à la réalité", async () => {
    // CA=100, aucune allocation → reste réel = 100
    // Mais la DB dit acompte_consomme=50 et reste=50 → incohérent → needsFix=true
    vi.mocked(bilanRepository.fetchWeeklyBilansForRepair).mockResolvedValue([
      { id: "b2", periode_index: 7, ca_brut_periode: 100, acompte_consomme: 50, reste_a_percevoir: 50, paye: false },
    ] as never);
    vi.mocked(bilanRepository.fetchAcompteAllocationsByPatron).mockResolvedValue([]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.repairBilansDB>>;
    await act(async () => { res = await result.current.repairBilansDB(PATRON_ID); });
    expect(res.fixed).toBe(1);
    expect(res.skipped).toBe(0);
    expect(bilanRepository.updateBilanRowById).toHaveBeenCalledWith(
      "b2",
      expect.objectContaining({ acompte_consomme: 0, reste_a_percevoir: 100, paye: false })
    );
  });

  it("traite un mix de lignes : 1 skip + 1 fix", async () => {
    vi.mocked(bilanRepository.fetchWeeklyBilansForRepair).mockResolvedValue([
      // propre : alloc couvre tout
      { id: "clean", periode_index: 3, ca_brut_periode: 80, acompte_consomme: 80, reste_a_percevoir: 0, paye: true },
      // sale : alloc=0 mais acompte_consomme=30 en DB
      { id: "dirty", periode_index: 4, ca_brut_periode: 60, acompte_consomme: 30, reste_a_percevoir: 30, paye: false },
    ] as never);
    vi.mocked(bilanRepository.fetchAcompteAllocationsByPatron).mockResolvedValue([
      { periode_index: 3, amount: 80 },
    ]);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.repairBilansDB>>;
    await act(async () => { res = await result.current.repairBilansDB(PATRON_ID); });
    expect(res.fixed).toBe(1);
    expect(res.skipped).toBe(1);
    expect(bilanRepository.updateBilanRowById).toHaveBeenCalledTimes(1);
    expect(bilanRepository.updateBilanRowById).toHaveBeenCalledWith("dirty", expect.anything());
  });
});

// ─── 6. rebuildBilans ────────────────────────────────────────────────────────

describe("rebuildBilans — boucle semaines → insert/update", () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(MOCK_USER as never);
    vi.mocked(bilanRepository.insertBilanRow).mockResolvedValue(undefined);
    vi.mocked(bilanRepository.updateBilanRowById).mockResolvedValue(undefined);
  });

  it("insère 3 nouvelles lignes pour S5→S7 quand aucune n'existe en DB", async () => {
    vi.mocked(bilanRepository.fetchBilanByPeriodAndPatron).mockResolvedValue(null);
    const getMissionsByPeriod = vi.fn().mockReturnValue([{ montant: 40 }, { montant: 60 }]);
    const { result } = renderHook(() =>
      useBilanDB(makeParams({ getMissionsByPeriod }))
    );
    let res!: Awaited<ReturnType<typeof result.current.rebuildBilans>>;
    await act(async () => { res = await result.current.rebuildBilans(PATRON_ID, 5, 7); });
    expect(res.success).toBe(true);
    expect(bilanRepository.insertBilanRow).toHaveBeenCalledTimes(3);
    expect(bilanRepository.insertBilanRow).toHaveBeenCalledWith(
      expect.objectContaining({ ca_brut_periode: 100, paye: false })
    );
    expect(res.message).toContain("3");
    expect(res.message).toContain("S5");
    expect(res.message).toContain("S7");
  });

  it("met à jour les lignes déjà existantes sans en créer de nouvelles", async () => {
    vi.mocked(bilanRepository.fetchBilanByPeriodAndPatron).mockResolvedValue({ id: "existing-1" } as never);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.rebuildBilans>>;
    await act(async () => { res = await result.current.rebuildBilans(PATRON_ID, 5, 5); });
    expect(res.success).toBe(true);
    expect(bilanRepository.updateBilanRowById).toHaveBeenCalledWith(
      "existing-1",
      expect.objectContaining({ ca_brut_periode: 0, periode_index: 5 })
    );
    expect(bilanRepository.insertBilanRow).not.toHaveBeenCalled();
  });

  it("retourne success=false si l'utilisateur n'est pas connecté", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);
    const { result } = renderHook(() => useBilanDB(makeParams()));
    let res!: Awaited<ReturnType<typeof result.current.rebuildBilans>>;
    await act(async () => { res = await result.current.rebuildBilans(PATRON_ID, 5, 7); });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/connect/i);
    expect(bilanRepository.insertBilanRow).not.toHaveBeenCalled();
  });
});

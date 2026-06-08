/**
 * useReserve.vitest.ts
 *
 * Tests du hook useReserve : chargement des mouvements au montage, calcul du
 * solde, ajout / suppression de mouvement, synchronisation hebdomadaire et
 * gestion d'erreur.
 *
 * La couche persistance (Supabase) est entierement mockee ; les calculs purs
 * (solde, tri, filtre) tournent reellement pour valider le cablage complet.
 *
 * Execution :
 *   npm run test:hooks -- useReserve
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReserveMovementRow } from "../../features/contracts/reserve/reserve.types";

const fetchReserveMovements = vi.fn();
const createReserveMovement = vi.fn();
const deleteReserveMovement = vi.fn();
const upsertWeeklySettlement = vi.fn();

vi.mock("../../features/contracts/reserve/reservePersistence", () => ({
  fetchReserveMovements: (...args: unknown[]) => fetchReserveMovements(...args),
  createReserveMovement: (...args: unknown[]) => createReserveMovement(...args),
  deleteReserveMovement: (...args: unknown[]) => deleteReserveMovement(...args),
  upsertWeeklySettlement: (...args: unknown[]) => upsertWeeklySettlement(...args),
}));

import { useReserve } from "../../features/contracts/reserve/useReserve";

const PATRON = "patron-123";

function makeRow(overrides: Partial<ReserveMovementRow>): ReserveMovementRow {
  const base: ReserveMovementRow = {
    id: "row-1",
    user_id: "user-1",
    patron_id: PATRON,
    movement_type: "manual_add",
    movement_source: "user",
    delta_hours: 0,
    movement_date: "2026-05-01",
    mission_id: null,
    period_type: null,
    period_value: null,
    comment: null,
    movement_key: null,
    balance_before_hours: null,
    balance_after_hours: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

beforeEach(() => {
  fetchReserveMovements.mockReset();
  createReserveMovement.mockReset();
  deleteReserveMovement.mockReset();
  upsertWeeklySettlement.mockReset();
  fetchReserveMovements.mockResolvedValue([]);
  createReserveMovement.mockResolvedValue(undefined);
  deleteReserveMovement.mockResolvedValue(undefined);
  upsertWeeklySettlement.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useReserve — chargement initial", () => {
  it("charge les mouvements au montage, calcule le solde et trie du + recent au + ancien", async () => {
    fetchReserveMovements.mockResolvedValue([
      makeRow({ id: "old", delta_hours: 10, movement_date: "2026-05-01" }),
      makeRow({ id: "recent", delta_hours: -3, movement_date: "2026-05-10" }),
    ]);

    const { result } = renderHook(() => useReserve(PATRON));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchReserveMovements).toHaveBeenCalledWith(PATRON);
    // 10 + (-3) = 7
    expect(result.current.balanceHours).toBe(7);
    // tri decroissant par date : le plus recent d'abord
    expect(result.current.movements.map((m) => m.id)).toEqual(["recent", "old"]);
    expect(result.current.error).toBeNull();
  });
});

describe("useReserve — addMovement", () => {
  it("appelle createReserveMovement avec le patronId injecte puis rafraichit la liste", async () => {
    const { result } = renderHook(() => useReserve(PATRON));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Le refresh post-ajout renvoie un nouveau mouvement de +5h.
    fetchReserveMovements.mockResolvedValueOnce([
      makeRow({ id: "new", delta_hours: 5 }),
    ]);

    await act(async () => {
      await result.current.addMovement({
        movementType: "manual_add",
        source: "user",
        deltaHours: 5,
      });
    });

    expect(createReserveMovement).toHaveBeenCalledWith({
      movementType: "manual_add",
      source: "user",
      deltaHours: 5,
      patronId: PATRON,
    });
    // montage (1) + refresh apres ajout (1)
    expect(fetchReserveMovements).toHaveBeenCalledTimes(2);
    expect(result.current.balanceHours).toBe(5);
    expect(result.current.saving).toBe(false);
  });
});

describe("useReserve — removeMovement", () => {
  it("supprime par id puis rafraichit", async () => {
    const { result } = renderHook(() => useReserve(PATRON));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeMovement("row-42");
    });

    expect(deleteReserveMovement).toHaveBeenCalledWith("row-42");
    expect(fetchReserveMovements).toHaveBeenCalledTimes(2);
    expect(result.current.saving).toBe(false);
  });
});

describe("useReserve — syncWeeklySettlement", () => {
  it("injecte le patronId et rafraichit", async () => {
    const { result } = renderHook(() => useReserve(PATRON));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.syncWeeklySettlement({
        periodValue: "22",
        workedHours: 30,
        quotaHours: 20,
        reserveEnabled: true,
        overflowRule: "to_reserve",
        surplusSplitPct: 0,
      });
    });

    expect(upsertWeeklySettlement).toHaveBeenCalledWith({
      periodValue: "22",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
      patronId: PATRON,
    });
    expect(fetchReserveMovements).toHaveBeenCalledTimes(2);
  });
});

describe("useReserve — patron null", () => {
  it("propage patronId=null jusqu'au fetch et a l'ajout", async () => {
    const { result } = renderHook(() => useReserve(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchReserveMovements).toHaveBeenCalledWith(null);

    await act(async () => {
      await result.current.addMovement({
        movementType: "manual_consume",
        source: "user",
        deltaHours: -2,
      });
    });

    expect(createReserveMovement).toHaveBeenCalledWith({
      movementType: "manual_consume",
      source: "user",
      deltaHours: -2,
      patronId: null,
    });
  });
});

describe("useReserve — gestion d'erreur", () => {
  it("expose le message d'erreur et coupe le loading si le fetch echoue", async () => {
    fetchReserveMovements.mockReset();
    fetchReserveMovements.mockRejectedValue(new Error("supabase down"));

    const { result } = renderHook(() => useReserve(PATRON));

    await waitFor(() => expect(result.current.error).toBe("supabase down"));
    expect(result.current.loading).toBe(false);
    expect(result.current.balanceHours).toBe(0);
  });
});

describe("useReserve — getFilteredHistory", () => {
  it("filtre l'historique par type de mouvement (et conserve le tri desc)", async () => {
    fetchReserveMovements.mockResolvedValue([
      makeRow({ id: "a", movement_type: "manual_add", movement_date: "2026-05-02" }),
      makeRow({ id: "b", movement_type: "manual_consume", movement_date: "2026-05-03" }),
      makeRow({ id: "c", movement_type: "manual_add", movement_date: "2026-05-04" }),
    ]);

    const { result } = renderHook(() => useReserve(PATRON));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const filtered = result.current.getFilteredHistory({ movementType: "manual_add" });
    expect(filtered.map((m) => m.id)).toEqual(["c", "a"]);
  });
});

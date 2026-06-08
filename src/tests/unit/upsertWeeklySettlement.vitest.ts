/**
 * upsertWeeklySettlement.vitest.ts
 *
 * Tests de la persistance du settlement hebdomadaire de la reserve.
 * Supabase est mocke (aucun appel reseau). On valide :
 *   - le garde-fou anti-corruption (periode != vraie semaine -> ignore total)
 *   - le skip quand delta = 0 (pas de mouvement +0h parasite, mais dedup quand meme)
 *   - la deduplication par movement_key (delete avant insert -> pas de double credit)
 *   - le calcul du delta surplus au-dessus du quota (avec split)
 *
 * Execution :
 *   npm run test:hooks -- upsertWeeklySettlement
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
const rpc = vi.fn();
const deleteEq = vi.fn();

const deleteBuilder: {
  eq: (...a: unknown[]) => unknown;
  then: (resolve: (v: unknown) => void) => void;
} = {
  eq: (...a: unknown[]) => {
    deleteEq(...a);
    return deleteBuilder;
  },
  then: (resolve: (v: unknown) => void) => resolve({ error: null }),
};

const deleteFn = vi.fn(() => deleteBuilder);
const fromBuilder = { delete: (...a: unknown[]) => deleteFn(...a) };

vi.mock("../../services/supabase", () => ({
  supabase: {
    from: (...a: unknown[]) => from(...a),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));

import { upsertWeeklySettlement } from "../../features/contracts/reserve/reservePersistence";

const PATRON = "patron-123";
const TABLE = "contract_reserve_movements";
const KEY_22 = "weekly_settlement:patron-123:22";

beforeEach(() => {
  from.mockReset();
  rpc.mockReset();
  deleteEq.mockReset();
  deleteFn.mockReset();

  deleteFn.mockReturnValue(deleteBuilder);
  from.mockReturnValue(fromBuilder);
  rpc.mockResolvedValue({ error: null });
});

describe("upsertWeeklySettlement - garde-fou periode", () => {
  it("ignore totalement une periode 'annee' (2026) : aucun appel Supabase", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "2026",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignore totalement une periode 'mois' (2026-05) : aucun appel Supabase", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "2026-05",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("upsertWeeklySettlement - skip delta 0 (mais dedup)", () => {
  it("sous le quota : delta 0 -> nettoie la cle mais n'insere aucun mouvement", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "22",
      workedHours: 15,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    // Le delete de dedup est quand meme execute...
    expect(from).toHaveBeenCalledWith(TABLE);
    expect(deleteEq).toHaveBeenCalledWith("movement_key", KEY_22);
    expect(deleteEq).toHaveBeenCalledWith("movement_source", "contract_engine");
    // ...mais aucun insert (pas de ligne +0h parasite)
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reserve desactivee : delta 0 -> pas d'insert", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "22",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: false,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    expect(rpc).not.toHaveBeenCalled();
  });

  it("overflowRule 'ignore' : delta 0 -> pas d'insert", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "22",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "ignore",
      surplusSplitPct: 0,
    });

    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("upsertWeeklySettlement - ecriture + dedup", () => {
  it("surplus 10h : supprime la cle existante PUIS insere overtime_to_reserve (anti double-credit)", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "22",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    // Dedup : delete par movement_key + source contract_engine
    expect(from).toHaveBeenCalledWith(TABLE);
    expect(deleteEq).toHaveBeenCalledWith("movement_key", KEY_22);
    expect(deleteEq).toHaveBeenCalledWith("movement_source", "contract_engine");

    // Insert du surplus (30 - 20 = 10h, split 0 -> tout en banque)
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "insert_reserve_movement",
      expect.objectContaining({
        p_patron_id: PATRON,
        p_movement_type: "overtime_to_reserve",
        p_movement_source: "contract_engine",
        p_delta_hours: 10,
        p_period_type: "semaine",
        p_period_value: "22",
        p_movement_key: KEY_22,
        p_comment: "Synchronisation automatique du contrat",
      }),
    );
  });

  it("applique le split surplus : 10h * (1 - 60%) = 4h banquees", async () => {
    await upsertWeeklySettlement({
      patronId: PATRON,
      periodValue: "22",
      workedHours: 30,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 60,
    });

    expect(rpc).toHaveBeenCalledWith(
      "insert_reserve_movement",
      expect.objectContaining({ p_delta_hours: 4 }),
    );
  });

  it("patron null -> movement_key global", async () => {
    await upsertWeeklySettlement({
      patronId: null,
      periodValue: "10",
      workedHours: 28,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });

    expect(deleteEq).toHaveBeenCalledWith("movement_key", "weekly_settlement:global:10");
    expect(rpc).toHaveBeenCalledWith(
      "insert_reserve_movement",
      expect.objectContaining({
        p_patron_id: null,
        p_delta_hours: 8,
        p_movement_key: "weekly_settlement:global:10",
      }),
    );
  });
});

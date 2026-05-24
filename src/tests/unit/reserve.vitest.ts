import { describe, expect, it } from "vitest";

import {
  buildWeeklySettlementKey,
  computeReserveBalanceHours,
  computeWeeklySettlementDelta,
} from "../../features/contracts/reserve/reserveCalculations";
import { filterReserveHistory, sortReserveHistory } from "../../features/contracts/reserve/reserveHistory";
import type { ReserveMovementRow } from "../../features/contracts/reserve/reserve.types";

function row(partial: Partial<ReserveMovementRow>): ReserveMovementRow {
  return {
    id: partial.id || "1",
    user_id: partial.user_id || "u-1",
    patron_id: partial.patron_id ?? "p-1",
    movement_type: partial.movement_type || "manual_add",
    movement_source: partial.movement_source || "user",
    delta_hours: partial.delta_hours ?? 0,
    movement_date: partial.movement_date || "2026-05-24T09:00:00.000Z",
    mission_id: partial.mission_id ?? null,
    period_type: partial.period_type ?? null,
    period_value: partial.period_value ?? null,
    comment: partial.comment ?? null,
    movement_key: partial.movement_key ?? null,
    balance_before_hours: partial.balance_before_hours ?? null,
    balance_after_hours: partial.balance_after_hours ?? null,
    created_at: partial.created_at || "2026-05-24T09:00:00.000Z",
    updated_at: partial.updated_at || "2026-05-24T09:00:00.000Z",
  };
}

describe("reserve calculations", () => {
  it("compute reserve balance from ledger", () => {
    const balance = computeReserveBalanceHours([
      row({ id: "a", delta_hours: 5 }),
      row({ id: "b", delta_hours: -2 }),
      row({ id: "c", delta_hours: 3 }),
      row({ id: "d", delta_hours: -1 }),
    ]);

    expect(balance).toBe(5);
  });

  it("weekly settlement under quota", () => {
    const delta = computeWeeklySettlementDelta({
      patronId: "p-1",
      periodValue: "21",
      workedHours: 6,
      quotaHours: 8,
      reserveEnabled: true,
      overflowRule: "ignore",
    });

    expect(delta).toBe(2);
  });

  it("weekly settlement overflow to reserve", () => {
    const delta = computeWeeklySettlementDelta({
      patronId: "p-1",
      periodValue: "21",
      workedHours: 10,
      quotaHours: 8,
      reserveEnabled: true,
      overflowRule: "to_reserve",
    });

    expect(delta).toBe(2);
  });

  it("weekly settlement disabled reserve", () => {
    const delta = computeWeeklySettlementDelta({
      patronId: "p-1",
      periodValue: "21",
      workedHours: 6,
      quotaHours: 8,
      reserveEnabled: false,
      overflowRule: "ignore",
    });

    expect(delta).toBe(0);
  });

  it("build weekly settlement key", () => {
    expect(buildWeeklySettlementKey("p-1", "21")).toBe("weekly_settlement:p-1:21");
    expect(buildWeeklySettlementKey(null, "21")).toBe("weekly_settlement:global:21");
  });
});

describe("reserve history", () => {
  it("sort and filter history", () => {
    const history = sortReserveHistory([
      row({ id: "1", movement_date: "2026-05-20T09:00:00.000Z", movement_type: "manual_add" }),
      row({ id: "2", movement_date: "2026-05-22T09:00:00.000Z", movement_type: "carry_over" }),
      row({ id: "3", movement_date: "2026-05-21T09:00:00.000Z", movement_type: "admin_correction" }),
    ]);

    expect(history.map((h) => h.id)).toEqual(["2", "3", "1"]);

    const filtered = filterReserveHistory(history, { movementType: "carry_over" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });
});

/**
 * reserveMovements.vitest.ts
 *
 * Trois derniers items 🟠 du backlog (volet banque / reserve) :
 *   1. Type & signe des mouvements
 *        - surplus           -> overtime_to_reserve (+)
 *        - retrait quota      -> deficit_cover       (-)
 *        - semaine programmee -> planned_week        (-)
 *   2. Solde sur mix de types (computeReserveBalanceHours somme les delta signes)
 *   3. Scenario inter-semaines : S1 banque +3h -> S2 comble deficit 2h
 *      (tout-ou-rien) -> solde 1h, payable = quota.
 *
 * La math pure de retrait (W1-W18) est deja couverte par reserveWithdrawal.vitest.ts ;
 * ici on valide les SIGNES et l'agregation dans le solde.
 *
 * Execution : npm run test:hooks -- reserveMovements
 */

import { describe, expect, it } from "vitest";
import type {
  ReserveMovementRow,
  ReserveMovementType,
} from "../../features/contracts/reserve/reserve.types";
import { computeReserveBalanceHours, computeWeeklySettlementDelta } from "../../features/contracts/reserve/reserveCalculations";
import {
  computeDeficit,
  computeDeficitCoverWithdrawal,
  computePayableHoursAfterWithdrawal,
  computePlannedWeekAllocation,
} from "../../features/contracts/reserve/reserveWithdrawal";

let seq = 0;

// Fabrique une ligne de ledger. Le SIGNE est porte par delta_hours :
// credits positifs, retraits negatifs.
function mkRow(movement_type: ReserveMovementType, delta_hours: number): ReserveMovementRow {
  seq += 1;
  return {
    id: `mv-${seq}`,
    user_id: "u-1",
    patron_id: "p-1",
    movement_type,
    movement_source: "contract_engine",
    delta_hours,
    movement_date: "2026-06-01",
    mission_id: null,
    period_type: "semaine",
    period_value: "23",
    comment: null,
    movement_key: null,
    balance_before_hours: null,
    balance_after_hours: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
}

describe("reserve - type & signe des mouvements", () => {
  it("surplus -> overtime_to_reserve credite en POSITIF", () => {
    const delta = computeWeeklySettlementDelta({
      patronId: "p-1",
      periodValue: "23",
      workedHours: 23,
      quotaHours: 20,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });
    expect(delta).toBe(3);
    const balance = computeReserveBalanceHours([mkRow("overtime_to_reserve", delta)]);
    expect(balance).toBe(3);
    expect(balance).toBeGreaterThan(0);
  });

  it("retrait quota -> deficit_cover debite en NEGATIF", () => {
    const magnitude = computeDeficitCoverWithdrawal(2, 10);
    expect(magnitude).toBe(2);
    // applique en negatif dans le ledger
    const balance = computeReserveBalanceHours([
      mkRow("overtime_to_reserve", 10),
      mkRow("deficit_cover", -magnitude),
    ]);
    expect(balance).toBe(8);
  });

  it("semaine programmee -> planned_week debite en NEGATIF", () => {
    const allocation = computePlannedWeekAllocation(20, 10, 8);
    expect(allocation).toBe(8);
    const balance = computeReserveBalanceHours([
      mkRow("overtime_to_reserve", 10),
      mkRow("planned_week", -allocation),
    ]);
    expect(balance).toBe(2);
  });
});

describe("reserve - solde sur mix de types", () => {
  it("additionne correctement credits (+) et debits (-)", () => {
    const balance = computeReserveBalanceHours([
      mkRow("overtime_to_reserve", 3),
      mkRow("deficit_cover", -2),
      mkRow("planned_week", -1),
      mkRow("manual_add", 5),
      mkRow("admin_correction", -1.5),
    ]);
    // 3 - 2 - 1 + 5 - 1.5 = 3.5
    expect(balance).toBe(3.5);
  });

  it("arrondit a 2 decimales (pas de derive flottante)", () => {
    const balance = computeReserveBalanceHours([
      mkRow("manual_add", 0.1),
      mkRow("manual_add", 0.2),
    ]);
    expect(balance).toBe(0.3);
  });

  it("ignore les delta non finis (NaN -> 0)", () => {
    const balance = computeReserveBalanceHours([
      mkRow("manual_add", 4),
      mkRow("admin_correction", Number.NaN),
    ]);
    expect(balance).toBe(4);
  });
});

describe("reserve - scenario inter-semaines (tout-ou-rien)", () => {
  it("S1 +3h banque -> S2 comble deficit 2h -> solde 1h, payable = quota", () => {
    const quota = 20;

    // S1 : 23h travaillees, surplus 3h banque (split 0%)
    const s1Delta = computeWeeklySettlementDelta({
      patronId: "p-1",
      periodValue: "23",
      workedHours: 23,
      quotaHours: quota,
      reserveEnabled: true,
      overflowRule: "to_reserve",
      surplusSplitPct: 0,
    });
    expect(s1Delta).toBe(3);
    const balanceAfterS1 = computeReserveBalanceHours([mkRow("overtime_to_reserve", s1Delta)]);
    expect(balanceAfterS1).toBe(3);

    // S2 : 18h travaillees -> deficit 2h, couvert par la banque (3 >= 2)
    const deficit = computeDeficit(18, quota);
    expect(deficit).toBe(2);
    const cover = computeDeficitCoverWithdrawal(deficit, balanceAfterS1);
    expect(cover).toBe(2);

    const balanceAfterS2 = computeReserveBalanceHours([
      mkRow("overtime_to_reserve", s1Delta),
      mkRow("deficit_cover", -cover),
    ]);
    expect(balanceAfterS2).toBe(1);

    const payable = computePayableHoursAfterWithdrawal(18, cover, quota);
    expect(payable).toBe(quota);
  });

  it("tout-ou-rien : deficit non couvert -> aucun retrait, solde intact, payable < quota", () => {
    const quota = 20;
    const balance = 3;

    // 16h travaillees -> deficit 4h ; banque 3h ne couvre pas tout -> rien
    const deficit = computeDeficit(16, quota);
    expect(deficit).toBe(4);
    const cover = computeDeficitCoverWithdrawal(deficit, balance);
    expect(cover).toBe(0);

    const balanceAfter = computeReserveBalanceHours([
      mkRow("overtime_to_reserve", balance),
      mkRow("deficit_cover", -cover),
    ]);
    expect(balanceAfter).toBe(3);

    const payable = computePayableHoursAfterWithdrawal(16, cover, quota);
    expect(payable).toBe(16);
  });
});

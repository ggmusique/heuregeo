import { describe, expect, it } from "vitest";

import {
	canSyncWeeklySettlement,
	canWithdrawFromReserve,
	isReserveWeekLocked,
} from "../../features/contracts/reserve/reserveGuards";
import {
	computeBalanceAfterWithdrawal,
	computeDeficit,
	computeMaxWithdrawal,
	computePayableHoursAfterWithdrawal,
} from "../../features/contracts/reserve/reserveWithdrawal";
import { computeWeeklySettlementDelta } from "../../features/contracts/reserve/reserveCalculations";

// ---------------------------------------------------------------------------
// RÈGLE FIGÉE : une semaine payée est gelée (aucune mutation de réserve)
// ---------------------------------------------------------------------------
describe("règle métier — semaine payée = gelée", () => {
	it("une semaine payée est verrouillée", () => {
		expect(isReserveWeekLocked(true)).toBe(true);
	});

	it("une semaine non payée (false / null / undefined) n'est pas verrouillée", () => {
		expect(isReserveWeekLocked(false)).toBe(false);
		expect(isReserveWeekLocked(null)).toBe(false);
		expect(isReserveWeekLocked(undefined)).toBe(false);
	});

	it("aucune synchro automatique de la banque sur une semaine payée", () => {
		expect(canSyncWeeklySettlement(true)).toBe(false);
		expect(canSyncWeeklySettlement(false)).toBe(true);
	});

	it("aucun comblement de déficit sur une semaine payée", () => {
		expect(canWithdrawFromReserve(true)).toBe(false);
		expect(canWithdrawFromReserve(false)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// GOLDEN MASTER : invariants de calcul qui NE DOIVENT PAS changer
// pendant le branchement du verrou.
// ---------------------------------------------------------------------------
describe("golden master — invariants déficit / banque", () => {
	it("déficit = max(0, quota - travaillées)", () => {
		expect(computeDeficit(6, 8)).toBe(2);
		expect(computeDeficit(8, 8)).toBe(0);
		expect(computeDeficit(10, 8)).toBe(0);
	});

	it("retrait possible quand le solde couvre le déficit", () => {
		// Cas non ambigu (solde suffisant) — vrai quel que soit le mode (partiel ou tout-ou-rien)
		expect(computeMaxWithdrawal(2, 12)).toBe(2);
		expect(computeMaxWithdrawal(0, 12)).toBe(0);
	});

	it("solde après retrait — jamais négatif", () => {
		expect(computeBalanceAfterWithdrawal(12, 2)).toBe(10);
		expect(computeBalanceAfterWithdrawal(3, 5)).toBe(0);
	});

	it("heures payables après comblement — plafonné au quota", () => {
		expect(computePayableHoursAfterWithdrawal(6, 2, 8)).toBe(8);
		expect(computePayableHoursAfterWithdrawal(6, 1, 8)).toBe(7);
		expect(computePayableHoursAfterWithdrawal(6, 5, 8)).toBe(8);
	});

	it("settlement hebdo — sous quota = 0, surplus crédité en banque", () => {
		expect(
			computeWeeklySettlementDelta({
				patronId: "p-1",
				periodValue: "21",
				workedHours: 6,
				quotaHours: 8,
				reserveEnabled: true,
				overflowRule: "ignore",
			}),
		).toBe(0);
		expect(
			computeWeeklySettlementDelta({
				patronId: "p-1",
				periodValue: "21",
				workedHours: 10,
				quotaHours: 8,
				reserveEnabled: true,
				overflowRule: "to_reserve",
			}),
		).toBe(2);
	});
});

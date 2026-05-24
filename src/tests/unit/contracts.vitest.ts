import { describe, expect, it } from "vitest";

import {
  buildContractFeatures,
  calculateContractReserve,
  calculatePayableHours,
  calculateQuotaOverflow,
  calculateWeeklyBilan,
} from "../../features/contracts";

describe("contracts V1", () => {
  it("mode free: masque reserve tab et applique calcul standard", () => {
    const contract = buildContractFeatures({
      features: { plan: "free" },
      isViewer: false,
    });

    const result = calculateWeeklyBilan({ workedHours: 11 }, contract);

    expect(contract.source.mode).toBe("free");
    expect(contract.visibility.suivi.showReserveTab).toBe(false);
    expect(contract.visibility.bilan.showPayableHoursKpi).toBe(false);
    expect(result.payableHours).toBe(11);
    expect(result.reserveHours).toBe(0);
    expect(result.quotaOverflowHours).toBe(0);
  });

  it("mode pro: active visibilité premium et calcul quota/réserve/payable", () => {
    const contract = buildContractFeatures({
      features: { plan: "pro", contract_weekly_quota_hours: 8 },
      isViewer: false,
    });

    const underQuota = calculateWeeklyBilan({ workedHours: 6 }, contract);

    expect(contract.source.mode).toBe("pro");
    expect(contract.visibility.suivi.showReserveTab).toBe(true);
    expect(contract.visibility.bilan.showPayableHoursKpi).toBe(true);
    expect(contract.visibility.bilan.showOvertimeKpi).toBe(true);
    expect(contract.visibility.bilan.showReserveKpi).toBe(true);
    expect(underQuota.payableHours).toBe(6);
    expect(underQuota.reserveHours).toBe(2);
    expect(underQuota.quotaOverflowHours).toBe(0);
  });

  it("mode pro: gère overflow quota", () => {
    const contract = buildContractFeatures({
      features: { plan: "pro", contract_weekly_quota_hours: 8 },
      isViewer: false,
    });

    expect(calculateContractReserve({ workedHours: 10 }, contract)).toBe(0);
    expect(calculatePayableHours({ workedHours: 10 }, contract)).toBe(8);
    expect(calculateQuotaOverflow({ workedHours: 10 }, contract)).toBe(2);
  });

  it("mode pro: payable rule worked_hours ne cappe pas au quota", () => {
    const contract = buildContractFeatures({
      features: {
        plan: "pro",
        contract_weekly_quota_hours: 8,
        contract_payable_rule: "worked_hours",
      },
      isViewer: false,
    });

    const result = calculateWeeklyBilan({ workedHours: 11 }, contract);
    expect(result.payableHours).toBe(11);
  });

  it("mode pro: overflow rule to_reserve crédite la réserve", () => {
    const contract = buildContractFeatures({
      features: {
        plan: "pro",
        contract_weekly_quota_hours: 8,
        contract_overflow_rule: "to_reserve",
      },
      isViewer: false,
    });

    const result = calculateWeeklyBilan({ workedHours: 10 }, contract);
    expect(result.quotaOverflowHours).toBe(2);
    expect(result.reserveHours).toBe(2);
  });

  it("mode pro viewer: masque onglet réserve", () => {
    const contract = buildContractFeatures({
      features: { plan: "pro" },
      isViewer: true,
    });

    expect(contract.source.mode).toBe("pro");
    expect(contract.visibility.suivi.showReserveTab).toBe(false);
  });
});

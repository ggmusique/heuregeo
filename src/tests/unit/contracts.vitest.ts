import { describe, expect, it } from "vitest";

import { calculateWeeklySettlement } from "../../features/contracts";

describe("Contrat hebdo V3", () => {
  it("TEST 1 : Semaine normale (20h/20h) -> surplus = 0", () => {
    const result = calculateWeeklySettlement({
      workedHours: 20,
      contractHoursWeek: 20,
      surplusRule: "payable",
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.surplusHours).toBe(0);
  });

  it("TEST 2 : Surplus payable (25h, contrat 20h) -> payable = 5h", () => {
    const result = calculateWeeklySettlement({
      workedHours: 25,
      contractHoursWeek: 20,
      surplusRule: "payable",
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.surplusPayableHours).toBe(5);
    expect(result.surplusBanqueHours).toBe(0);
  });

  it("TEST 3 : Surplus banque (25h, contrat 20h) -> banque = 5h", () => {
    const result = calculateWeeklySettlement({
      workedHours: 25,
      contractHoursWeek: 20,
      surplusRule: "banque",
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.surplusPayableHours).toBe(0);
    expect(result.surplusBanqueHours).toBe(5);
  });

  it("TEST 4 : Surplus les deux 50/50 (25h, 20h) -> payable 2.5h, banque 2.5h", () => {
    const result = calculateWeeklySettlement({
      workedHours: 25,
      contractHoursWeek: 20,
      surplusRule: "les_deux",
      surplusSplitPct: 50,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.surplusPayableHours).toBe(2.5);
    expect(result.surplusBanqueHours).toBe(2.5);
  });

  it("TEST 5 : Surplus les deux 70/30 (25h, 20h) -> payable 3.5h, banque 1.5h", () => {
    const result = calculateWeeklySettlement({
      workedHours: 25,
      contractHoursWeek: 20,
      surplusRule: "les_deux",
      surplusSplitPct: 70,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.surplusPayableHours).toBe(3.5);
    expect(result.surplusBanqueHours).toBe(1.5);
  });

  it("TEST 6 : Acompte normal (brut 100, acompte 40) -> net = 60", () => {
    const result = calculateWeeklySettlement({
      workedHours: 30,
      contractHoursWeek: 20,
      surplusRule: "payable",
      hourlyRate: 10,
      acompteAmount: 40,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.grossPayableAmount).toBe(100);
    expect(result.netBeforeFrais).toBe(60);
  });

  it("TEST 7 : Acompte > brut (brut 30, acompte 50) -> net = 0, report = 20", () => {
    const result = calculateWeeklySettlement({
      workedHours: 23,
      contractHoursWeek: 20,
      surplusRule: "payable",
      hourlyRate: 10,
      acompteAmount: 50,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.grossPayableAmount).toBe(30);
    expect(result.netBeforeFrais).toBe(0);
    expect(result.acompteCarryForward).toBe(20);
  });

  it("TEST 8 : Frais remboursables (net 60, frais 15) -> total = 75", () => {
    const result = calculateWeeklySettlement({
      workedHours: 30,
      contractHoursWeek: 20,
      surplusRule: "payable",
      hourlyRate: 10,
      acompteAmount: 40,
      fraisRemboursables: 15,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.netBeforeFrais).toBe(60);
    expect(result.netAfterFrais).toBe(75);
  });

  it("TEST 9 : Frais déductibles (net 60, frais 10) -> total = 50", () => {
    const result = calculateWeeklySettlement({
      workedHours: 30,
      contractHoursWeek: 20,
      surplusRule: "payable",
      hourlyRate: 10,
      acompteAmount: 40,
      fraisDeductibles: 10,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.netBeforeFrais).toBe(60);
    expect(result.netAfterFrais).toBe(50);
  });

  it("TEST 10 : Semaine non encodée -> statut non_encodee + badge À encoder", () => {
    const result = calculateWeeklySettlement({
      workedHours: 0,
      contractHoursWeek: 20,
      surplusRule: "payable",
      weekStartIso: "2026-04-20",
      nowIso: "2026-05-24",
      isEncoded: false,
      isPaid: false,
    });

    expect(result.status).toBe("non_encodee");
    expect(result.badgeLabel).toBe("À encoder");
  });

  it("TEST 11 : Semaine reportée +14j non payée -> statut reportee + badge En retard", () => {
    const result = calculateWeeklySettlement({
      workedHours: 20,
      contractHoursWeek: 20,
      surplusRule: "payable",
      weekStartIso: "2026-04-20",
      nowIso: "2026-05-24",
      isEncoded: true,
      isPaid: false,
    });

    expect(result.status).toBe("reportee");
    expect(result.badgeLabel).toBe("En retard");
  });

  it("TEST 12 : Combiné surplus + acompte + frais remboursables -> net = 50", () => {
    const result = calculateWeeklySettlement({
      workedHours: 25,
      contractHoursWeek: 20,
      surplusRule: "payable",
      hourlyRate: 12,
      acompteAmount: 20,
      fraisRemboursables: 10,
      weekStartIso: "2026-05-18",
      nowIso: "2026-05-24",
      isEncoded: true,
    });

    expect(result.grossPayableAmount).toBe(60);
    expect(result.netAfterFrais).toBe(50);
  });
});

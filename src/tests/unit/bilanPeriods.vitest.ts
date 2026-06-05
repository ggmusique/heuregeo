import { describe, expect, it } from "vitest";

import { PERIOD_TYPES } from "../../constants/bilanPeriods";
import { buildGroupedData } from "../../lib/bilanPeriods";
import type { Mission } from "../../types/entities";

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m-1",
    user_id: "test-user",
    patron_id: null,
    client_id: null,
    lieu_id: null,
    client: "Client test",
    lieu: "Tours",
    date_mission: "2026-04-06",
    date_iso: "2026-04-06",
    debut: "08:00",
    fin: "12:00",
    duree: 4,
    pause: 0,
    montant: 120,
    tarif: 30,
    ...overrides,
  };
}

describe("buildGroupedData", () => {
  it("regroupe un bilan mois par semaines avec les bons totaux", () => {
    const missions = [
      makeMission({ id: "m-1", date_iso: "2026-04-06", date_mission: "2026-04-06", duree: 4, montant: 120, client: "Alpha" }),
      makeMission({ id: "m-2", date_iso: "2026-04-07", date_mission: "2026-04-07", duree: 5, montant: 150, client: "Beta" }),
      makeMission({ id: "m-3", date_iso: "2026-04-14", date_mission: "2026-04-14", duree: 3, montant: 90, client: "Gamma" }),
    ];

    const grouped = buildGroupedData(missions, PERIOD_TYPES.MOIS);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.label).toMatch(/Semaine/i);
    expect(grouped[0]?.h).toBe(9);
    expect(grouped[0]?.e).toBe(270);
    expect(grouped[1]?.h).toBe(3);
    expect(grouped[1]?.e).toBe(90);
  });

  it("regroupe un bilan année par mois avec les bons totaux", () => {
    const missions = [
      makeMission({ id: "m-1", date_iso: "2026-01-10", date_mission: "2026-01-10", duree: 4, montant: 120 }),
      makeMission({ id: "m-2", date_iso: "2026-01-18", date_mission: "2026-01-18", duree: 6, montant: 180 }),
      makeMission({ id: "m-3", date_iso: "2026-02-04", date_mission: "2026-02-04", duree: 2.5, montant: 75 }),
    ];

    const grouped = buildGroupedData(missions, PERIOD_TYPES.ANNEE);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.label).toBe("JANVIER");
    expect(grouped[0]?.h).toBe(10);
    expect(grouped[0]?.e).toBe(300);
    expect(grouped[1]?.label).toBe("FÉVRIER");
    expect(grouped[1]?.h).toBe(2.5);
    expect(grouped[1]?.e).toBe(75);
  });

  it("annote un bilan mois avec le vrai statut paiement des semaines", () => {
    const missions = [
      makeMission({ id: "m-1", date_iso: "2026-04-06", date_mission: "2026-04-06" }),
      makeMission({ id: "m-2", date_iso: "2026-04-14", date_mission: "2026-04-14" }),
    ];

    const grouped = buildGroupedData(
      missions,
      PERIOD_TYPES.MOIS,
      new Map([
        [15, { paye: true, datePaiement: "2026-04-20", resteAPercevoir: 0 }],
        [16, { paye: false, datePaiement: null, resteAPercevoir: 210 }],
      ]),
    );

    expect(grouped[0]?.paymentStatus).toBe("paid");
    expect(grouped[0]?.paymentLabel).toBe("Payé");
    expect(grouped[1]?.paymentStatus).toBe("unpaid");
    expect(grouped[1]?.paymentRemaining).toBe(210);
  });

  it("annote un bilan année avec un statut agrégé partiel", () => {
    const missions = [
      makeMission({ id: "m-1", date_iso: "2026-01-10", date_mission: "2026-01-10" }),
      makeMission({ id: "m-2", date_iso: "2026-01-18", date_mission: "2026-01-18" }),
    ];

    const grouped = buildGroupedData(
      missions,
      PERIOD_TYPES.ANNEE,
      new Map([
        [2, { paye: true, datePaiement: "2026-01-12", resteAPercevoir: 0 }],
        [3, { paye: false, datePaiement: null, resteAPercevoir: 180 }],
      ]),
    );

    expect(grouped[0]?.paymentStatus).toBe("partial");
    expect(grouped[0]?.paymentLabel).toBe("1/2 semaines payées");
    expect(grouped[0]?.paymentRemaining).toBe(180);
  });
});
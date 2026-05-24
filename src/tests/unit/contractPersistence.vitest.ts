import { describe, expect, it } from "vitest";

import {
  buildContractFeaturesUpdate,
  resolveContractActive,
} from "../../features/contracts/contractSettingsPersistence";

const BASE = {
  plan: "pro" as const,
  contract_type: "other" as const,
  contract_hours_week: 20,
  surplus_rule: "payable" as const,
  surplus_split_pct: 50,
};

describe("Persistence contrat", () => {
  it("TEST 19 : Désactivation contrat — valeur false transmise", () => {
    const payload = buildContractFeaturesUpdate(BASE, {
      contractActive: false,
      contractType: "other",
      contractHoursWeek: 20,
      surplusRule: "payable",
      surplusSplitPct: 50,
    });

    expect(payload).toMatchObject({
      contract_active: false,
      contract_enabled: false,
      contract_reserve_enabled: false,
    });
  });

  it("TEST 20 : Réactivation contrat — valeur true transmise", () => {
    const payload = buildContractFeaturesUpdate(BASE, {
      contractActive: true,
      contractType: "other",
      contractHoursWeek: 20,
      surplusRule: "payable",
      surplusSplitPct: 50,
    });

    expect(payload).toMatchObject({
      contract_active: true,
      contract_enabled: true,
      contract_reserve_enabled: true,
    });
  });

  it("TEST 21 : Initialisation depuis base — toggle OFF", () => {
    const active = resolveContractActive({ ...BASE, contract_active: false });
    expect(active).toBe(false);
  });

  it("TEST 22 : Initialisation depuis base — champ absent => OFF", () => {
    // Migration ancienne: aucune clé contract_active/contract_enabled.
    // Le choix métier ici est conservateur: contrat inactif par défaut.
    const active = resolveContractActive({ ...BASE });
    expect(active).toBe(false);
  });

  it("TEST 23 : Cycle complet OFF -> ON -> OFF", () => {
    const off1 = buildContractFeaturesUpdate(BASE, {
      contractActive: false,
      contractType: "other",
      contractHoursWeek: 20,
      surplusRule: "payable",
      surplusSplitPct: 50,
    });
    const on = buildContractFeaturesUpdate(off1, {
      contractActive: true,
      contractType: "other",
      contractHoursWeek: 20,
      surplusRule: "payable",
      surplusSplitPct: 50,
    });
    const off2 = buildContractFeaturesUpdate(on, {
      contractActive: false,
      contractType: "other",
      contractHoursWeek: 20,
      surplusRule: "payable",
      surplusSplitPct: 50,
    });

    expect(off1.contract_active).toBe(false);
    expect(on.contract_active).toBe(true);
    expect(off2.contract_active).toBe(false);
  });
});

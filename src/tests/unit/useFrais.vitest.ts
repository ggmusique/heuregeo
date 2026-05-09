import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useFrais } from "../../hooks/useFrais";
import { getWeekNumber } from "../../utils/dateUtils";
import type { FraisDivers } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/api/fraisApi", () => ({
  fetchFrais: vi.fn(),
  createFrais: vi.fn(),
  updateFrais: vi.fn(),
  deleteFrais: vi.fn(),
}));

import * as fraisApi from "../../services/api/fraisApi";

// Réinitialise les compteurs entre chaque test
beforeEach(() => vi.clearAllMocks());

// ─── Factories ────────────────────────────────────────────────────────────────

// onError est une référence stable (ne change pas entre renders) — indispensable
// pour que les useCallback qui dépendent de [onError] ne se recréent pas en boucle.
const onError = vi.fn();

function makeFrais(overrides: Partial<FraisDivers> = {}): FraisDivers {
  return {
    id: "f1",
    user_id: "uid",
    patron_id: "patron-1",
    description: "Déplacement",
    montant: 25.5,
    date_frais: "2026-01-05",
    created_at: null,
    ...overrides,
  };
}

// Semaine ISO de référence : 2026-01-05 est la semaine 2, 2026-01-12 la semaine 3
const WEEK_2_DATE = "2026-01-05";
const WEEK_3_DATE = "2026-01-12";
const WEEK_2 = getWeekNumber(new Date(WEEK_2_DATE)); // 2
const WEEK_3 = getWeekNumber(new Date(WEEK_3_DATE)); // 3

// ─── 1. fetchFrais — chargement ───────────────────────────────────────────────

describe("fetchFrais — chargement", () => {
  it("popule fraisDivers avec la réponse API", async () => {
    const frais = [makeFrais({ id: "f1" }), makeFrais({ id: "f2" })];
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue(frais);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    expect(result.current.fraisDivers).toHaveLength(2);
    expect(result.current.fraisDivers[0].id).toBe("f1");
  });

  it("traite une réponse null comme [] (data || [])", async () => {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue(null as unknown as FraisDivers[]);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    expect(result.current.fraisDivers).toEqual([]);
  });

  it("loading est false après le chargement", async () => {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([]);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    expect(result.current.loading).toBe(false);
  });

  it("verrouille les appels concurrents via isFetching", async () => {
    let resolve!: (v: FraisDivers[]) => void;
    vi.mocked(fraisApi.fetchFrais).mockImplementationOnce(
      () => new Promise<FraisDivers[]>((res) => { resolve = res; })
    );

    const { result } = renderHook(() => useFrais(onError));

    // Premier appel — reste suspendu
    const p1 = result.current.fetchFrais();
    // Deuxième appel — isFetching.current est déjà true → retourne [] sans API
    const p2 = result.current.fetchFrais();

    const val2 = await p2;
    expect(val2).toEqual([]);
    expect(fraisApi.fetchFrais).toHaveBeenCalledTimes(1);

    // Libérer le premier appel
    await act(async () => { resolve([]); await p1; });
  });

  it("erreur API → appelle onError et propage l'exception", async () => {
    vi.mocked(fraisApi.fetchFrais).mockRejectedValue(new Error("DB fail"));

    const { result } = renderHook(() => useFrais(onError));

    await act(async () => {
      await expect(result.current.fetchFrais()).rejects.toThrow("DB fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("chargement frais"));
    expect(result.current.fraisDivers).toEqual([]);
  });
});

// ─── 2. createFrais — création ────────────────────────────────────────────────

describe("createFrais — création", () => {
  it("ajoute le frais retourné par l'API dans fraisDivers", async () => {
    const newFrais = makeFrais({ id: "new-f", montant: 50 });
    vi.mocked(fraisApi.createFrais).mockResolvedValue(newFrais);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.createFrais({ description: "Repas", montant: 50 }); });

    expect(result.current.fraisDivers).toHaveLength(1);
    expect(result.current.fraisDivers[0].id).toBe("new-f");
  });

  it("trie fraisDivers par date_frais après création (date antérieure en premier)", async () => {
    const f2 = makeFrais({ id: "f2", date_frais: "2026-01-10" });
    const f1 = makeFrais({ id: "f1", date_frais: "2026-01-05" });

    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([f2]);
    vi.mocked(fraisApi.createFrais).mockResolvedValue(f1);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });
    await act(async () => { await result.current.createFrais({ description: "Dépl", montant: 25, date_frais: "2026-01-05" }); });

    expect(result.current.fraisDivers[0].id).toBe("f1"); // Jan 5 avant Jan 10
    expect(result.current.fraisDivers[1].id).toBe("f2");
  });

  it("retourne le frais créé", async () => {
    const newFrais = makeFrais({ id: "ret-f" });
    vi.mocked(fraisApi.createFrais).mockResolvedValue(newFrais);

    const { result } = renderHook(() => useFrais(onError));
    let returned!: FraisDivers;
    await act(async () => { returned = await result.current.createFrais({}); });

    expect(returned.id).toBe("ret-f");
  });

  it("ne modifie pas l'état si l'API retourne null/undefined", async () => {
    vi.mocked(fraisApi.createFrais).mockResolvedValue(null as unknown as FraisDivers);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.createFrais({}); });

    expect(result.current.fraisDivers).toEqual([]);
  });

  it("erreur API → appelle onError et propage l'exception", async () => {
    vi.mocked(fraisApi.createFrais).mockRejectedValue(new Error("insert fail"));

    const { result } = renderHook(() => useFrais(onError));

    await act(async () => {
      await expect(result.current.createFrais({ montant: 10 })).rejects.toThrow("insert fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("création frais"));
  });
});

// ─── 3. updateFrais — mise à jour ─────────────────────────────────────────────

describe("updateFrais — mise à jour", () => {
  it("garde id vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => useFrais(onError));

    await act(async () => {
      await expect(result.current.updateFrais("", {})).rejects.toThrow("ID du frais manquant");
    });

    expect(fraisApi.updateFrais).not.toHaveBeenCalled();
  });

  it("met à jour le frais correspondant dans fraisDivers", async () => {
    const original = makeFrais({ id: "f1", montant: 25 });
    const updated = makeFrais({ id: "f1", montant: 99 });

    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([original]);
    vi.mocked(fraisApi.updateFrais).mockResolvedValue(updated);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });
    await act(async () => { await result.current.updateFrais("f1", { montant: 99 }); });

    expect(result.current.fraisDivers[0].montant).toBe(99);
  });

  it("trie fraisDivers par date_frais après mise à jour", async () => {
    const f1 = makeFrais({ id: "f1", date_frais: "2026-01-05" });
    const f2 = makeFrais({ id: "f2", date_frais: "2026-01-10" });
    // Après update, f1 reçoit une date plus tardive → doit aller après f2
    const f1Updated = makeFrais({ id: "f1", date_frais: "2026-01-20" });

    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([f1, f2]);
    vi.mocked(fraisApi.updateFrais).mockResolvedValue(f1Updated);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });
    await act(async () => { await result.current.updateFrais("f1", { date_frais: "2026-01-20" }); });

    expect(result.current.fraisDivers[0].id).toBe("f2"); // Jan 10 avant Jan 20
    expect(result.current.fraisDivers[1].id).toBe("f1");
  });

  it("retourne le frais mis à jour", async () => {
    const updated = makeFrais({ id: "f1", description: "Updated" });
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([makeFrais()]);
    vi.mocked(fraisApi.updateFrais).mockResolvedValue(updated);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    let returned!: FraisDivers;
    await act(async () => { returned = await result.current.updateFrais("f1", { description: "Updated" }); });

    expect(returned.description).toBe("Updated");
  });

  it("erreur API → appelle onError et propage l'exception", async () => {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([makeFrais()]);
    vi.mocked(fraisApi.updateFrais).mockRejectedValue(new Error("update fail"));

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    await act(async () => {
      await expect(result.current.updateFrais("f1", {})).rejects.toThrow("update fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("mise à jour frais"));
  });
});

// ─── 4. deleteFrais — suppression ─────────────────────────────────────────────

describe("deleteFrais — suppression", () => {
  it("garde id vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => useFrais(onError));

    await act(async () => {
      await expect(result.current.deleteFrais("")).rejects.toThrow("ID du frais manquant");
    });

    expect(fraisApi.deleteFrais).not.toHaveBeenCalled();
  });

  it("retire le frais de fraisDivers après suppression", async () => {
    const f1 = makeFrais({ id: "f1" });
    const f2 = makeFrais({ id: "f2" });

    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([f1, f2]);
    vi.mocked(fraisApi.deleteFrais).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });
    await act(async () => { await result.current.deleteFrais("f1"); });

    expect(result.current.fraisDivers).toHaveLength(1);
    expect(result.current.fraisDivers[0].id).toBe("f2");
  });

  it("loading est false après la suppression", async () => {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([makeFrais()]);
    vi.mocked(fraisApi.deleteFrais).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });
    await act(async () => { await result.current.deleteFrais("f1"); });

    expect(result.current.loading).toBe(false);
  });

  it("erreur API → appelle onError et propage l'exception (état non modifié)", async () => {
    const f1 = makeFrais({ id: "f1" });
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue([f1]);
    vi.mocked(fraisApi.deleteFrais).mockRejectedValue(new Error("delete fail"));

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    await act(async () => {
      await expect(result.current.deleteFrais("f1")).rejects.toThrow("delete fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("suppression frais"));
    // L'état n'a pas été modifié (l'erreur est survenue avant le filter)
    expect(result.current.fraisDivers).toHaveLength(1);
  });
});

// ─── 5. getFraisByWeek — filtre semaine ───────────────────────────────────────

describe("getFraisByWeek — filtre semaine", () => {
  // Population de l'état commune à tous les tests du groupe
  async function renderWithFrais(fraisList: FraisDivers[]) {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue(fraisList);
    const hook = renderHook(() => useFrais(onError));
    await act(async () => { await hook.result.current.fetchFrais(); });
    return hook;
  }

  it("retourne [] si weekNumber est 0 (falsy)", async () => {
    const { result } = await renderWithFrais([makeFrais()]);
    expect(result.current.getFraisByWeek(0)).toEqual([]);
  });

  it("filtre correctement par numéro de semaine ISO", async () => {
    const fSemaine2 = makeFrais({ id: "fw2", date_frais: WEEK_2_DATE });
    const fSemaine3 = makeFrais({ id: "fw3", date_frais: WEEK_3_DATE });

    const { result } = await renderWithFrais([fSemaine2, fSemaine3]);

    const res = result.current.getFraisByWeek(WEEK_2);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("fw2");
  });

  it("filtre en plus par patronId quand fourni", async () => {
    const fp1 = makeFrais({ id: "fp1", date_frais: WEEK_2_DATE, patron_id: "p1" });
    const fp2 = makeFrais({ id: "fp2", date_frais: WEEK_2_DATE, patron_id: "p2" });

    const { result } = await renderWithFrais([fp1, fp2]);

    const res = result.current.getFraisByWeek(WEEK_2, "p1");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("fp1");
  });

  it("ignore les frais dont date_frais est null", async () => {
    const fNull = makeFrais({ id: "fnull", date_frais: null });
    const { result } = await renderWithFrais([fNull]);

    expect(result.current.getFraisByWeek(WEEK_2)).toHaveLength(0);
  });

  it("pas de filtre patron si patronId est null", async () => {
    const fp1 = makeFrais({ id: "fp1", date_frais: WEEK_2_DATE, patron_id: "p1" });
    const fp2 = makeFrais({ id: "fp2", date_frais: WEEK_2_DATE, patron_id: "p2" });

    const { result } = await renderWithFrais([fp1, fp2]);

    const res = result.current.getFraisByWeek(WEEK_2, null);
    expect(res).toHaveLength(2);
  });
});

// ─── 6. getTotalFrais — calcul total ──────────────────────────────────────────

describe("getTotalFrais — calcul total", () => {
  it("liste vide → 0", () => {
    const { result } = renderHook(() => useFrais(onError));
    expect(result.current.getTotalFrais([])).toBe(0);
  });

  it("somme correcte des montants d'une liste explicite", () => {
    const { result } = renderHook(() => useFrais(onError));
    const list = [
      makeFrais({ id: "a", montant: 10 }),
      makeFrais({ id: "b", montant: 15.5 }),
      makeFrais({ id: "c", montant: 4.5 }),
    ];
    expect(result.current.getTotalFrais(list)).toBeCloseTo(30, 5);
  });

  it("utilise fraisDivers interne si aucune liste fournie", async () => {
    const frais = [makeFrais({ id: "a", montant: 20 }), makeFrais({ id: "b", montant: 30 })];
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue(frais);

    const { result } = renderHook(() => useFrais(onError));
    await act(async () => { await result.current.fetchFrais(); });

    expect(result.current.getTotalFrais()).toBeCloseTo(50, 5);
  });

  it("montant NaN ou non-numérique traité comme 0", () => {
    const { result } = renderHook(() => useFrais(onError));
    const list = [
      makeFrais({ id: "a", montant: "abc" as unknown as number }),
      makeFrais({ id: "b", montant: 10 }),
    ];
    expect(result.current.getTotalFrais(list)).toBeCloseTo(10, 5);
  });
});

// ─── 7. getFraisByPatron — filtre patron ──────────────────────────────────────

describe("getFraisByPatron — filtre patron", () => {
  async function renderWithFrais(fraisList: FraisDivers[]) {
    vi.mocked(fraisApi.fetchFrais).mockResolvedValue(fraisList);
    const hook = renderHook(() => useFrais(onError));
    await act(async () => { await hook.result.current.fetchFrais(); });
    return hook;
  }

  it("patronId null → retourne tous les frais", async () => {
    const f1 = makeFrais({ id: "f1", patron_id: "p1" });
    const f2 = makeFrais({ id: "f2", patron_id: "p2" });
    const { result } = await renderWithFrais([f1, f2]);

    expect(result.current.getFraisByPatron(null)).toHaveLength(2);
  });

  it("filtre uniquement les frais du patron demandé", async () => {
    const fp1 = makeFrais({ id: "fp1", patron_id: "p1" });
    const fp2 = makeFrais({ id: "fp2", patron_id: "p2" });
    const { result } = await renderWithFrais([fp1, fp2]);

    const res = result.current.getFraisByPatron("p1");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("fp1");
  });

  it("retourne [] si aucun frais ne correspond au patron", async () => {
    const { result } = await renderWithFrais([makeFrais({ patron_id: "p1" })]);
    expect(result.current.getFraisByPatron("p-inconnu")).toHaveLength(0);
  });
});

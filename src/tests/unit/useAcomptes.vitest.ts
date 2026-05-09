import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAcomptes } from "../../hooks/useAcomptes";
import type { Acompte, Mission, FraisDivers } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/api/acomptesApi", () => ({
  fetchAcomptes: vi.fn(),
  createAcompte: vi.fn(),
  deleteAcompte: vi.fn(),
  applyAcompte: vi.fn(),
  unapplyAcompte: vi.fn(),
}));

import * as acomptesApi from "../../services/api/acomptesApi";

// Réinitialise compteurs entre chaque test
beforeEach(() => vi.clearAllMocks());

// ─── Factories ────────────────────────────────────────────────────────────────

function makeAcompte(overrides: Partial<Acompte> = {}): Acompte {
  return {
    id: "a1",
    patron_id: "patron-1",
    montant: 100,
    date_acompte: "2026-01-10",
    ...overrides,
  };
}

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    user_id: "uid",
    patron_id: "patron-1",
    client_id: null,
    lieu_id: null,
    client: null,
    lieu: null,
    date_mission: "2026-01-05",
    date_iso: "2026-01-05",
    debut: "09:00",
    fin: "11:00",
    duree: 2,
    pause: 0,
    montant: 80,
    ...overrides,
  };
}

function makeFrais(overrides: Partial<FraisDivers> = {}): FraisDivers {
  return {
    id: "f1",
    patron_id: "patron-1",
    description: "Transport",
    montant: 20,
    date_frais: "2026-01-06",
    ...overrides,
  };
}

// ─── 1. fetchAcomptes ─────────────────────────────────────────────────────────

describe("fetchAcomptes — chargement et état", () => {
  it("peuple listeAcomptes avec les données de l'API", async () => {
    const data = [makeAcompte(), makeAcompte({ id: "a2", montant: 200 })];
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue(data);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.listeAcomptes).toHaveLength(2);
    expect(result.current.listeAcomptes[0].id).toBe("a1");
  });

  it("laisse listeAcomptes vide et retourne [] si l'API retourne un tableau vide", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([]);

    const { result } = renderHook(() => useAcomptes());
    const ret = await act(async () => result.current.fetchAcomptes());

    expect(result.current.listeAcomptes).toHaveLength(0);
    expect(ret).toEqual([]);
  });

  it("met loading à false une fois la requête terminée", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte()]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.loading).toBe(false);
  });

  it("ne relance pas l'API si un fetch est déjà en cours (verrou isFetching)", async () => {
    let resolveFirst!: (v: Acompte[]) => void;
    vi.mocked(acomptesApi.fetchAcomptes).mockReturnValue(
      new Promise((res) => { resolveFirst = res; })
    );

    const { result } = renderHook(() => useAcomptes());

    // Premier appel — reste en attente
    act(() => { result.current.fetchAcomptes(); });
    // Deuxième appel concurrent — doit être ignoré
    const second = await act(async () => result.current.fetchAcomptes());

    expect(second).toEqual([]);
    // L'API n'a été appelée qu'une fois
    expect(acomptesApi.fetchAcomptes).toHaveBeenCalledTimes(1);

    // Débloquer le premier pour ne pas laisser la promesse en suspens
    resolveFirst([]);
  });
});

// ─── 2. createAcompte ─────────────────────────────────────────────────────────

describe("createAcompte — création, optimisme, apply_acompte", () => {
  it("ajoute le nouvel acompte en tête de liste et appelle applyAcompte", async () => {
    const newAcompte = makeAcompte({ id: "new-1", montant: 150 });
    vi.mocked(acomptesApi.createAcompte).mockResolvedValue({
      acompte: newAcompte,
      autoPayApplied: false,
      autoPayError: null,
    });
    vi.mocked(acomptesApi.applyAcompte).mockResolvedValue(undefined);
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte({ id: "existing" })]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });
    await act(async () => { await result.current.createAcompte({ montant: 150, patron_id: "patron-1", date_acompte: "2026-02-01" }); });

    expect(result.current.listeAcomptes[0].id).toBe("new-1");
    expect(acomptesApi.applyAcompte).toHaveBeenCalledWith("new-1");
    expect(result.current.listeAcomptes).toHaveLength(2);
  });

  it("retourne autoPayApplied=true après apply_acompte réussi", async () => {
    const newAcompte = makeAcompte({ id: "new-2" });
    vi.mocked(acomptesApi.createAcompte).mockResolvedValue({
      acompte: newAcompte,
      autoPayApplied: false,
      autoPayError: null,
    });
    vi.mocked(acomptesApi.applyAcompte).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAcomptes());
    let res!: Awaited<ReturnType<typeof result.current.createAcompte>>;
    await act(async () => { res = await result.current.createAcompte({ montant: 100, patron_id: "patron-1", date_acompte: "2026-02-01" }); });

    expect(res.autoPayApplied).toBe(true);
  });

  it("lève une erreur si acompteData est falsy", async () => {
    const { result } = renderHook(() => useAcomptes());
    await expect(
      act(async () => result.current.createAcompte(null as unknown as Partial<Acompte>))
    ).rejects.toThrow("manquantes");
  });

  it("rejette si l'API createAcompte échoue et appelle onError", async () => {
    vi.mocked(acomptesApi.createAcompte).mockRejectedValue(new Error("DB error"));
    const onError = vi.fn();

    const { result } = renderHook(() => useAcomptes([], [], onError));
    await expect(
      act(async () => result.current.createAcompte({ montant: 100, date_acompte: "2026-02-01" }))
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("création"));
  });
});

// ─── 3. deleteAcompte ─────────────────────────────────────────────────────────

describe("deleteAcompte — unapply puis delete puis retrait du state", () => {
  it("appelle unapplyAcompte avant deleteAcompte dans l'ordre correct", async () => {
    const calls: string[] = [];
    vi.mocked(acomptesApi.unapplyAcompte).mockImplementation(async () => { calls.push("unapply"); });
    vi.mocked(acomptesApi.deleteAcompte).mockImplementation(async () => { calls.push("delete"); });
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte({ id: "del-1" })]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });
    await act(async () => { await result.current.deleteAcompte("del-1"); });

    expect(calls).toEqual(["unapply", "delete"]);
  });

  it("retire l'acompte supprimé du state local", async () => {
    vi.mocked(acomptesApi.unapplyAcompte).mockResolvedValue(undefined);
    vi.mocked(acomptesApi.deleteAcompte).mockResolvedValue(undefined);
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "keep" }),
      makeAcompte({ id: "del-me" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });
    expect(result.current.listeAcomptes).toHaveLength(2);

    await act(async () => { await result.current.deleteAcompte("del-me"); });
    expect(result.current.listeAcomptes).toHaveLength(1);
    expect(result.current.listeAcomptes[0].id).toBe("keep");
  });

  it("lève une erreur si l'id est manquant", async () => {
    const { result } = renderHook(() => useAcomptes());
    await expect(
      act(async () => result.current.deleteAcompte(""))
    ).rejects.toThrow("manquant");
  });

  it("propage l'erreur et appelle onError si unapply échoue", async () => {
    vi.mocked(acomptesApi.unapplyAcompte).mockRejectedValue(new Error("RPC fail"));
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte({ id: "a1" })]);
    const onError = vi.fn();

    const { result } = renderHook(() => useAcomptes([], [], onError));
    await act(async () => { await result.current.fetchAcomptes(); });
    await expect(
      act(async () => result.current.deleteAcompte("a1"))
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("allocation"));
    expect(acomptesApi.deleteAcompte).not.toHaveBeenCalled();
  });
});

// ─── 4. getTotalAcomptesJusqua ───────────────────────────────────────────────

describe("getTotalAcomptesJusqua — cumul jusqu'à une date", () => {
  it("additionne tous les acomptes dont la date est ≤ dateFin", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", montant: 100, date_acompte: "2026-01-05" }),
      makeAcompte({ id: "a2", montant: 200, date_acompte: "2026-01-10" }),
      makeAcompte({ id: "a3", montant: 50,  date_acompte: "2026-01-15" }), // après dateFin
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    const total = result.current.getTotalAcomptesJusqua("2026-01-12");
    expect(total).toBeCloseTo(300, 5);
  });

  it("retourne 0 si dateFin est vide", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte()]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getTotalAcomptesJusqua("")).toBe(0);
  });

  it("filtre par patronId si fourni", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", patron_id: "patron-1", montant: 100, date_acompte: "2026-01-05" }),
      makeAcompte({ id: "a2", patron_id: "patron-2", montant: 300, date_acompte: "2026-01-05" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getTotalAcomptesJusqua("2026-01-31", "patron-1")).toBeCloseTo(100, 5);
  });

  it("inclut l'acompte dont la date est exactement égale à dateFin", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", montant: 80, date_acompte: "2026-01-10" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getTotalAcomptesJusqua("2026-01-10")).toBeCloseTo(80, 5);
  });
});

// ─── 5. getSoldeAvant ────────────────────────────────────────────────────────

describe("getSoldeAvant — porte-monnaie : acomptes − missions/frais strictement avant la date", () => {
  it("retourne 0 si dateRef est vide", async () => {
    const { result } = renderHook(() => useAcomptes());
    expect(result.current.getSoldeAvant("")).toBe(0);
  });

  it("retourne le solde résiduel après consommation par les missions", async () => {
    // Acompte 300 €, mission 80 € avant le 2026-01-20 → solde = 220 €
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 300, date_acompte: "2026-01-01" }),
    ]);
    const missions = [makeMission({ montant: 80, date_iso: "2026-01-10" })];

    const { result } = renderHook(() => useAcomptes(missions));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeAvant("2026-01-20")).toBeCloseTo(220, 5);
  });

  it("ne descend jamais en dessous de 0 même si missions > acomptes", async () => {
    // Acompte 50 €, mission 200 € → solde = 0 (pas −150)
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 50, date_acompte: "2026-01-01" }),
    ]);
    const missions = [makeMission({ montant: 200, date_iso: "2026-01-05" })];

    const { result } = renderHook(() => useAcomptes(missions));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeAvant("2026-01-20")).toBe(0);
  });

  it("exclut strictement les événements dont la date = dateRef (limite non inclusive)", async () => {
    // Acompte le 2026-01-20 (jour de référence) → ne doit PAS compter
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 200, date_acompte: "2026-01-20" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeAvant("2026-01-20")).toBe(0);
  });

  it("tient compte des frais en plus des missions dans la consommation", async () => {
    // Acompte 300 €, mission 100 €, frais 50 € → solde = 150 €
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 300, date_acompte: "2026-01-01" }),
    ]);
    const missions = [makeMission({ montant: 100, date_iso: "2026-01-05" })];
    const frais = [makeFrais({ montant: 50, date_frais: "2026-01-06" })];

    const { result } = renderHook(() => useAcomptes(missions, frais));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeAvant("2026-01-20")).toBeCloseTo(150, 5);
  });

  it("filtre par patronId : ignore les acomptes/missions d'un autre patron", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ patron_id: "patron-1", montant: 200, date_acompte: "2026-01-01" }),
      makeAcompte({ patron_id: "patron-2", montant: 500, date_acompte: "2026-01-01" }),
    ]);
    const missions = [makeMission({ patron_id: "patron-1", montant: 80, date_iso: "2026-01-05" })];

    const { result } = renderHook(() => useAcomptes(missions));
    await act(async () => { await result.current.fetchAcomptes(); });

    // patron-1 : 200 − 80 = 120
    expect(result.current.getSoldeAvant("2026-01-20", "patron-1")).toBeCloseTo(120, 5);
  });
});

// ─── 6. getAcomptesDansPeriode ───────────────────────────────────────────────

describe("getAcomptesDansPeriode — fenêtre inclusive [dateDebut, dateFin]", () => {
  it("retourne 0 si dateDebut ou dateFin est vide", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([makeAcompte()]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getAcomptesDansPeriode("", "2026-01-31")).toBe(0);
    expect(result.current.getAcomptesDansPeriode("2026-01-01", "")).toBe(0);
  });

  it("additionne les acomptes dans la fenêtre inclusive", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", montant: 100, date_acompte: "2026-01-01" }), // avant
      makeAcompte({ id: "a2", montant: 150, date_acompte: "2026-01-10" }), // dans
      makeAcompte({ id: "a3", montant: 200, date_acompte: "2026-01-20" }), // dans
      makeAcompte({ id: "a4", montant: 50,  date_acompte: "2026-01-25" }), // après
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    // Fenêtre S2 : 2026-01-05 → 2026-01-11
    expect(result.current.getAcomptesDansPeriode("2026-01-05", "2026-01-21")).toBeCloseTo(350, 5);
  });

  it("inclut les acomptes aux bornes exactes de la période", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "start", montant: 100, date_acompte: "2026-01-05" }),
      makeAcompte({ id: "end",   montant: 100, date_acompte: "2026-01-11" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getAcomptesDansPeriode("2026-01-05", "2026-01-11")).toBeCloseTo(200, 5);
  });

  it("filtre par patronId à l'intérieur de la période", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "p1", patron_id: "patron-1", montant: 100, date_acompte: "2026-01-10" }),
      makeAcompte({ id: "p2", patron_id: "patron-2", montant: 300, date_acompte: "2026-01-10" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getAcomptesDansPeriode("2026-01-01", "2026-01-31", "patron-1")).toBeCloseTo(100, 5);
  });
});

// ─── 7. getSoldeTotal ────────────────────────────────────────────────────────

describe("getSoldeTotal — solde actuel (acomptes − missions − frais)", () => {
  it("retourne acomptes − missions − frais si positif", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 500 }),
    ]);
    const missions = [makeMission({ montant: 200 })];
    const frais = [makeFrais({ montant: 50 })];

    const { result } = renderHook(() => useAcomptes(missions, frais));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeTotal()).toBeCloseTo(250, 5);
  });

  it("retourne 0 si les dépenses dépassent les acomptes (jamais négatif)", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ montant: 100 }),
    ]);
    const missions = [makeMission({ montant: 300 })];

    const { result } = renderHook(() => useAcomptes(missions));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeTotal()).toBe(0);
  });

  it("filtre par patronId : n'inclut que les données du patron demandé", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ patron_id: "patron-1", montant: 300 }),
      makeAcompte({ patron_id: "patron-2", montant: 1000 }),
    ]);
    const missions = [makeMission({ patron_id: "patron-1", montant: 100 })];

    const { result } = renderHook(() => useAcomptes(missions));
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getSoldeTotal("patron-1")).toBeCloseTo(200, 5);
  });
});

// ─── 8. getAcomptesByPatron ──────────────────────────────────────────────────

describe("getAcomptesByPatron — liste filtrée par patron", () => {
  it("retourne tous les acomptes si patronId est null", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", patron_id: "p1" }),
      makeAcompte({ id: "a2", patron_id: "p2" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getAcomptesByPatron(null)).toHaveLength(2);
  });

  it("retourne uniquement les acomptes du patron demandé", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", patron_id: "p1" }),
      makeAcompte({ id: "a2", patron_id: "p2" }),
      makeAcompte({ id: "a3", patron_id: "p1" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    const res = result.current.getAcomptesByPatron("p1");
    expect(res).toHaveLength(2);
    expect(res.every((a) => a.patron_id === "p1")).toBe(true);
  });

  it("retourne [] si le patron n'a aucun acompte", async () => {
    vi.mocked(acomptesApi.fetchAcomptes).mockResolvedValue([
      makeAcompte({ id: "a1", patron_id: "p1" }),
    ]);

    const { result } = renderHook(() => useAcomptes());
    await act(async () => { await result.current.fetchAcomptes(); });

    expect(result.current.getAcomptesByPatron("p-inexistant")).toHaveLength(0);
  });
});

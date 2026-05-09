import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMissions } from "../../hooks/useMissions";
import * as missionsApi from "../../services/api/missionsApi";
import type { Mission } from "../../types/entities";

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../services/api/missionsApi", () => ({
  fetchMissions:     vi.fn(),
  createMission:     vi.fn(),
  updateMission:     vi.fn(),
  deleteMission:     vi.fn(),
  bulkInsertMissions: vi.fn(),
}));

vi.mock("../../contexts/LabelsContext", () => ({
  useLabels: () => ({ client: "client", lieu: "lieu", patron: "patron" }),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────
//   "2026-01-05" (lun.) = semaine ISO 2,  2026
//   "2026-01-12" (lun.) = semaine ISO 3,  2026
//   "2026-02-10" (mar.) = semaine ISO 7,  2026

const MISSIONS: import("../../types/entities").Mission[] = [
  {
    id: "m1",
    user_id: "u1",
    date_mission: "2026-01-05", date_iso: "2026-01-05",
    debut: "08:00", fin: "12:00",
    patron_id: "p1", client_id: null, lieu_id: null,
    client: "ClientA", lieu: "LieuX",
    duree: 4, pause: 0, montant: 80,
  },
  {
    id: "m2",
    user_id: "u1",
    date_mission: "2026-01-12", date_iso: "2026-01-12",
    debut: "14:00", fin: "18:00",
    patron_id: "p2", client_id: null, lieu_id: null,
    client: "ClientB", lieu: "LieuY",
    duree: 4, pause: 0, montant: 80,
  },
  {
    id: "m3",
    user_id: "u1",
    date_mission: "2026-02-10", date_iso: "2026-02-10",
    debut: "09:00", fin: "17:00",
    patron_id: "p1", client_id: null, lieu_id: null,
    client: "ClientA", lieu: "LieuZ",
    duree: 8, pause: 0, montant: 160,
  },
];

// Données valides : date inédite → aucun chevauchement possible avec MISSIONS
const VALID_MISSION_DATA: Partial<import("../../types/entities").Mission> = {
  date_iso:  "2026-03-01",
  debut:     "10:00",
  fin:       "15:00",
  patron_id: "p1",
  client_id: "c1",
  lieu_id:   "l1",
};

// ─── Helper ────────────────────────────────────────────────────────────────

async function renderWithMissions(missions = MISSIONS) {
  vi.mocked(missionsApi.fetchMissions).mockResolvedValueOnce(missions);
  const hook = renderHook(() => useMissions(vi.fn()));
  await act(async () => {
    await hook.result.current.fetchMissions();
  });
  return hook;
}

// ───────────────────────────────────────────────────────────────────────────
// Groupe A — filtres purs (aucun appel réseau)
// ───────────────────────────────────────────────────────────────────────────

describe("useMissions – getMissionsByWeek", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne la mission de la semaine 2 (2026)", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByWeek(2, null, 2026);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("m1");
  });

  it("filtre aussi par patronId — p1 en semaine 3 → liste vide", async () => {
    const { result } = await renderWithMissions();
    // m2 est en semaine 3 mais appartient à p2, pas p1
    const res = result.current.getMissionsByWeek(3, "p1", 2026);
    expect(res).toHaveLength(0);
  });

  it("retourne m2 en semaine 3 sans filtre patron", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByWeek(3, null, 2026);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("m2");
  });
});

describe("useMissions – getMissionsByPeriod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtre par mois '2026-01' → m1 et m2", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPeriod("mois", "2026-01");
    expect(res).toHaveLength(2);
    expect(res.map((m) => m.id).sort()).toEqual(["m1", "m2"]);
  });

  it("filtre par année '2026' → les 3 missions", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPeriod("année", "2026");
    expect(res).toHaveLength(3);
  });

  it("filtre par semaine '2' (2026) → uniquement m1", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPeriod("semaine", "2", null, 2026);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("m1");
  });
});

describe("useMissions – getMissionsByPatron", () => {
  beforeEach(() => vi.clearAllMocks());

  it("patron 'p1' → m1 et m3", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPatron("p1");
    expect(res.map((m) => m.id).sort()).toEqual(["m1", "m3"]);
  });

  it("patronId null → toutes les missions", async () => {
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPatron(null);
    expect(res).toHaveLength(3);
  });
});

describe("useMissions – clientsUniques / lieuxUniques", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clientsUniques contient 2 valeurs distinctes (ClientA dédupliqué)", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.clientsUniques).toHaveLength(2);
    expect(result.current.clientsUniques).toContain("ClientA");
    expect(result.current.clientsUniques).toContain("ClientB");
  });

  it("lieuxUniques liste les 3 lieux distincts", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.lieuxUniques).toHaveLength(3);
    expect(result.current.lieuxUniques).toContain("LieuX");
    expect(result.current.lieuxUniques).toContain("LieuY");
    expect(result.current.lieuxUniques).toContain("LieuZ");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe B — CRUD
// ───────────────────────────────────────────────────────────────────────────

describe("useMissions – fetchMissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("charge les missions dans le state et repasse loading à false", async () => {
    vi.mocked(missionsApi.fetchMissions).mockResolvedValueOnce(MISSIONS);
    const { result } = renderHook(() => useMissions(vi.fn()));

    await act(async () => {
      await result.current.fetchMissions();
    });

    expect(missionsApi.fetchMissions).toHaveBeenCalledTimes(1);
    expect(result.current.missions).toHaveLength(3);
    expect(result.current.loading).toBe(false);
  });

  it("passe loading false → true → false pendant le fetch", async () => {
    let resolveApi: ((value: unknown) => void) | undefined;
    const deferred = new Promise((r) => { resolveApi = r; });
    vi.mocked(missionsApi.fetchMissions).mockReturnValueOnce(deferred as Promise<any>);

    const { result } = renderHook(() => useMissions(vi.fn()));
    expect(result.current.loading).toBe(false);

    // Démarre le fetch sans l'attendre — act() synchrone flush setLoading(true)
    let fetchPromise: Promise<unknown> | undefined;
    act(() => { fetchPromise = result.current.fetchMissions(); });
    expect(result.current.loading).toBe(true);

    // Résout la promesse et attend la fin
    await act(async () => {
      resolveApi?.([]);
      await fetchPromise;
    });
    expect(result.current.loading).toBe(false);
  });
});

describe("useMissions – createMission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle missionsApi.createMission avec les données fournies", async () => {
    const { result } = await renderWithMissions([]);
    const newMission = { id: "m-new", ...VALID_MISSION_DATA } as Mission;
    vi.mocked(missionsApi.createMission).mockResolvedValueOnce(newMission);

    await act(async () => {
      await result.current.createMission(VALID_MISSION_DATA);
    });

    expect(missionsApi.createMission).toHaveBeenCalledWith(VALID_MISSION_DATA);
  });

  it("ajoute la mission retournée en tête de liste (optimistic update)", async () => {
    const { result } = await renderWithMissions([]);
    const newMission = { id: "m-new", ...VALID_MISSION_DATA } as Mission;
    vi.mocked(missionsApi.createMission).mockResolvedValueOnce(newMission);

    await act(async () => {
      await result.current.createMission(VALID_MISSION_DATA);
    });

    expect(result.current.missions[0].id).toBe("m-new");
  });
});

describe("useMissions – updateMission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle missionsApi.updateMission avec l'id et les données", async () => {
    const { result } = await renderWithMissions();
    const updatedMission = { id: "m1", ...VALID_MISSION_DATA } as Mission;
    vi.mocked(missionsApi.updateMission).mockResolvedValueOnce(updatedMission);

    await act(async () => {
      await result.current.updateMission("m1", VALID_MISSION_DATA);
    });

    expect(missionsApi.updateMission).toHaveBeenCalledWith("m1", VALID_MISSION_DATA);
  });

  it("remplace la mission dans la liste (optimistic update)", async () => {
    const { result } = await renderWithMissions();
    const updatedMission = { id: "m1", ...VALID_MISSION_DATA } as Mission;
    vi.mocked(missionsApi.updateMission).mockResolvedValueOnce(updatedMission);

    await act(async () => {
      await result.current.updateMission("m1", VALID_MISSION_DATA);
    });

    const m1InState = result.current.missions.find((m) => m.id === "m1");
    expect(m1InState).toMatchObject(updatedMission);
  });
});

describe("useMissions – deleteMission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle missionsApi.deleteMission avec l'id", async () => {
    const { result } = await renderWithMissions();
    vi.mocked(missionsApi.deleteMission).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.deleteMission("m1");
    });

    expect(missionsApi.deleteMission).toHaveBeenCalledWith("m1");
  });

  it("retire la mission de la liste", async () => {
    const { result } = await renderWithMissions();
    vi.mocked(missionsApi.deleteMission).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.deleteMission("m1");
    });

    expect(result.current.missions).toHaveLength(2);
    expect(result.current.missions.find((m) => m.id === "m1")).toBeUndefined();
  });
});

describe("useMissions – bulkCreateMissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle bulkInsertMissions puis refetch les missions", async () => {
    const { result } = await renderWithMissions();
    vi.mocked(missionsApi.bulkInsertMissions).mockResolvedValueOnce([]);
    vi.mocked(missionsApi.fetchMissions).mockResolvedValueOnce(MISSIONS); // pour le refetch interne

    await act(async () => {
      await result.current.bulkCreateMissions([VALID_MISSION_DATA]);
    });

    expect(missionsApi.bulkInsertMissions).toHaveBeenCalledWith([VALID_MISSION_DATA]);
    // 1 appel via renderWithMissions + 1 refetch depuis bulkCreateMissions
    expect(missionsApi.fetchMissions).toHaveBeenCalledTimes(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe C — validation
// ───────────────────────────────────────────────────────────────────────────

describe("useMissions – validation createMission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle onError si client_id est absent", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .createMission({ ...VALID_MISSION_DATA, client_id: undefined })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("client"));
  });

  it("appelle onError si lieu_id est absent", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .createMission({ ...VALID_MISSION_DATA, lieu_id: undefined })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("lieu"));
  });

  it("appelle onError en cas de chevauchement horaire", async () => {
    const onError = vi.fn();
    vi.mocked(missionsApi.fetchMissions).mockResolvedValueOnce(MISSIONS);
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current.fetchMissions();
    });

    // 10:00–14:00 le 2026-01-05 chevauche m1 (08:00–12:00)
    const overlapping = {
      ...VALID_MISSION_DATA,
      date_iso: "2026-01-05",
      debut:    "10:00",
      fin:      "14:00",
    };

    await act(async () => {
      await result.current.createMission(overlapping).catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Créneau déjà occupé")
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Groupe D — couverture complémentaire (lacunes de la suite initiale)
// ───────────────────────────────────────────────────────────────────────────

// Semaine ISO 10 / 2025 : "2025-03-03" (lundi)
// Semaine ISO 10 / 2026 : "2026-03-02" (lundi)
// Utilisé pour tester le fix bug « même n° semaine, années différentes ».

describe("useMissions – fetchMissions (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ne lance pas un second appel API si un fetch est déjà en cours (isFetching lock)", async () => {
    let resolve!: (v: Mission[]) => void;
    vi.mocked(missionsApi.fetchMissions).mockImplementation(
      () => new Promise<Mission[]>((r) => { resolve = r; })
    );
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    act(() => { result.current.fetchMissions(); });
    act(() => { result.current.fetchMissions(); }); // second call ignoré
    resolve([]);
    await act(async () => {});

    expect(missionsApi.fetchMissions).toHaveBeenCalledTimes(1);
  });

  it("appelle onError et propage l'exception si l'API échoue", async () => {
    vi.mocked(missionsApi.fetchMissions).mockRejectedValue(new Error("network"));
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await expect(
      act(async () => { await result.current.fetchMissions(); })
    ).rejects.toThrow("network");

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Erreur connexion"));
  });

  it("traite une réponse null comme tableau vide", async () => {
    vi.mocked(missionsApi.fetchMissions).mockResolvedValue(null as unknown as Mission[]);
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => { await result.current.fetchMissions(); });

    expect(result.current.missions).toEqual([]);
  });
});

describe("useMissions – validation createMission (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejette si patron_id est absent", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .createMission({ ...VALID_MISSION_DATA, patron_id: undefined })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("patron"));
    expect(missionsApi.createMission).not.toHaveBeenCalled();
  });

  it("rejette si fin <= debut", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .createMission({ ...VALID_MISSION_DATA, debut: "14:00", fin: "10:00" })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("fin doit être après"));
  });

  it("rejette si pause >= durée brute (60 min brut, pause 60)", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .createMission({ ...VALID_MISSION_DATA, debut: "09:00", fin: "10:00", pause: 60 })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("pause dépasse"));
  });

  it("accepte une mission adjacente (fin existing = debut new — aucun overlap)", async () => {
    // m1 dans MISSIONS : 08:00–12:00 le 2026-01-05
    // nouvelle mission : 12:00–14:00 le même jour → adjacente, pas chevauchante
    vi.mocked(missionsApi.fetchMissions).mockResolvedValue(MISSIONS);
    const returnedMission: Mission = {
      ...(VALID_MISSION_DATA as Mission),
      id: "m-adj",
      date_mission: "2026-01-05",
      date_iso: "2026-01-05",
      debut: "12:00",
      fin: "14:00",
    };
    vi.mocked(missionsApi.createMission).mockResolvedValue(returnedMission);
    const { result } = renderHook(() => useMissions(vi.fn()));

    await act(async () => { await result.current.fetchMissions(); });
    await act(async () => {
      await result.current.createMission({
        ...VALID_MISSION_DATA,
        date_iso: "2026-01-05",
        debut: "12:00",
        fin: "14:00",
      });
    });

    // newStart(720) < existEnd(720) → false → pas de conflit
    expect(missionsApi.createMission).toHaveBeenCalledTimes(1);
  });

  it("appelle onError et propage si l'API échoue (erreur réseau)", async () => {
    vi.mocked(missionsApi.createMission).mockRejectedValue(new Error("DB write error"));
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await expect(
      act(async () => { await result.current.createMission(VALID_MISSION_DATA); })
    ).rejects.toThrow("DB write error");

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Erreur création"));
  });
});

describe("useMissions – updateMission (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejette si id est vide", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await expect(
      act(async () => result.current.updateMission("", VALID_MISSION_DATA))
    ).rejects.toThrow("ID de la mission manquant");
  });

  it("valide les données avant l'appel API (client_id absent → rejet)", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => {
      await result.current
        .updateMission("m1", { ...VALID_MISSION_DATA, client_id: undefined })
        .catch(() => {});
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("client"));
    expect(missionsApi.updateMission).not.toHaveBeenCalled();
  });

  it("l'overlap detection exclut la mission elle-même (pas de conflit avec soi-même)", async () => {
    // Mission avec tous les champs requis par la validation (client_id, lieu_id, patron_id)
    const m: Mission = {
      id: "m-self",
      user_id: "u1",
      patron_id: "p1",
      client_id: "c1",
      lieu_id: "l1",
      client: "Client",
      lieu: "Bureau",
      date_mission: "2026-01-05",
      date_iso: "2026-01-05",
      debut: "08:00",
      fin: "12:00",
      duree: 4,
      pause: 0,
      montant: 80,
    };
    vi.mocked(missionsApi.fetchMissions).mockResolvedValue([m]);
    const extended: Mission = { ...m, fin: "13:00", duree: 5 };
    vi.mocked(missionsApi.updateMission).mockResolvedValue(extended);
    const { result } = renderHook(() => useMissions(vi.fn()));

    await act(async () => { await result.current.fetchMissions(); });
    // Étendre m-self de 08:00–13:00 chevaucherait m-self (08:00–12:00),
    // mais m-self est exclu du check via excludeId → pas de conflit
    await act(async () => {
      await result.current.updateMission("m-self", { ...m, fin: "13:00" });
    });

    expect(missionsApi.updateMission).toHaveBeenCalledTimes(1);
  });
});

describe("useMissions – deleteMission (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejette si id est vide", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await expect(
      act(async () => result.current.deleteMission(""))
    ).rejects.toThrow("ID de la mission manquant");
  });

  it("appelle onError et propage si l'API échoue", async () => {
    vi.mocked(missionsApi.deleteMission).mockRejectedValue(new Error("FK constraint"));
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await expect(
      act(async () => result.current.deleteMission("m1"))
    ).rejects.toThrow("FK constraint");

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("suppression"));
  });
});

describe("useMissions – bulkCreateMissions (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ne fait aucun appel API si le tableau est vide", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useMissions(onError));

    await act(async () => { await result.current.bulkCreateMissions([]); });

    expect(missionsApi.bulkInsertMissions).not.toHaveBeenCalled();
    expect(missionsApi.fetchMissions).not.toHaveBeenCalled();
  });
});

describe("useMissions – getMissionsByWeek (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne [] si weekNumber vaut 0 (sentinel)", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.getMissionsByWeek(0)).toEqual([]);
  });

  it("n'inclut PAS une mission de la même semaine ISO mais d'une autre année (fix bug year)", async () => {
    const w10_2025: Mission = {
      ...MISSIONS[0],
      id: "old",
      date_mission: "2025-03-03",
      date_iso: "2025-03-03",
    };
    const w10_2026: Mission = {
      ...MISSIONS[0],
      id: "new",
      date_mission: "2026-03-02",
      date_iso: "2026-03-02",
    };
    const { result } = await renderWithMissions([w10_2025, w10_2026]);

    const res2026 = result.current.getMissionsByWeek(10, null, 2026);
    expect(res2026).toHaveLength(1);
    expect(res2026[0].id).toBe("new");

    const res2025 = result.current.getMissionsByWeek(10, null, 2025);
    expect(res2025).toHaveLength(1);
    expect(res2025[0].id).toBe("old");
  });

  it("exclut les missions dont date_mission et date_iso sont toutes deux null", async () => {
    const noDate: Mission = { ...MISSIONS[0], id: "no-date", date_mission: null, date_iso: null };
    const { result } = await renderWithMissions([noDate]);

    expect(result.current.getMissionsByWeek(2, null, 2026)).toEqual([]);
  });
});

describe("useMissions – getMissionsByPeriod (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne [] si periodType est vide", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.getMissionsByPeriod("", 2, null, 2026)).toEqual([]);
  });

  it("retourne [] si periodValue est 0 (falsy)", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.getMissionsByPeriod("semaine", 0, null, 2026)).toEqual([]);
  });

  it("filtre par patronId dans getMissionsByPeriod (type mois)", async () => {
    // m1 = p1, m2 = p2, tous deux en janvier 2026
    const { result } = await renderWithMissions();
    const res = result.current.getMissionsByPeriod("mois", "2026-01", "p1");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("m1");
  });
});

describe("useMissions – getMissionsByPatron (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retourne [] si le patronId est inconnu", async () => {
    const { result } = await renderWithMissions();
    expect(result.current.getMissionsByPatron("inexistant")).toEqual([]);
  });
});

describe("useMissions – clientsUniques / lieuxUniques (compléments)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exclut les valeurs null des listes dérivées", async () => {
    const noNames: Mission = { ...MISSIONS[0], id: "no-names", client: null, lieu: null };
    const { result } = await renderWithMissions([noNames]);

    expect(result.current.clientsUniques).toEqual([]);
    expect(result.current.lieuxUniques).toEqual([]);
  });
});

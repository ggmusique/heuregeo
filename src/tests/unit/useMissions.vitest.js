import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMissions } from "../../hooks/useMissions";
import * as missionsApi from "../../services/api/missionsApi";

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

const MISSIONS = [
  {
    id: "m1",
    date_mission: "2026-01-05", date_iso: "2026-01-05",
    debut: "08:00", fin: "12:00",
    patron_id: "p1", client: "ClientA", lieu: "LieuX",
  },
  {
    id: "m2",
    date_mission: "2026-01-12", date_iso: "2026-01-12",
    debut: "14:00", fin: "18:00",
    patron_id: "p2", client: "ClientB", lieu: "LieuY",
  },
  {
    id: "m3",
    date_mission: "2026-02-10", date_iso: "2026-02-10",
    debut: "09:00", fin: "17:00",
    patron_id: "p1", client: "ClientA", lieu: "LieuZ",
  },
];

// Données valides : date inédite → aucun chevauchement possible avec MISSIONS
const VALID_MISSION_DATA = {
  date_iso:  "2026-03-01",
  debut:     "10:00",
  fin:       "15:00",
  patron_id: "p1",
  client_id: "c1",
  lieu_id:   "l1",
};

// ─── Helper ────────────────────────────────────────────────────────────────

async function renderWithMissions(missions = MISSIONS) {
  missionsApi.fetchMissions.mockResolvedValueOnce(missions);
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
    missionsApi.fetchMissions.mockResolvedValueOnce(MISSIONS);
    const { result } = renderHook(() => useMissions(vi.fn()));

    await act(async () => {
      await result.current.fetchMissions();
    });

    expect(missionsApi.fetchMissions).toHaveBeenCalledTimes(1);
    expect(result.current.missions).toHaveLength(3);
    expect(result.current.loading).toBe(false);
  });

  it("passe loading false → true → false pendant le fetch", async () => {
    let resolveApi;
    const deferred = new Promise((r) => { resolveApi = r; });
    missionsApi.fetchMissions.mockReturnValueOnce(deferred);

    const { result } = renderHook(() => useMissions(vi.fn()));
    expect(result.current.loading).toBe(false);

    // Démarre le fetch sans l'attendre — act() synchrone flush setLoading(true)
    let fetchPromise;
    act(() => { fetchPromise = result.current.fetchMissions(); });
    expect(result.current.loading).toBe(true);

    // Résout la promesse et attend la fin
    await act(async () => {
      resolveApi([]);
      await fetchPromise;
    });
    expect(result.current.loading).toBe(false);
  });
});

describe("useMissions – createMission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle missionsApi.createMission avec les données fournies", async () => {
    const { result } = await renderWithMissions([]);
    const newMission = { id: "m-new", ...VALID_MISSION_DATA };
    missionsApi.createMission.mockResolvedValueOnce(newMission);

    await act(async () => {
      await result.current.createMission(VALID_MISSION_DATA);
    });

    expect(missionsApi.createMission).toHaveBeenCalledWith(VALID_MISSION_DATA);
  });

  it("ajoute la mission retournée en tête de liste (optimistic update)", async () => {
    const { result } = await renderWithMissions([]);
    const newMission = { id: "m-new", ...VALID_MISSION_DATA };
    missionsApi.createMission.mockResolvedValueOnce(newMission);

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
    const updatedMission = { id: "m1", ...VALID_MISSION_DATA };
    missionsApi.updateMission.mockResolvedValueOnce(updatedMission);

    await act(async () => {
      await result.current.updateMission("m1", VALID_MISSION_DATA);
    });

    expect(missionsApi.updateMission).toHaveBeenCalledWith("m1", VALID_MISSION_DATA);
  });

  it("remplace la mission dans la liste (optimistic update)", async () => {
    const { result } = await renderWithMissions();
    const updatedMission = { id: "m1", ...VALID_MISSION_DATA };
    missionsApi.updateMission.mockResolvedValueOnce(updatedMission);

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
    missionsApi.deleteMission.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.deleteMission("m1");
    });

    expect(missionsApi.deleteMission).toHaveBeenCalledWith("m1");
  });

  it("retire la mission de la liste", async () => {
    const { result } = await renderWithMissions();
    missionsApi.deleteMission.mockResolvedValueOnce(undefined);

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
    missionsApi.bulkInsertMissions.mockResolvedValueOnce([]);
    missionsApi.fetchMissions.mockResolvedValueOnce(MISSIONS); // pour le refetch interne

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
    missionsApi.fetchMissions.mockResolvedValueOnce(MISSIONS);
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

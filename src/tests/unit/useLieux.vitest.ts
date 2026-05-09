import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useLieux } from "../../hooks/useLieux";
import type { Lieu } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/api/lieuxApi", () => ({
  fetchLieux: vi.fn(),
  createLieu: vi.fn(),
  updateLieu: vi.fn(),
  deleteLieu: vi.fn(),
}));

import * as lieuxApi from "../../services/api/lieuxApi";

// onError — référence stable au module (pas recréée entre renders)
const onError = vi.fn();

beforeEach(() => vi.clearAllMocks());

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeLieu(overrides: Partial<Lieu> = {}): Lieu {
  return {
    id: "l1",
    user_id: "uid",
    nom: "Bureau",
    adresse_complete: "1 rue des Tests",
    latitude: 50.0,
    longitude: 4.0,
    notes: null,
    type: null,
    ...overrides,
  };
}

// ─── 1. fetchLieux ────────────────────────────────────────────────────────────

describe("fetchLieux", () => {
  it("popule lieux avec la réponse API", async () => {
    const data = [makeLieu({ id: "l1" }), makeLieu({ id: "l2", nom: "Salle B" })];
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue(data);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    expect(result.current.lieux).toHaveLength(2);
    expect(result.current.lieux[0].id).toBe("l1");
  });

  it("traite une réponse null comme [] (data || [])", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue(null as unknown as Lieu[]);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    expect(result.current.lieux).toEqual([]);
  });

  it("loading est false après le chargement", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([]);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    expect(result.current.loading).toBe(false);
  });

  it("verrouille les appels concurrents via isFetching", async () => {
    let resolve!: (v: Lieu[]) => void;
    vi.mocked(lieuxApi.fetchLieux).mockImplementationOnce(
      () => new Promise<Lieu[]>((res) => { resolve = res; })
    );

    const { result } = renderHook(() => useLieux(onError));

    const p1 = result.current.fetchLieux();
    const p2 = result.current.fetchLieux(); // isFetching.current = true → []

    const val2 = await p2;
    expect(val2).toEqual([]);
    expect(lieuxApi.fetchLieux).toHaveBeenCalledTimes(1);

    await act(async () => { resolve([]); await p1; });
  });

  it("erreur API → onError + throw", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockRejectedValue(new Error("DB fail"));

    const { result } = renderHook(() => useLieux(onError));

    await act(async () => {
      await expect(result.current.fetchLieux()).rejects.toThrow("DB fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("chargement lieux"));
  });
});

// ─── 2. createLieu ───────────────────────────────────────────────────────────

describe("createLieu", () => {
  it("ajoute le lieu retourné par l'API en tête de lieux", async () => {
    const existing = makeLieu({ id: "l-old", nom: "Ancien" });
    const newLieu = makeLieu({ id: "l-new", nom: "Nouveau" });

    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([existing]);
    vi.mocked(lieuxApi.createLieu).mockResolvedValue(newLieu);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => { await result.current.createLieu({ nom: "Nouveau" }); });

    // createLieu fait [newLieu, ...prev] — nouveau en tête
    expect(result.current.lieux[0].id).toBe("l-new");
    expect(result.current.lieux[1].id).toBe("l-old");
  });

  it("retourne le lieu créé (pour auto-sélection)", async () => {
    const newLieu = makeLieu({ id: "ret-l" });
    vi.mocked(lieuxApi.createLieu).mockResolvedValue(newLieu);

    const { result } = renderHook(() => useLieux(onError));

    let returned!: Lieu;
    await act(async () => {
      returned = await result.current.createLieu({ nom: "Test" });
    });

    expect(returned.id).toBe("ret-l");
  });

  it("ne modifie pas l'état si l'API retourne null/undefined", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu()]);
    vi.mocked(lieuxApi.createLieu).mockResolvedValue(null as unknown as Lieu);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => { await result.current.createLieu({ nom: "Test" }); });

    expect(result.current.lieux).toHaveLength(1); // inchangé
  });

  it("erreur API → onError + throw", async () => {
    vi.mocked(lieuxApi.createLieu).mockRejectedValue(new Error("insert fail"));

    const { result } = renderHook(() => useLieux(onError));

    await act(async () => {
      await expect(result.current.createLieu({ nom: "Test" })).rejects.toThrow("insert fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("création lieu"));
  });
});

// ─── 3. updateLieu ───────────────────────────────────────────────────────────

describe("updateLieu", () => {
  it("garde id vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => useLieux(onError));

    await act(async () => {
      await expect(result.current.updateLieu("", { nom: "X" })).rejects.toThrow(
        "ID du lieu manquant"
      );
    });

    expect(lieuxApi.updateLieu).not.toHaveBeenCalled();
  });

  it("met à jour le lieu correspondant dans lieux", async () => {
    const l1 = makeLieu({ id: "l1", nom: "Ancien" });
    const l1Updated = makeLieu({ id: "l1", nom: "Modifié" });

    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([l1]);
    vi.mocked(lieuxApi.updateLieu).mockResolvedValue(l1Updated);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => { await result.current.updateLieu("l1", { nom: "Modifié" }); });

    expect(result.current.lieux[0].nom).toBe("Modifié");
  });

  it("retourne le lieu mis à jour", async () => {
    const updated = makeLieu({ id: "l1", nom: "Updated" });
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu()]);
    vi.mocked(lieuxApi.updateLieu).mockResolvedValue(updated);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    let returned!: Lieu;
    await act(async () => {
      returned = await result.current.updateLieu("l1", { nom: "Updated" });
    });

    expect(returned.nom).toBe("Updated");
  });

  it("erreur API → onError + throw", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu()]);
    vi.mocked(lieuxApi.updateLieu).mockRejectedValue(new Error("update fail"));

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    await act(async () => {
      await expect(result.current.updateLieu("l1", { nom: "X" })).rejects.toThrow("update fail");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("mise à jour lieu"));
  });
});

// ─── 4. deleteLieu ───────────────────────────────────────────────────────────

describe("deleteLieu", () => {
  it("garde id vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => useLieux(onError));

    await act(async () => {
      await expect(result.current.deleteLieu("")).rejects.toThrow("ID du lieu manquant");
    });

    expect(lieuxApi.deleteLieu).not.toHaveBeenCalled();
  });

  it("retire le lieu de lieux après suppression", async () => {
    const l1 = makeLieu({ id: "l1" });
    const l2 = makeLieu({ id: "l2", nom: "Salle B" });

    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([l1, l2]);
    vi.mocked(lieuxApi.deleteLieu).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => { await result.current.deleteLieu("l1"); });

    expect(result.current.lieux).toHaveLength(1);
    expect(result.current.lieux[0].id).toBe("l2");
  });

  it("loading est false après la suppression (finally)", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu()]);
    vi.mocked(lieuxApi.deleteLieu).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => { await result.current.deleteLieu("l1"); });

    expect(result.current.loading).toBe(false);
  });

  it("erreur API → onError + throw sans retirer le lieu de l'état", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu()]);
    vi.mocked(lieuxApi.deleteLieu).mockRejectedValue(new Error("FK violation"));

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });

    await act(async () => {
      await expect(result.current.deleteLieu("l1")).rejects.toThrow("FK violation");
    });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("suppression lieu"));
    // L'état n'est pas modifié (deleteLieu filtre APRÈS l'API)
    expect(result.current.lieux).toHaveLength(1);
  });
});

// ─── 5. Coordonnées GPS — omission des null avant envoi à l'API ───────────────
//
// Comportement : createLieu et updateLieu suppriment latitude/longitude du payload
// quand ces champs sont null ou undefined, avant d'appeler lieuxApi.
// Les consommateurs (useKmDomicile, useBilanKm) gèrent l'absence explicitement via
// `if (!lieu.latitude || !lieu.longitude)` avant tout calcul de distance.

describe("coordonnées GPS — omission des null avant envoi à l'API", () => {
  it("createLieu avec latitude=null → API appelée SANS champs latitude/longitude", async () => {
    vi.mocked(lieuxApi.createLieu).mockResolvedValue(
      makeLieu({ id: "l-new", latitude: undefined as unknown as number, longitude: undefined as unknown as number })
    );

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => {
      await result.current.createLieu({
        nom: "Sans GPS",
        latitude: null as unknown as number,
        longitude: null as unknown as number,
      });
    });

    const sentPayload = vi.mocked(lieuxApi.createLieu).mock.calls[0][0] as Partial<Lieu>;
    expect(sentPayload).not.toHaveProperty("latitude");
    expect(sentPayload).not.toHaveProperty("longitude");
  });

  it("createLieu avec coordonnées valides → champs lat/lng transmis à l'API tels quels", async () => {
    vi.mocked(lieuxApi.createLieu).mockResolvedValue(makeLieu({ latitude: 50.1234, longitude: 4.5678 }));

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => {
      await result.current.createLieu({ nom: "Avec GPS", latitude: 50.1234, longitude: 4.5678 });
    });

    const sentPayload = vi.mocked(lieuxApi.createLieu).mock.calls[0][0] as Partial<Lieu>;
    expect(sentPayload.latitude).toBeCloseTo(50.1234, 4);
    expect(sentPayload.longitude).toBeCloseTo(4.5678, 4);
  });

  it("updateLieu avec latitude=null → API appelée SANS champs latitude/longitude", async () => {
    vi.mocked(lieuxApi.fetchLieux).mockResolvedValue([makeLieu({ latitude: 48.8566, longitude: 2.3522 })]);
    vi.mocked(lieuxApi.updateLieu).mockResolvedValue(makeLieu({ latitude: undefined as unknown as number }));

    const { result } = renderHook(() => useLieux(onError));
    await act(async () => { await result.current.fetchLieux(); });
    await act(async () => {
      await result.current.updateLieu("l1", {
        latitude: null as unknown as number,
        longitude: null as unknown as number,
      });
    });

    const sentPayload = vi.mocked(lieuxApi.updateLieu).mock.calls[0][1] as Partial<Lieu>;
    expect(sentPayload).not.toHaveProperty("latitude");
    expect(sentPayload).not.toHaveProperty("longitude");
  });
});

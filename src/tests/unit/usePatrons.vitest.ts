import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePatrons } from "../../hooks/usePatrons";
import type { Patron } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../../services/api/patronsApi", () => ({
  fetchPatrons: vi.fn(),
  createPatron: vi.fn(),
  updatePatron: vi.fn(),
  deletePatron: vi.fn(),
}));

import * as authService from "../../services/authService";
import * as patronsApi from "../../services/api/patronsApi";

// triggerAlert — référence stable
const triggerAlert = vi.fn();

beforeEach(() => vi.clearAllMocks());

// ─── Factory ──────────────────────────────────────────────────────────────────

function makePatron(overrides: Partial<Patron> = {}): Patron {
  return {
    id: "p1",
    user_id: "uid",
    nom: "Dupont",
    taux_horaire: 25,
    couleur: "#8b5cf6",
    adresse: null,
    code_postal: null,
    ville: null,
    telephone: null,
    email: null,
    siret: null,
    actif: true,
    created_at: null,
    ...overrides,
  };
}

// usePatrons appelle fetchPatrons dans un useEffect au montage.
// Pour éviter que l'effet parasite les assertions, on mocke fetchPatrons
// pour retourner [] par défaut dans chaque test, sauf quand on teste fetchPatrons
// lui-même explicitement.
beforeEach(() => {
  vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
  vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([]);
});

// ─── 1. fetchPatrons ──────────────────────────────────────────────────────────

describe("fetchPatrons", () => {
  it("appelle patronsApi.fetchPatrons avec l'userId et popule patrons", async () => {
    const data = [makePatron({ id: "p1" }), makePatron({ id: "p2", nom: "Martin" })];
    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue(data);

    const { result } = renderHook(() => usePatrons(triggerAlert));

    // Attendre la résolution du useEffect initial
    await act(async () => {});

    expect(patronsApi.fetchPatrons).toHaveBeenCalledWith("uid");
    expect(result.current.patrons).toHaveLength(2);
  });

  it("loading est false après le chargement", async () => {
    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it("utilisateur non connecté → triggerAlert + throw", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    expect(triggerAlert).toHaveBeenCalledWith(
      expect.stringContaining("non connecté")
    );
  });

  it("erreur API → triggerAlert + throw (re-throw)", async () => {
    vi.mocked(patronsApi.fetchPatrons).mockRejectedValue(new Error("DB fail"));

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    expect(triggerAlert).toHaveBeenCalledWith(
      expect.stringContaining("chargement patrons")
    );
    expect(result.current.patrons).toEqual([]);
  });
});

// ─── 2. createPatron ─────────────────────────────────────────────────────────

describe("createPatron", () => {
  it("garde nom vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.createPatron({ nom: "  " })).rejects.toThrow(
        "nom du patron est obligatoire"
      );
    });

    expect(patronsApi.createPatron).not.toHaveBeenCalled();
  });

  it("ajoute le patron retourné par l'API dans patrons (trié par nom)", async () => {
    const pBeta = makePatron({ id: "p-beta", nom: "Beta" });
    const pAlpha = makePatron({ id: "p-alpha", nom: "Alpha" });

    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([pBeta]);
    vi.mocked(patronsApi.createPatron).mockResolvedValue(pAlpha);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createPatron({ nom: "Alpha", taux_horaire: 20 });
    });

    expect(result.current.patrons[0].nom).toBe("Alpha");
    expect(result.current.patrons[1].nom).toBe("Beta");
  });

  it("utilise couleur par défaut '#8b5cf6' si non fournie", async () => {
    vi.mocked(patronsApi.createPatron).mockResolvedValue(makePatron());

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createPatron({ nom: "Dupont" });
    });

    const call = vi.mocked(patronsApi.createPatron).mock.calls[0][0];
    expect(call.couleur).toBe("#8b5cf6");
  });

  it("convertit taux_horaire string → number", async () => {
    vi.mocked(patronsApi.createPatron).mockResolvedValue(makePatron({ taux_horaire: 30 }));

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createPatron({ nom: "Test", taux_horaire: "30" as unknown as number });
    });

    const call = vi.mocked(patronsApi.createPatron).mock.calls[0][0];
    expect(call.taux_horaire).toBe(30);
  });

  it("taux_horaire null → stocke null (pas NaN)", async () => {
    vi.mocked(patronsApi.createPatron).mockResolvedValue(makePatron({ taux_horaire: null }));

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createPatron({ nom: "Test", taux_horaire: null });
    });

    const call = vi.mocked(patronsApi.createPatron).mock.calls[0][0];
    expect(call.taux_horaire).toBeNull();
  });

  it("erreur code 23505 → 'patron avec ce nom existe déjà'", async () => {
    const dupErr = Object.assign(new Error("dup"), { code: "23505" });
    vi.mocked(patronsApi.createPatron).mockRejectedValue(dupErr);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.createPatron({ nom: "Dupont" })).rejects.toThrow(
        "patron avec ce nom existe déjà"
      );
    });
  });
});

// ─── 3. updatePatron ─────────────────────────────────────────────────────────

describe("updatePatron", () => {
  it("garde patronId vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.updatePatron("", { nom: "X" })).rejects.toThrow(
        "ID du patron manquant"
      );
    });

    expect(patronsApi.updatePatron).not.toHaveBeenCalled();
  });

  it("garde nom vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.updatePatron("p1", { nom: "" })).rejects.toThrow(
        "nom du patron est obligatoire"
      );
    });

    expect(patronsApi.updatePatron).not.toHaveBeenCalled();
  });

  it("met à jour le patron dans la liste et re-trie par nom", async () => {
    const pA = makePatron({ id: "pA", nom: "Alpha" });
    const pB = makePatron({ id: "pB", nom: "Beta" });
    const pAUpdated = makePatron({ id: "pA", nom: "Zeta" });

    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([pA, pB]);
    vi.mocked(patronsApi.updatePatron).mockResolvedValue(pAUpdated);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.updatePatron("pA", { nom: "Zeta" });
    });

    expect(result.current.patrons[0].nom).toBe("Beta");
    expect(result.current.patrons[1].nom).toBe("Zeta");
  });

  it("erreur code 23505 → 'patron avec ce nom existe déjà'", async () => {
    const dupErr = Object.assign(new Error("dup"), { code: "23505" });
    vi.mocked(patronsApi.updatePatron).mockRejectedValue(dupErr);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.updatePatron("p1", { nom: "Dupont" })).rejects.toThrow(
        "patron avec ce nom existe déjà"
      );
    });
  });
});

// ─── 4. deletePatron ─────────────────────────────────────────────────────────

describe("deletePatron", () => {
  it("garde patronId vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.deletePatron("")).rejects.toThrow(
        "ID du patron manquant"
      );
    });

    expect(patronsApi.deletePatron).not.toHaveBeenCalled();
  });

  it("retire le patron de la liste après suppression", async () => {
    const p1 = makePatron({ id: "p1" });
    const p2 = makePatron({ id: "p2", nom: "Martin" });

    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([p1, p2]);
    vi.mocked(patronsApi.deletePatron).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.deletePatron("p1");
    });

    expect(result.current.patrons).toHaveLength(1);
    expect(result.current.patrons[0].id).toBe("p2");
  });

  it("loading est false après la suppression (finally)", async () => {
    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([makePatron()]);
    vi.mocked(patronsApi.deletePatron).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});
    await act(async () => { await result.current.deletePatron("p1"); });

    expect(result.current.loading).toBe(false);
  });

  it("erreur API → throw (message préservé)", async () => {
    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([makePatron()]);
    vi.mocked(patronsApi.deletePatron).mockRejectedValue(new Error("FK violation"));

    const { result } = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.deletePatron("p1")).rejects.toThrow("FK violation");
    });
  });
});

// ─── 5. Helpers de lecture ────────────────────────────────────────────────────

describe("getPatronById / getPatronColor / getPatronNom / patronExists", () => {
  async function renderWithPatrons() {
    const p1 = makePatron({ id: "p1", nom: "Dupont", couleur: "#ff0000" });
    const p2 = makePatron({ id: "p2", nom: "Martin", couleur: "#00ff00" });
    vi.mocked(patronsApi.fetchPatrons).mockResolvedValue([p1, p2]);
    const hook = renderHook(() => usePatrons(triggerAlert));
    await act(async () => {});
    return hook;
  }

  it("getPatronById retourne le bon patron", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronById("p1")?.nom).toBe("Dupont");
  });

  it("getPatronById retourne null si inconnu", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronById("unknown")).toBeNull();
  });

  it("getPatronById retourne null si null/undefined passé", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronById(null)).toBeNull();
    expect(result.current.getPatronById(undefined)).toBeNull();
  });

  it("getPatronColor retourne la couleur du patron", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronColor("p1")).toBe("#ff0000");
  });

  it("getPatronColor retourne '#8b5cf6' si patron inconnu", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronColor("unknown")).toBe("#8b5cf6");
  });

  it("getPatronNom retourne le nom du patron", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronNom("p2")).toBe("Martin");
  });

  it("getPatronNom retourne 'Non assigné' si patron inconnu", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.getPatronNom("unknown")).toBe("Non assigné");
  });

  it("patronExists retourne true si le patron existe", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.patronExists("p1")).toBe(true);
  });

  it("patronExists retourne false si inconnu", async () => {
    const { result } = await renderWithPatrons();
    expect(result.current.patronExists("ghost")).toBe(false);
  });
});

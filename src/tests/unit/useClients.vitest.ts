import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useClients } from "../../hooks/useClients";
import type { Client } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../../services/api/clientsApi", () => ({
  fetchClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  getClientStats: vi.fn(),
}));

import * as authService from "../../services/authService";
import * as clientsApi from "../../services/api/clientsApi";

// triggerAlert — référence stable au module (pas recréée entre renders)
const triggerAlert = vi.fn();

beforeEach(() => vi.clearAllMocks());

// useClients appelle fetchClients dans un useEffect au montage.
// On configure les mocks par défaut ici pour que chaque test parte proprement.
beforeEach(() => {
  vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
  vi.mocked(clientsApi.fetchClients).mockResolvedValue([]);
});

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    user_id: "uid",
    nom: "Dupont",
    contact: null,
    lieu_travail: null,
    notes: null,
    actif: true,
    created_at: null,
    ...overrides,
  };
}

// ─── 1. fetchClients ──────────────────────────────────────────────────────────

describe("fetchClients", () => {
  it("appelle clientsApi.fetchClients avec l'userId et popule clients", async () => {
    const data = [makeClient({ id: "c1" }), makeClient({ id: "c2", nom: "Martin" })];
    vi.mocked(clientsApi.fetchClients).mockResolvedValue(data);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    expect(clientsApi.fetchClients).toHaveBeenCalledWith("uid");
    expect(result.current.clients).toHaveLength(2);
  });

  it("utilisateur non connecté → clients reste [] sans erreur (pas de throw)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    expect(result.current.clients).toEqual([]);
    // fetchClients swallows l'absence d'user → pas de triggerAlert
    expect(triggerAlert).not.toHaveBeenCalled();
  });

  it("loading est false après le chargement", async () => {
    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it("erreur API → triggerAlert + état clients inchangé", async () => {
    vi.mocked(clientsApi.fetchClients).mockRejectedValue(new Error("DB fail"));

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    expect(triggerAlert).toHaveBeenCalledWith(
      expect.stringContaining("chargement des clients")
    );
    expect(result.current.clients).toEqual([]);
  });
});

// ─── 2. createClient ─────────────────────────────────────────────────────────

describe("createClient", () => {
  it("nom vide → throw sans appeler l'API", async () => {
    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.createClient({ nom: "  " })).rejects.toThrow(
        "nom du client est obligatoire"
      );
    });

    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("utilisateur non connecté → throw 'non connecté'", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);

    // Re-render pour que fetchClients ne rate pas (il est déjà appelé une 1re fois)
    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    // Re-mock null pour le 2e appel (createClient)
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);

    await act(async () => {
      await expect(result.current.createClient({ nom: "Dupont" })).rejects.toThrow(
        "non connecté"
      );
    });

    expect(clientsApi.createClient).not.toHaveBeenCalled();
  });

  it("ajoute le client retourné par l'API dans clients (trié par nom)", async () => {
    const cBeta = makeClient({ id: "c-beta", nom: "Beta" });
    const cAlpha = makeClient({ id: "c-alpha", nom: "Alpha" });

    vi.mocked(clientsApi.fetchClients).mockResolvedValue([cBeta]);
    vi.mocked(clientsApi.createClient).mockResolvedValue(cAlpha);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createClient({ nom: "Alpha" });
    });

    expect(result.current.clients[0].nom).toBe("Alpha");
    expect(result.current.clients[1].nom).toBe("Beta");
  });

  it("trim le nom avant de l'envoyer", async () => {
    vi.mocked(clientsApi.createClient).mockResolvedValue(makeClient({ nom: "Trimé" }));

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.createClient({ nom: "  Trimé  " });
    });

    const call = vi.mocked(clientsApi.createClient).mock.calls[0][0];
    expect(call.nom).toBe("Trimé");
  });

  it("erreur code 23505 → 'client avec ce nom existe déjà'", async () => {
    const dupErr = Object.assign(new Error("dup"), { code: "23505" });
    vi.mocked(clientsApi.createClient).mockRejectedValue(dupErr);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.createClient({ nom: "Dupont" })).rejects.toThrow(
        "client avec ce nom existe déjà"
      );
    });
  });

  it("retourne le client créé", async () => {
    const newClient = makeClient({ id: "ret-c", nom: "Retourné" });
    vi.mocked(clientsApi.createClient).mockResolvedValue(newClient);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    let returned!: Client;
    await act(async () => {
      returned = await result.current.createClient({ nom: "Retourné" });
    });

    expect(returned.id).toBe("ret-c");
  });
});

// ─── 3. updateClient ─────────────────────────────────────────────────────────

describe("updateClient", () => {
  it("met à jour le client dans la liste et re-trie par nom", async () => {
    const cA = makeClient({ id: "cA", nom: "Alpha" });
    const cB = makeClient({ id: "cB", nom: "Beta" });
    const cAUpdated = makeClient({ id: "cA", nom: "Zeta" });

    vi.mocked(clientsApi.fetchClients).mockResolvedValue([cA, cB]);
    vi.mocked(clientsApi.updateClient).mockResolvedValue(cAUpdated);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.updateClient("cA", { nom: "Zeta" });
    });

    expect(result.current.clients[0].nom).toBe("Beta");
    expect(result.current.clients[1].nom).toBe("Zeta");
  });

  it("retourne le client mis à jour", async () => {
    const updated = makeClient({ id: "c1", nom: "Updated" });
    vi.mocked(clientsApi.fetchClients).mockResolvedValue([makeClient()]);
    vi.mocked(clientsApi.updateClient).mockResolvedValue(updated);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    let returned!: Client;
    await act(async () => {
      returned = await result.current.updateClient("c1", { nom: "Updated" });
    });

    expect(returned.nom).toBe("Updated");
  });

  it("erreur code 23505 → 'client avec ce nom existe déjà'", async () => {
    vi.mocked(clientsApi.fetchClients).mockResolvedValue([makeClient()]);
    const dupErr = Object.assign(new Error("dup"), { code: "23505" });
    vi.mocked(clientsApi.updateClient).mockRejectedValue(dupErr);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.updateClient("c1", { nom: "Dupont" })).rejects.toThrow(
        "client avec ce nom existe déjà"
      );
    });
  });

  it("erreur générique → re-throw", async () => {
    vi.mocked(clientsApi.fetchClients).mockResolvedValue([makeClient()]);
    vi.mocked(clientsApi.updateClient).mockRejectedValue(new Error("update fail"));

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.updateClient("c1", { nom: "X" })).rejects.toThrow(
        "update fail"
      );
    });
  });
});

// ─── 4. deleteClient ─────────────────────────────────────────────────────────

describe("deleteClient", () => {
  it("retire le client de la liste après suppression", async () => {
    const c1 = makeClient({ id: "c1" });
    const c2 = makeClient({ id: "c2", nom: "Martin" });

    vi.mocked(clientsApi.fetchClients).mockResolvedValue([c1, c2]);
    vi.mocked(clientsApi.deleteClient).mockResolvedValue(undefined);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await result.current.deleteClient("c1");
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].id).toBe("c2");
  });

  it("loading est false après la suppression (finally)", async () => {
    vi.mocked(clientsApi.fetchClients).mockResolvedValue([makeClient()]);
    vi.mocked(clientsApi.deleteClient).mockResolvedValue(undefined);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});
    await act(async () => { await result.current.deleteClient("c1"); });

    expect(result.current.loading).toBe(false);
  });

  it("erreur API → re-throw sans supprimer le client de l'état", async () => {
    vi.mocked(clientsApi.fetchClients).mockResolvedValue([makeClient()]);
    vi.mocked(clientsApi.deleteClient).mockRejectedValue(new Error("FK violation"));

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    await act(async () => {
      await expect(result.current.deleteClient("c1")).rejects.toThrow("FK violation");
    });

    expect(result.current.clients).toHaveLength(1);
  });
});

// ─── 5. getClientNom ─────────────────────────────────────────────────────────

describe("getClientNom", () => {
  async function renderWithClients() {
    const data = [
      makeClient({ id: "c1", nom: "Dupont" }),
      makeClient({ id: "c2", nom: "Martin" }),
    ];
    vi.mocked(clientsApi.fetchClients).mockResolvedValue(data);
    const hook = renderHook(() => useClients(triggerAlert));
    await act(async () => {});
    return hook;
  }

  it("retourne le nom du client trouvé", async () => {
    const { result } = await renderWithClients();
    expect(result.current.getClientNom("c1")).toBe("Dupont");
  });

  it("retourne null si clientId est inconnu", async () => {
    const { result } = await renderWithClients();
    expect(result.current.getClientNom("unknown")).toBeNull();
  });

  it("retourne null si clientId est null ou undefined", async () => {
    const { result } = await renderWithClients();
    expect(result.current.getClientNom(null)).toBeNull();
    expect(result.current.getClientNom(undefined)).toBeNull();
  });
});

// ─── 6. searchClients ────────────────────────────────────────────────────────

describe("searchClients", () => {
  async function renderWithClients() {
    const data = [
      makeClient({ id: "c1", nom: "Dupont" }),
      makeClient({ id: "c2", nom: "Durand" }),
      makeClient({ id: "c3", nom: "Martin" }),
    ];
    vi.mocked(clientsApi.fetchClients).mockResolvedValue(data);
    const hook = renderHook(() => useClients(triggerAlert));
    await act(async () => {});
    return hook;
  }

  it("terme vide → retourne tous les clients", async () => {
    const { result } = await renderWithClients();
    expect(result.current.searchClients("")).toHaveLength(3);
  });

  it("filtre par correspondance partielle insensible à la casse", async () => {
    const { result } = await renderWithClients();
    const found = result.current.searchClients("du");
    expect(found).toHaveLength(2);
    expect(found.map((c) => c.nom)).toContain("Dupont");
    expect(found.map((c) => c.nom)).toContain("Durand");
  });

  it("retourne [] si aucun client ne correspond", async () => {
    const { result } = await renderWithClients();
    expect(result.current.searchClients("xyz")).toHaveLength(0);
  });
});

// ─── 7. getClientStats ───────────────────────────────────────────────────────

describe("getClientStats", () => {
  it("délègue à clientsApi.getClientStats et retourne les stats", async () => {
    const stats = { nombreMissions: 5, totalHeures: 10, totalCA: 500 };
    vi.mocked(clientsApi.getClientStats).mockResolvedValue(stats);

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    let returned!: typeof stats;
    await act(async () => {
      returned = await result.current.getClientStats("c1");
    });

    expect(clientsApi.getClientStats).toHaveBeenCalledWith("c1");
    expect(returned).toEqual(stats);
  });

  it("erreur API → retourne stats vides { 0, 0, 0 } sans throw", async () => {
    vi.mocked(clientsApi.getClientStats).mockRejectedValue(new Error("stats fail"));

    const { result } = renderHook(() => useClients(triggerAlert));
    await act(async () => {});

    let returned!: { nombreMissions: number; totalHeures: number; totalCA: number };
    await act(async () => {
      returned = await result.current.getClientStats("c1");
    });

    expect(returned).toEqual({ nombreMissions: 0, totalHeures: 0, totalCA: 0 });
  });
});

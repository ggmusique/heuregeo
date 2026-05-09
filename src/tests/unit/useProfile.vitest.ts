import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useProfile } from "../../hooks/useProfile";
import type { UserProfile, UserFeatures } from "../../types/profile";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// useProfile utilise directement supabase (mocké globalement dans setup.ts).
// On réimporte la mock pour contrôler les valeurs retournées par test.

import { supabase } from "../../services/supabase";

beforeEach(() => vi.clearAllMocks());

// Par défaut : fetchProfile renvoie null (pas de profil) pour les tests qui ne s'y intéressent pas
beforeEach(() => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  } as unknown as ReturnType<typeof supabase.from>);
});

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "uid",
    role: "pro",
    features: {},
    is_admin: false,
    patron_id: null,
    prenom: "Jean",
    nom: "Dupont",
    adresse: null,
    code_postal: null,
    ville: null,
    updated_at: null,
    ...overrides,
  };
}

function makeFeatures(overrides: Partial<UserFeatures> = {}): UserFeatures {
  return { plan: "free", ...overrides };
}

// ─── 1. fetchProfile ──────────────────────────────────────────────────────────

describe("fetchProfile", () => {
  it("charge le profil depuis supabase et le stocke dans profile", async () => {
    const p = makeProfile({ prenom: "Alice" });
    const single = vi.fn().mockResolvedValue({ data: p, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});

    expect(result.current.profile?.prenom).toBe("Alice");
    expect(result.current.error).toBeNull();
  });

  it("user null → profile reste null sans appel API", async () => {
    const { result } = renderHook(() => useProfile(null));
    await act(async () => {});

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  it("loading est false après le chargement", async () => {
    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it("PGRST116 → null sans erreur (profil non encore créé — comportement attendu)", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("erreur générique → error state renseigné", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "OTHER", message: "DB failure" },
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});

    expect(result.current.error).toBeTruthy();
  });
});

// ─── 2. saveProfile ───────────────────────────────────────────────────────────

describe("saveProfile", () => {
  it("user null → retourne { error: 'Non connecté' } sans appel API", async () => {
    const { result } = renderHook(() => useProfile(null));
    await act(async () => {});

    let res!: { error?: string };
    await act(async () => {
      res = await result.current.saveProfile({ prenom: "Test" });
    });

    expect(res.error).toMatch(/Non connecté/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("sauvegarde et met à jour profile en cas de succès", async () => {
    const saved = makeProfile({ prenom: "Modifié" });

    // Premier appel (fetchProfile au montage) — retourne profil existant
    const singleFetch = vi.fn().mockResolvedValue({ data: makeProfile(), error: null });
    // Deuxième appel (saveProfile via upsert + select + single)
    const singleSave = vi.fn().mockResolvedValue({ data: saved, error: null });

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      const single = callCount === 1 ? singleFetch : singleSave;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        single,
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});

    let res!: { data?: UserProfile; error?: string };
    await act(async () => {
      res = await result.current.saveProfile({ prenom: "Modifié" });
    });

    expect(res.data?.prenom).toBe("Modifié");
    expect(result.current.profile?.prenom).toBe("Modifié");
    expect(result.current.saving).toBe(false);
  });

  it("erreur API → retourne { error: message } et renseigne error state", async () => {
    // Fetch normal au montage
    const singleFetch = vi.fn().mockResolvedValue({ data: null, error: null });
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: singleFetch,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "upsert fail" } }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const { result } = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});

    let res!: { error?: string };
    await act(async () => {
      res = await result.current.saveProfile({ prenom: "X" });
    });

    expect(res.error).toBe("upsert fail");
    expect(result.current.error).toBe("upsert fail");
    expect(result.current.saving).toBe(false);
  });
});

// ─── 3. isProfileComplete ─────────────────────────────────────────────────────

describe("isProfileComplete", () => {
  async function renderWithProfile(profile: UserProfile | null) {
    const single = vi.fn().mockResolvedValue({ data: profile, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);

    const hook = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    return hook;
  }

  it("true quand prenom et nom sont renseignés", async () => {
    const { result } = await renderWithProfile(
      makeProfile({ prenom: "Jean", nom: "Dupont" })
    );
    expect(result.current.isProfileComplete).toBe(true);
  });

  it("false quand prenom est vide ou null", async () => {
    const { result } = await renderWithProfile(makeProfile({ prenom: null }));
    expect(result.current.isProfileComplete).toBe(false);
  });

  it("false quand nom est vide ou null", async () => {
    const { result } = await renderWithProfile(makeProfile({ nom: null }));
    expect(result.current.isProfileComplete).toBe(false);
  });

  it("false quand profile est null (pas encore chargé)", async () => {
    const { result } = await renderWithProfile(null);
    expect(result.current.isProfileComplete).toBe(false);
  });
});

// ─── 4. isViewer / viewerPatronId ────────────────────────────────────────────

describe("isViewer / viewerPatronId", () => {
  async function renderWithProfile(profile: UserProfile | null) {
    const single = vi.fn().mockResolvedValue({ data: profile, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);
    const hook = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    return hook;
  }

  it("role='viewer' → isViewer=true, viewerPatronId=patron_id", async () => {
    const { result } = await renderWithProfile(
      makeProfile({ role: "viewer", patron_id: "patron-42" })
    );
    expect(result.current.isViewer).toBe(true);
    expect(result.current.viewerPatronId).toBe("patron-42");
  });

  it("role='pro' → isViewer=false, viewerPatronId=null", async () => {
    const { result } = await renderWithProfile(makeProfile({ role: "pro" }));
    expect(result.current.isViewer).toBe(false);
    expect(result.current.viewerPatronId).toBeNull();
  });
});

// ─── 5. isAdmin ───────────────────────────────────────────────────────────────

describe("isAdmin", () => {
  async function renderWithProfile(profile: UserProfile | null) {
    const single = vi.fn().mockResolvedValue({ data: profile, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);
    const hook = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    return hook;
  }

  it("is_admin=true → isAdmin=true", async () => {
    const { result } = await renderWithProfile(makeProfile({ is_admin: true }));
    expect(result.current.isAdmin).toBe(true);
  });

  it("is_admin=false → isAdmin=false", async () => {
    const { result } = await renderWithProfile(makeProfile({ is_admin: false }));
    expect(result.current.isAdmin).toBe(false);
  });
});

// ─── 6. Plan / features — isPro ───────────────────────────────────────────────

describe("isPro", () => {
  async function renderWithFeatures(features: UserFeatures) {
    const p = makeProfile({ features });
    const single = vi.fn().mockResolvedValue({ data: p, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);
    const hook = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    return hook;
  }

  it("features.plan='pro' → isPro=true", async () => {
    const { result } = await renderWithFeatures(makeFeatures({ plan: "pro" }));
    expect(result.current.isPro).toBe(true);
  });

  it("features.plan='free' → isPro=false", async () => {
    const { result } = await renderWithFeatures(makeFeatures({ plan: "free" }));
    expect(result.current.isPro).toBe(false);
  });

  it("features vide → isPro=false", async () => {
    const { result } = await renderWithFeatures({});
    expect(result.current.isPro).toBe(false);
  });
});

// ─── 7. Features dérivées ─────────────────────────────────────────────────────

describe("features dérivées — can* flags", () => {
  async function renderWithFeatures(features: UserFeatures) {
    const p = makeProfile({ features });
    const single = vi.fn().mockResolvedValue({ data: p, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    } as unknown as ReturnType<typeof supabase.from>);
    const hook = renderHook(() => useProfile({ id: "uid" }));
    await act(async () => {});
    return hook;
  }

  it("plan='pro' → toutes les features isPro incluses sont true", async () => {
    const { result } = await renderWithFeatures(makeFeatures({ plan: "pro" }));
    expect(result.current.canBilanMois).toBe(true);
    expect(result.current.canBilanAnnee).toBe(true);
    expect(result.current.canExportPDF).toBe(true);
    expect(result.current.canExportExcel).toBe(true);
    expect(result.current.canExportCSV).toBe(true);
    expect(result.current.canMultiPatron).toBe(true);
    expect(result.current.canViewerMode).toBe(true);
    expect(result.current.canHistoriqueComplet).toBe(true);
    expect(result.current.canKilometrage).toBe(true);
  });

  it("plan='free' + feature explicite → feature individuelle est true", async () => {
    const { result } = await renderWithFeatures(
      makeFeatures({ plan: "free", bilan_mois: true, agenda: true })
    );
    expect(result.current.canBilanMois).toBe(true);
    expect(result.current.canAgenda).toBe(true);
  });

  it("plan='free' sans feature → canAgenda=false, canFacture=false, canDashboard=false", async () => {
    const { result } = await renderWithFeatures(makeFeatures({ plan: "free" }));
    expect(result.current.canAgenda).toBe(false);
    expect(result.current.canFacture).toBe(false);
    expect(result.current.canDashboard).toBe(false);
  });

  it("plan='pro' n'inclut pas agenda/facture/dashboard (flags non isPro)", async () => {
    // canAgenda = features?.agenda === true uniquement (pas de fallback isPro)
    const { result } = await renderWithFeatures(makeFeatures({ plan: "pro" }));
    expect(result.current.canAgenda).toBe(false);   // agenda non activée explicitement
    expect(result.current.canFacture).toBe(false);
    expect(result.current.canDashboard).toBe(false);
  });

  it("profile null → toutes les features sont false", async () => {
    const { result } = await renderWithFeatures({});
    expect(result.current.isPro).toBe(false);
    expect(result.current.canBilanMois).toBe(false);
    expect(result.current.canAgenda).toBe(false);
  });
});

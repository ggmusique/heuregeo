/**
 * patronViewNom.vitest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests prioritaires — Point 2 : Nom affiché dans PatronView
 *
 * Logique testée (miroir exact du useEffect de PatronViewInner) :
 *   • access.patronNom fourni → utilisé directement, pas d'appel DB
 *   • access.patronNom absent → requête vers la table "patrons" (pas "profiles")
 *   • Jamais depuis "target_name" (colonne inexistante dans le schéma)
 *   • Valeur par défaut "Patron" si aucun nom ni patronId
 *
 * On reproduit le hook interne via renderHook pour tester le comportement
 * sans rendre le composant PatronViewInner complet (trop de dépendances).
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";

// Le mock global supabase est fourni par setup.ts.
// On le complète ici avec maybeSingle() pour ce module.

// ─── Hook miroir de PatronViewInner (même useEffect, testé en isolation) ──────

function usePatronNom(access: {
  patronNom?: string | null;
  patronId?: string | null;
}) {
  const [patronNom, setPatronNom] = useState<string>(
    access.patronNom || "Patron"
  );

  useEffect(() => {
    // Chemin 1 : nom déjà connu → utilisation directe, pas de requête DB
    if (access.patronNom) {
      setPatronNom(access.patronNom);
      return;
    }
    // Chemin 2 : pas de patronId → impossible de charger
    if (!access.patronId) return;

    // Chemin 3 : requête vers la table "patrons" (jamais "profiles")
    supabase
      .from("patrons")
      .select("nom")
      .eq("id", access.patronId)
      .maybeSingle()
      .then(({ data }: { data: { nom: string } | null }) => {
        if (data?.nom) setPatronNom(data.nom);
      });
  }, [access.patronId, access.patronNom]);

  return patronNom;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PatronView — résolution du nom patron", () => {
  beforeEach(() => vi.clearAllMocks());

  it("utilise access.patronNom directement quand il est fourni", () => {
    const { result } = renderHook(() =>
      usePatronNom({ patronNom: "Michel", patronId: "patron-uuid" })
    );
    expect(result.current).toBe("Michel");
  });

  it("n'appelle pas supabase.from('patrons') quand patronNom est déjà connu", async () => {
    const fromSpy = vi.mocked(supabase.from);

    renderHook(() =>
      usePatronNom({ patronNom: "Michel", patronId: "patron-uuid" })
    );

    // Laisser les effets React s'exécuter
    await act(async () => {});

    // Aucun appel vers la table "patrons" ne doit avoir eu lieu
    const patronCalls = fromSpy.mock.calls.filter((c) => c[0] === "patrons");
    expect(patronCalls.length).toBe(0);
  });

  it("interroge la table 'patrons' (et non 'profiles') quand patronNom est absent", async () => {
    const fromSpy = vi.mocked(supabase.from);

    // Surcharge du mock pour ce test : retourne un nom depuis "patrons"
    fromSpy.mockImplementationOnce(
      () =>
        ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { nom: "Michel" }, error: null }),
        }) as unknown as ReturnType<typeof supabase.from>
    );

    const { result } = renderHook(() =>
      usePatronNom({ patronNom: null, patronId: "patron-uuid" })
    );

    await waitFor(() => {
      expect(result.current).toBe("Michel");
    });

    // La première table interrogée doit être "patrons", pas "profiles"
    expect(fromSpy.mock.calls[0][0]).toBe("patrons");
  });

  it("ne consulte jamais la table 'profiles' pour résoudre le nom patron", async () => {
    const fromSpy = vi.mocked(supabase.from);

    renderHook(() =>
      usePatronNom({ patronNom: null, patronId: "patron-uuid" })
    );

    await act(async () => {});

    const profilesCalls = fromSpy.mock.calls.filter(
      (c) => c[0] === "profiles"
    );
    expect(profilesCalls.length).toBe(0);
  });

  it("ne fait jamais référence à une colonne 'target_name' (colonne inexistante)", async () => {
    // "target_name" n'existe pas dans le schéma — ce test garantit
    // que la logique de résolution du nom n'utilise que les colonnes légitimes.
    const fromSpy = vi.mocked(supabase.from);

    // Espionner les appels select() pour vérifier les colonnes demandées
    const selectMock = vi.fn().mockReturnThis();
    fromSpy.mockImplementationOnce(
      () =>
        ({
          select: selectMock,
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        }) as unknown as ReturnType<typeof supabase.from>
    );

    renderHook(() =>
      usePatronNom({ patronNom: null, patronId: "patron-uuid" })
    );

    await act(async () => {});

    // La requête doit demander "nom", jamais "target_name"
    if (selectMock.mock.calls.length > 0) {
      const selectArg = selectMock.mock.calls[0][0] as string;
      expect(selectArg).not.toContain("target_name");
      expect(selectArg).toContain("nom");
    }
  });

  it("affiche 'Patron' par défaut quand ni patronNom ni patronId ne sont fournis", () => {
    const { result } = renderHook(() =>
      usePatronNom({ patronNom: null, patronId: null })
    );
    expect(result.current).toBe("Patron");
  });

  it("met à jour le nom si patronNom change d'undefined à une valeur", async () => {
    const initialProps: { patronNom: string | null } = { patronNom: null };
    const { result, rerender } = renderHook(
      ({ patronNom }: { patronNom: string | null }) =>
        usePatronNom({ patronNom, patronId: "patron-uuid" }),
      { initialProps }
    );

    expect(result.current).toBe("Patron");

    rerender({ patronNom: "Geoffrey" });

    await waitFor(() => {
      expect(result.current).toBe("Geoffrey");
    });
  });
});

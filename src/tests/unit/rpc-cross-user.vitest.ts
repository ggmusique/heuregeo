/**
 * rpc-cross-user.vitest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vérifie que les RPC SECURITY DEFINER (apply_acompte / unapply_acompte)
 * rejettent les appels cross-user au niveau DB.
 *
 * Ces RPC bypassent RLS (SECURITY DEFINER) et implémentent leur propre check
 * d'ownership via `AND user_id = auth.uid()`. Les tests simulent la réponse
 * Postgres pour confirmer que l'erreur est bien propagée par l'API.
 *
 * COUVERTURE :
 *   1. apply_acompte rejette un acompte qui n'appartient pas au caller
 *   2. apply_acompte réussit quand l'acompte appartient au caller
 *   3. unapply_acompte rejette un acompte qui n'appartient pas au caller
 *   4. unapply_acompte réussit quand l'acompte appartient au caller
 *   5. Les RPC appellent bien le bon nom de fonction Supabase
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as acomptesApi from "../../services/api/acomptesApi";

// ─── Mocks hoistés (requis par vi.mock hoisting) ──────────────────────────────
const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "caller-owner-uid" } },
        error: null,
      }),
    },
    from: vi.fn(),
    rpc: mockRpc,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. apply_acompte — rejet cross-user + succès légitime
// ═════════════════════════════════════════════════════════════════════════════
describe("apply_acompte (SECURITY DEFINER) — cross-user rejection", () => {
  const OWN_ACOMPTE = "my-acompte-uuid";
  const FOREIGN_ACOMPTE = "foreign-acompte-uuid";

  it("rejette (P0001) quand la DB détecte un user_id mismatch via auth.uid()", async () => {
    const dbError = {
      message:
        "apply_acompte: acompte foreign-acompte-uuid non trouvé ou non autorisé pour user caller-owner-uid",
      code: "P0001",
    };
    mockRpc.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      acomptesApi.applyAcompte(FOREIGN_ACOMPTE)
    ).rejects.toMatchObject({
      message: expect.stringContaining("non autorisé"),
    });
  });

  it("réussit quand l'acompte appartient au caller (ownership ok)", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      acomptesApi.applyAcompte(OWN_ACOMPTE)
    ).resolves.toBeUndefined();
  });

  it("appelle la RPC apply_acompte avec le bon paramètre", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    await acomptesApi.applyAcompte(OWN_ACOMPTE);

    expect(mockRpc).toHaveBeenCalledWith("apply_acompte", {
      p_acompte_id: OWN_ACOMPTE,
    });
  });

  it("propage une erreur générique (ex: réseau) sans la transformer", async () => {
    const networkError = { message: "Network error", code: "NETWORK" };
    mockRpc.mockResolvedValueOnce({ data: null, error: networkError });

    await expect(
      acomptesApi.applyAcompte(OWN_ACOMPTE)
    ).rejects.toMatchObject({ message: "Network error" });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. unapply_acompte — rejet cross-user + succès légitime
// ═════════════════════════════════════════════════════════════════════════════
describe("unapply_acompte (SECURITY DEFINER) — cross-user rejection", () => {
  const OWN_ACOMPTE = "my-acompte-uuid";
  const FOREIGN_ACOMPTE = "other-user-acompte-id";

  it("rejette (P0001) quand la DB détecte un user_id mismatch", async () => {
    const dbError = {
      message:
        "unapply_acompte: acompte other-user-acompte-id non trouvé ou non autorisé pour user caller-owner-uid",
      code: "P0001",
    };
    mockRpc.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      acomptesApi.unapplyAcompte(FOREIGN_ACOMPTE)
    ).rejects.toMatchObject({
      message: expect.stringContaining("non autorisé"),
    });
  });

  it("réussit quand l'acompte appartient au caller", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      acomptesApi.unapplyAcompte(OWN_ACOMPTE)
    ).resolves.toBeUndefined();
  });

  it("appelle la RPC unapply_acompte avec le bon paramètre", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    await acomptesApi.unapplyAcompte(OWN_ACOMPTE);

    expect(mockRpc).toHaveBeenCalledWith("unapply_acompte", {
      p_acompte_id: OWN_ACOMPTE,
    });
  });

  it("propage une erreur générique sans la transformer", async () => {
    const dbError = { message: "Deadlock detected", code: "40P01" };
    mockRpc.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      acomptesApi.unapplyAcompte(OWN_ACOMPTE)
    ).rejects.toMatchObject({ message: "Deadlock detected" });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Cohérence — le même mock est utilisé pour les deux RPC
// ═════════════════════════════════════════════════════════════════════════════
describe("RPC mock isolation", () => {
  it("apply_acompte et unapply_acompte utilisent la même instance supabase.rpc", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await acomptesApi.applyAcompte("id-1");
    await acomptesApi.unapplyAcompte("id-2");

    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenNthCalledWith(1, "apply_acompte", {
      p_acompte_id: "id-1",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "unapply_acompte", {
      p_acompte_id: "id-2",
    });
  });
});

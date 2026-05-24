import React, { useEffect, useState, useCallback } from "react";
import {
  fetchUsers,
  updateUserFeatures,
  deleteUserProfile,
  type AdminUser,
  type AdminFeatures,
} from "../services/api/adminApi";
import { createReserveMovement } from "../features/contracts/reserve";

/**
 * AdminPage — Page d'administration des utilisateurs
 *
 * Accessible uniquement si isAdmin === true (vérifié dans App.jsx via useProfile).
 *
 * ⚠️ Politique RLS requise dans Supabase :
 *   CREATE POLICY "Admin peut lire tous les profils"
 *   ON profiles FOR SELECT
 *   USING (EXISTS (
 *     SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
 *   ));
 *
 *   CREATE POLICY "Admin peut modifier tous les profils"
 *   ON profiles FOR UPDATE
 *   USING (EXISTS (
 *     SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
 *   ));
 *
 * Structure de la colonne features (jsonb, default {}) :
 * {
 *   "plan": "free" | "pro",
 *   "viewer_enabled": false,
 *   "multi_patron": false,
 *   "export_pdf": false,
 *   "export_excel": false,
 *   "export_csv": false,
 *   "bilan_mois": false,
 *   "bilan_annee": false,
 *   "historique_complet": false,
 *   "gps": false
 * }
 */
export const AdminPage = ({ darkMode = true, isAdmin = false }: { darkMode?: boolean; isAdmin?: boolean }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null); // id de l'user en cours de mise à jour
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adminReserveHours, setAdminReserveHours] = useState("0");
  const [adminReserveComment, setAdminReserveComment] = useState("");
  const [adminReserveStatus, setAdminReserveStatus] = useState<string | null>(null);

  const fetchUsersData = useCallback(async () => {
    if (!isAdmin) {
      setError("Accès refusé");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchUsers();
      if (error) throw new Error(error);
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const updateContractSettings = async (user: AdminUser, patch: AdminFeatures) => {
    if (!isAdmin) return;
    setUpdating(user.id);
    setUpdateError(null);
    try {
      const currentFeatures = (user.features || {}) as AdminFeatures;
      const nextFeatures = { ...currentFeatures, ...patch };
      const { error } = await updateUserFeatures(user.id, nextFeatures);
      if (error) throw new Error(error);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, features: nextFeatures } : u
        )
      );
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(null);
    }
  };

  const togglePlan = async (user: AdminUser) => {
    if (!isAdmin) {
      setUpdateError("Accès refusé");
      return;
    }

    const currentPlan = user.features?.plan || "free";
    const newPlan = currentPlan === "pro" ? "free" : "pro";

    const newFeatures: AdminFeatures =
      newPlan === "pro"
        ? {
            plan: "pro",
            contract_enabled: true,
            contract_weekly_quota_hours: 8,
            contract_reserve_enabled: true,
            contract_payable_rule: "capped_quota",
            contract_overflow_rule: "ignore",
            viewer_enabled: true,
            multi_patron: true,
            export_pdf: true,
            export_excel: true,
            export_csv: true,
            bilan_mois: true,
            bilan_annee: true,
            historique_complet: true,
            gps: true,
          }
        : {
            plan: "free",
          contract_enabled: false,
          contract_weekly_quota_hours: 8,
          contract_reserve_enabled: false,
          contract_payable_rule: "capped_quota",
          contract_overflow_rule: "ignore",
            viewer_enabled: false,
            multi_patron: false,
            export_pdf: false,
            export_excel: false,
            export_csv: false,
            bilan_mois: false,
            bilan_annee: false,
            historique_complet: false,
            gps: false,
          };

    setUpdating(user.id);
    try {
      const { error } = await updateUserFeatures(user.id, newFeatures);
      if (error) throw new Error(error);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, features: newFeatures } : u
        )
      );
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setDeleting(userId);
    setConfirmDeleteId(null);
    try {
      const { error } = await deleteUserProfile(userId);
      if (error) throw new Error(error);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleAdminReserveCorrection = async () => {
    if (!isAdmin) return;
    const delta = Number(adminReserveHours);
    if (!Number.isFinite(delta) || delta === 0) {
      setAdminReserveStatus("Entrez une valeur d'heures non nulle.");
      return;
    }

    try {
      await createReserveMovement({
        patronId: null,
        movementType: "admin_correction",
        source: "admin",
        deltaHours: delta,
        comment: adminReserveComment,
      });
      setAdminReserveStatus("Correction admin enregistrée.");
      setAdminReserveComment("");
    } catch (err: unknown) {
      setAdminReserveStatus(err instanceof Error ? err.message : String(err));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="animate-in slide-in-from-right duration-400">
      <div className="mb-6">
        <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center mb-4">
          Administration
        </p>
        <h2 className="text-2xl font-black text-[var(--color-primary)] italic font-['Playfair_Display'] text-center mb-2">
          Gestion des utilisateurs
        </h2>
        <p className="text-[11px] opacity-50 text-center">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 opacity-60">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-400 text-sm text-center mb-4">
          ⚠️ {error}
        </div>
      )}

      {updateError && (
        <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-400 text-sm text-center mb-4">
          ⚠️ Erreur mise à jour : {updateError}
        </div>
      )}

      {isAdmin && (
        <div className="mb-5 rounded-[25px] border border-[var(--color-accent-violet)]/35 bg-[var(--color-accent-violet)]/10 p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-violet)]">Réserve admin</p>
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
            <input
              type="number"
              step={0.25}
              value={adminReserveHours}
              onChange={(e) => setAdminReserveHours(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm text-[var(--color-text)]"
              aria-label="Heures correction admin"
            />
            <input
              type="text"
              value={adminReserveComment}
              onChange={(e) => setAdminReserveComment(e.target.value)}
              placeholder="Commentaire correction admin"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]"
              aria-label="Commentaire correction admin"
            />
            <button
              type="button"
              onClick={() => void handleAdminReserveCorrection()}
              className="rounded-lg border border-[var(--color-accent-violet)]/45 bg-[var(--color-accent-violet)]/20 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent-violet)]"
            >
              Corriger
            </button>
          </div>
          {adminReserveStatus && <p className="mt-2 text-xs text-[var(--color-text-muted)]">{adminReserveStatus}</p>}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {users.map((user) => {
            const plan = user.features?.plan || "free";
            const isPro = plan === "pro";
            const isUpdating = updating === user.id;
            const quota = Number((user.features?.contract_weekly_quota_hours as number) ?? 8);
            const reserveEnabled = user.features?.contract_reserve_enabled !== false;
            const payableRule = user.features?.contract_payable_rule === "worked_hours" ? "worked_hours" : "capped_quota";
            const overflowRule = user.features?.contract_overflow_rule === "to_reserve" ? "to_reserve" : "ignore";

            return (
              <div
                key={user.id}
                className="p-5 rounded-[25px] border border-[var(--color-border-primary)] bg-[var(--color-surface)] backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-sm text-[var(--color-text)] truncate">
                        {[user.prenom, user.nom].filter(Boolean).join(" ") || "—"}
                      </span>
                      {user.is_admin && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent-violet)]/20 border border-[var(--color-accent-violet)]/40 text-[var(--color-accent-violet)]">
                          Admin
                        </span>
                      )}
                      {user.role && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                          {user.role}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isPro
                            ? "bg-yellow-600/20 border-yellow-500/40 text-yellow-400"
                            : "bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {isPro ? "✨ Pro" : "Free"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                      {user.id?.substring(0, 8)}...
                    </p>
                    <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                      Inscription : {formatDate(user.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={() => togglePlan(user)}
                      disabled={isUpdating || deleting === user.id}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase border transition-all active:scale-95 ${
                        isPro
                          ? "bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-600/20 hover:border-red-500/40 hover:text-red-400"
                          : "bg-yellow-600/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-600/40"
                      } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                    >
                      {isUpdating ? "..." : isPro ? "→ Free" : "→ Pro"}
                    </button>

                    {confirmDeleteId === user.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                          className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-red-600/30 border border-red-500/50 text-red-400 hover:bg-red-600/50 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {deleting === user.id ? "⏳" : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 rounded-xl font-black text-[10px] uppercase bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/10 active:scale-95 transition-all"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        disabled={deleting === user.id || isUpdating}
                        title="Supprimer ce profil"
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/30 active:scale-90 transition-all disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Quota semaine
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      defaultValue={quota}
                      disabled={!isPro || isUpdating || deleting === user.id}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next) || next <= 0) return;
                        void updateContractSettings(user, { contract_weekly_quota_hours: next });
                      }}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                    />
                  </label>

                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Règle payable
                    <select
                      value={payableRule}
                      disabled={!isPro || isUpdating || deleting === user.id}
                      onChange={(e) => void updateContractSettings(user, { contract_payable_rule: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                    >
                      <option value="capped_quota">Capé quota</option>
                      <option value="worked_hours">Heures travaillées</option>
                    </select>
                  </label>

                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Dépassement
                    <select
                      value={overflowRule}
                      disabled={!isPro || isUpdating || deleting === user.id}
                      onChange={(e) => void updateContractSettings(user, { contract_overflow_rule: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
                    >
                      <option value="ignore">Ignorer</option>
                      <option value="to_reserve">Vers réserve</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={!isPro || isUpdating || deleting === user.id}
                    onClick={() => void updateContractSettings(user, { contract_reserve_enabled: !reserveEnabled })}
                    className={
                      "mt-4 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-[background,border-color] duration-150 " +
                      (reserveEnabled
                        ? "border-[var(--color-accent-green)]/40 bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)]")
                    }
                  >
                    {reserveEnabled ? "Réserve ON" : "Réserve OFF"}
                  </button>
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <p className="text-center text-sm opacity-50 py-8">
              Aucun utilisateur trouvé.
            </p>
          )}
        </div>
      )}

    </div>
  );
};

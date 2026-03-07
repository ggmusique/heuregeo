import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

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
export const AdminPage = ({ darkMode = true }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null); // id de l'user en cours de mise à jour
  const [updateError, setUpdateError] = useState(null);

  const [resetAction, setResetAction] = useState(null); // 'acomptes' | 'bilans' | null
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Nécessite une politique RLS autorisant l'admin à lire tous les profils
      const { data, error } = await supabase
        .from("profiles")
        .select("id, prenom, nom, created_at, features, is_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const togglePlan = async (user) => {
    const currentPlan = user.features?.plan || "free";
    const newPlan = currentPlan === "pro" ? "free" : "pro";

    const newFeatures =
      newPlan === "pro"
        ? {
            plan: "pro",
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
      const { error } = await supabase
        .from("profiles")
        .update({ features: newFeatures })
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, features: newFeatures } : u
        )
      );
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const getSynPatronId = async () => {
    const { data: patronData, error: patronError } = await supabase
      .from("patrons")
      .select("id, nom")
      .ilike("nom", "%Syn%")
      .limit(1);
    if (patronError || !patronData?.length) throw new Error("Patron Syn introuvable");
    return patronData[0].id;
  };

  const supprimerTousAcomptes = async () => {
    setResetLoading(true);
    setResetMessage(null);
    try {
      const synPatronId = await getSynPatronId();

      const { error: e1 } = await supabase
        .from("acompte_allocations")
        .delete()
        .eq("patron_id", synPatronId);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("acomptes")
        .delete()
        .eq("patron_id", synPatronId);
      if (e2) throw e2;

      setResetMessage({ type: "success", text: "✅ Acomptes de Syn supprimés." });
    } catch (err) {
      setResetMessage({ type: "error", text: `❌ Erreur : ${err.message}` });
    } finally {
      setResetLoading(false);
      setResetAction(null);
    }
  };

  const remettreEnNonPaye = async () => {
    setResetLoading(true);
    setResetMessage(null);
    try {
      setResetMessage({
        type: "error",
        text: "⚠️ Action désactivée: les statuts bilans sont gérés par apply_acompte + action manuelle 'Marquer comme payé'.",
      });
    } catch (err) {
      setResetMessage({ type: "error", text: `❌ Erreur : ${err.message}` });
    } finally {
      setResetLoading(false);
      setResetAction(null);
    }
  };

  const formatDate = (dateStr) => {
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
        <h2 className="text-2xl font-black text-[#C9A84C] italic font-['Playfair_Display'] text-center mb-2">
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

      {!loading && !error && (
        <div className="space-y-3">
          {users.map((user) => {
            const plan = user.features?.plan || "free";
            const isPro = plan === "pro";
            const isUpdating = updating === user.id;

            return (
              <div
                key={user.id}
                className="p-5 rounded-[25px] border border-yellow-600/20 bg-[#0A1628]/60 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-sm text-white truncate">
                        {[user.prenom, user.nom].filter(Boolean).join(" ") || "—"}
                      </span>
                      {user.is_admin && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300">
                          Admin
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isPro
                            ? "bg-yellow-600/20 border-yellow-500/40 text-yellow-300"
                            : "bg-white/10 border-white/20 text-white/50"
                        }`}
                      >
                        {isPro ? "✨ Pro" : "Free"}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-60 truncate">
                      {user.id?.substring(0, 8)}...
                    </p>
                    <p className="text-[10px] opacity-40 mt-1">
                      Inscription : {formatDate(user.created_at)}
                    </p>
                  </div>

                  <button
                    onClick={() => togglePlan(user)}
                    disabled={isUpdating}
                    className={`shrink-0 px-4 py-2 rounded-xl font-black text-[10px] uppercase border transition-all active:scale-95 ${
                      isPro
                        ? "bg-white/10 border-white/20 text-white/60 hover:bg-red-600/20 hover:border-red-500/40 hover:text-red-300"
                        : "bg-yellow-600/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-600/40"
                    } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
                  >
                    {isUpdating ? "..." : isPro ? "→ Free" : "→ Pro"}
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

      {/* Zone dangereuse — Outils admin */}
      <div className="mt-8">
        <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center mb-4">
          🛠️ Outils admin
        </p>

        {resetMessage && (
          <div
            className={`p-4 rounded-2xl text-sm text-center mb-4 border ${
              resetMessage.type === "success"
                ? "bg-green-600/20 border-green-500/40 text-green-300"
                : "bg-red-600/20 border-red-500/40 text-red-400"
            }`}
          >
            {resetMessage.text}
          </div>
        )}

        <div className="space-y-3">
          {/* Bouton 1 — Supprimer acomptes de Syn */}
          <div className="p-5 rounded-[25px] border border-red-500/20 bg-[#0A1628]/60 backdrop-blur-md">
            <p className="text-sm font-black text-red-300 mb-1">🗑️ Supprimer acomptes de Syn</p>
            <p className="text-[11px] opacity-50 mb-3">
              Supprime les lignes du patron "Syn" dans les tables <code>acomptes</code> et <code>acompte_allocations</code>.
            </p>
            {resetAction === "acomptes" ? (
              <div className="flex gap-2">
                <button
                  onClick={supprimerTousAcomptes}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-red-600/40 border-red-500/60 text-red-200 active:scale-95 disabled:opacity-50"
                >
                  {resetLoading ? "..." : "Confirmer"}
                </button>
                <button
                  onClick={() => setResetAction(null)}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-white/10 border-white/20 text-white/60 active:scale-95 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setResetMessage(null); setResetAction("acomptes"); }}
                className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30 active:scale-95"
              >
                Supprimer acomptes de Syn
              </button>
            )}
          </div>

          {/* Bouton 2 — Remettre bilans de Syn en non payé */}
          <div className="p-5 rounded-[25px] border border-orange-500/20 bg-[#0A1628]/60 backdrop-blur-md">
            <p className="text-sm font-black text-orange-300 mb-1">🔄 Remettre bilans de Syn en non payé</p>
            <p className="text-[11px] opacity-50 mb-3">
              Remet <code>paye = false</code>, <code>acompte_consomme = 0</code>, <code>reste_a_percevoir = ca_brut_periode</code> pour les bilans du patron "Syn".
            </p>
            {resetAction === "bilans" ? (
              <div className="flex gap-2">
                <button
                  onClick={remettreEnNonPaye}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-orange-600/40 border-orange-500/60 text-orange-200 active:scale-95 disabled:opacity-50"
                >
                  {resetLoading ? "..." : "Confirmer"}
                </button>
                <button
                  onClick={() => setResetAction(null)}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-white/10 border-white/20 text-white/60 active:scale-95 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setResetMessage(null); setResetAction("bilans"); }}
                className="px-4 py-2 rounded-xl font-black text-[10px] uppercase border bg-orange-600/20 border-orange-500/40 text-orange-300 hover:bg-orange-600/30 active:scale-95"
              >
                Remettre bilans de Syn en non payé
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

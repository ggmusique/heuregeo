import React, { useState } from "react";
import { fetchAllUnpaidWeeklyBilans, deleteBilanById } from "../../services/api/diagnosticsApi";
import type { UnpaidBilanRow } from "../../services/api/diagnosticsApi";
import type { Patron } from "../../types/entities";

/**
 * PhantomCleanupCard — Outil admin de nettoyage des impayés « fantômes ».
 *
 * Liste toutes les semaines non soldées (tous patrons confondus), permet d'en
 * cocher certaines et de les supprimer. Conçu pour purger les lignes de test qui
 * gonflent l'impayé antérieur.
 *
 * Sécurité : la sélection est 100% manuelle — aucune ligne n'est supprimée
 * automatiquement, et une confirmation est demandée avant suppression.
 */
export function PhantomCleanupCard({ patrons }: { patrons: Patron[] }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnpaidBilanRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patronNom = (id: string) =>
    patrons.find((p) => p.id === id)?.nom || `${String(id).slice(0, 8)}…`;

  const load = async () => {
    setLoading(true);
    setMsg(null);
    setConfirmDelete(false);
    setSelected(new Set());
    const { data, error } = await fetchAllUnpaidWeeklyBilans();
    if (error) {
      setMsg({ ok: false, text: error });
      setRows([]);
    } else {
      setRows(data);
    }
    setLoading(false);
  };

  const toggle = (id: string) => {
    setConfirmDelete(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    setConfirmDelete(false);
    setMsg(null);
    let ok = 0;
    let fail = 0;
    for (const id of Array.from(selected)) {
      const { error } = await deleteBilanById(id);
      if (error) fail++;
      else ok++;
    }
    setDeleting(false);
    setMsg({
      ok: fail === 0,
      text: `${ok} ligne(s) supprimée(s)${fail > 0 ? `, ${fail} échec(s)` : ""}.`,
    });
    await load();
  };

  return (
    <div className="p-4 rounded-[20px] border border-red-600/20 bg-[var(--color-surface)] backdrop-blur-card space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-200/70 mb-1">
        Nettoyer les impayés fantômes
      </p>
      <p className="text-[10px] text-[var(--color-text-dim)] mb-2">
        <span className="font-black text-[var(--color-text-muted)]">À utiliser si :</span> un impayé antérieur provient de semaines de test.<br />
        <span className="font-black text-[var(--color-text-muted)]">Effet :</span> liste toutes les semaines non soldées. Coche celles à supprimer (laisse décochées les vraies semaines impayées), puis supprime.
      </p>

      <button
        type="button"
        onClick={load}
        disabled={loading || deleting}
        className={`w-full px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-colors transition-transform active:scale-95 border-cyan-500/40 text-cyan-300 bg-cyan-600/10 hover:bg-cyan-600/20 ${loading ? "opacity-50 cursor-wait" : ""}`}
      >
        {loading ? "Chargement…" : rows ? "🔄 Recharger les impayés" : "🔍 Lister les impayés"}
      </button>

      {msg && (
        <div
          className={`p-2 rounded-xl text-[10px] font-black ${
            msg.ok
              ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
              : "bg-red-600/20 border border-red-500/30 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {rows && rows.length === 0 && (
        <p className="text-[11px] text-emerald-300 font-black text-center py-2">
          Aucune semaine non soldée ✓
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {rows.map((r) => {
              const ca = Number(r.ca_brut_periode ?? 0);
              const checked = selected.has(r.id);
              return (
                <li key={r.id}>
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-red-500/50 bg-red-600/15"
                        : "border-[var(--color-border)] bg-[var(--color-surface-offset)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(r.id)}
                      className="accent-red-500 shrink-0"
                    />
                    <span className="text-[11px] font-mono text-[var(--color-text)] flex-1">
                      S{r.periode_index} · {patronNom(r.patron_id)}
                    </span>
                    <span className="text-[11px] font-black text-yellow-300 shrink-0">
                      {ca.toFixed(2)} €
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={confirmDelete ? deleteSelected : () => setConfirmDelete(true)}
            disabled={deleting || selected.size === 0}
            className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-colors transition-transform active:scale-95 border-red-500/40 text-red-300 bg-red-600/10 hover:bg-red-600/20 ${
              deleting || selected.size === 0 ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {deleting
              ? "Suppression en cours…"
              : confirmDelete
              ? `⚠️ Confirmer la suppression (${selected.size})`
              : `🗑️ Supprimer la sélection (${selected.size})`}
          </button>
        </div>
      )}
    </div>
  );
}

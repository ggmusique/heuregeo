import React, { useState } from "react";
import { formatEuro, formatDateFR } from "../../utils/formatters";

/**
 * PatronPanel — détail expandable d'un patron
 * Affiché lorsqu'un patron est sélectionné dans PatronsManager.
 *
 * Props:
 *   patron       — objet patron
 *   stats        — { nbMissions, totalHeures, totalMontant, totalFrais, totalAcomptes, caBrut, reste }
 *   acomptes     — tableau de tous les acomptes (filtrés dans ce composant)
 *   darkMode     — boolean
 *   isViewer     — boolean (masque les actions si vrai)
 *   onEdit       — () => void
 *   onDelete     — () => void
 *   deleteAcompte — (id) => Promise<void>
 *   fetchAcomptes — () => Promise<void>
 *   showConfirm  — ({ title, message, confirmText, cancelText, type }) => Promise<boolean>
 *   triggerAlert — (msg: string) => void
 */
export function PatronPanel({
  patron,
  stats,
  acomptes = [],
  darkMode = true,
  isViewer = false,
  onEdit = () => {},
  onDelete = () => {},
  deleteAcompte = null,
  fetchAcomptes = null,
  showConfirm = null,
  triggerAlert = null,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const patronAcomptes = acomptes
    .filter((a) => a?.patron_id === patron.id)
    .sort((a, b) => new Date(b.date_acompte) - new Date(a.date_acompte));

  return (
    <div
      className={`px-5 pb-5 animate-in slide-in-from-top-2 duration-200 ${
        darkMode ? "bg-black/20" : "bg-white/50"
      }`}
    >
      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className={`p-3 rounded-2xl ${darkMode ? "bg-white/5" : "bg-white"}`}
        >
          <p className="text-[9px] font-black uppercase opacity-50">
            Total heures
          </p>
          <p className="text-lg font-black text-indigo-400">
            {stats.totalHeures.toFixed(2)}h
          </p>
        </div>

        <div
          className={`p-3 rounded-2xl ${darkMode ? "bg-white/5" : "bg-white"}`}
        >
          <p className="text-[9px] font-black uppercase opacity-50">
            Montant missions
          </p>
          <p className="text-lg font-black text-purple-400 amount-safe">
            {formatEuro(stats.totalMontant)}
          </p>
        </div>

        <div
          className={`p-3 rounded-2xl ${darkMode ? "bg-white/5" : "bg-white"}`}
        >
          <p className="text-[9px] font-black uppercase opacity-50">Frais</p>
          <p className="text-lg font-black text-amber-400 amount-safe">
            {formatEuro(stats.totalFrais)}
          </p>
        </div>

        <div
          className={`p-3 rounded-2xl ${darkMode ? "bg-white/5" : "bg-white"}`}
        >
          <p className="text-[9px] font-black uppercase opacity-50">Acomptes</p>
          <p className="text-lg font-black text-cyan-400 amount-safe">
            {formatEuro(stats.totalAcomptes)}
          </p>
        </div>
      </div>

      {/* Reste à percevoir */}
      <div className="mb-4 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30">
        <p className="text-[9px] font-black uppercase opacity-60 mb-1">
          Reste à percevoir
        </p>
        <p className="text-2xl font-black text-green-300 amount-safe">
          {formatEuro(stats.reste)}
        </p>
      </div>

      {/* Liste des acomptes */}
      {patronAcomptes.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase opacity-50 mb-2">
            💰 Acomptes
          </p>
          <div className="space-y-2">
            {patronAcomptes.map((acompte) => (
              <div
                key={acompte.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10"
              >
                <div>
                  <span className="text-sm font-bold text-cyan-400 amount-safe">
                    {formatEuro(acompte.montant)}
                  </span>
                  <span className="text-[10px] opacity-60 ml-2">
                    {formatDateFR(acompte.date_acompte)}
                  </span>
                </div>
                {!isViewer && deleteAcompte && showConfirm && (
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: "Supprimer cet acompte",
                        message: `Montant: ${formatEuro(acompte.montant)} - Date: ${formatDateFR(acompte.date_acompte)}\n\nCela annulera les paiements automatiques des semaines payées par cet acompte.\n\nContinuer ?`,
                        confirmText: "Supprimer",
                        cancelText: "Annuler",
                        type: "danger",
                      });

                      if (!confirmed) return;

                      setDeletingId(acompte.id);
                      try {
                        await deleteAcompte(acompte.id);
                        triggerAlert?.("✅ Acompte supprimé !");
                        await fetchAcomptes?.();
                      } catch {
                        triggerAlert?.(
                          "❌ Erreur lors de la suppression de l'acompte"
                        );
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === acompte.id}
                    className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center border border-red-500/30 active:scale-90 transition-all disabled:opacity-50"
                  >
                    {deletingId === acompte.id ? "⏳" : "🗑️"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {!isViewer && (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(patron)}
            className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${
              darkMode
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "bg-blue-100 text-blue-700 border border-blue-300"
            } active:scale-95`}
          >
            ✏️ Modifier
          </button>

          <button
            onClick={() => onDelete(patron)}
            className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${
              darkMode
                ? "bg-red-600/20 text-red-400 border border-red-500/30"
                : "bg-red-100 text-red-700 border border-red-300"
            } active:scale-95`}
          >
            🗑️ Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

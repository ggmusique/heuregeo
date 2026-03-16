import React, { useState, useCallback, useMemo } from "react";
import { formatEuro, formatDateFR } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * Gestionnaire complet des patrons avec liste et actions
 * - Affiche les patrons
 * - Statistiques par patron (missions / frais / acomptes)
 * - Expand / collapse par patron
 */
export function PatronsManager({
  patrons = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  missions = [],
  fraisDivers = [],
  acomptes = [],
  deleteAcompte = null,
  fetchAcomptes = null,
  showConfirm = null,
  triggerAlert = null,
  isViewer = false,
}) {
  const L = useLabels();
  const { isDark } = useTheme();
  const [expandedPatronId, setExpandedPatronId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const getPatronStats = useCallback(
    (patronId) => {
      const patronMissions = missions.filter((m) => m?.patron_id === patronId);
      const patronFrais = fraisDivers.filter((f) => f?.patron_id === patronId);
      const patronAcomptes = acomptes.filter((a) => a?.patron_id === patronId);

      const nbMissions = patronMissions.length;

      const totalHeures = patronMissions.reduce(
        (sum, m) => sum + (parseFloat(m?.duree) || 0),
        0
      );

      const totalMontant = patronMissions.reduce(
        (sum, m) => sum + (parseFloat(m?.montant) || 0),
        0
      );

      const totalFrais = patronFrais.reduce(
        (sum, f) => sum + (parseFloat(f?.montant) || 0),
        0
      );

      const totalAcomptes = patronAcomptes.reduce(
        (sum, a) => sum + (parseFloat(a?.montant) || 0),
        0
      );

      const caBrut = totalMontant + totalFrais;
      const reste = Math.max(0, caBrut - totalAcomptes);

      return {
        nbMissions,
        totalHeures,
        totalMontant,
        totalFrais,
        totalAcomptes,
        caBrut,
        reste,
      };
    },
    [missions, fraisDivers, acomptes]
  );

  const toggleExpand = useCallback((patronId) => {
    setExpandedPatronId((prev) => (prev === patronId ? null : patronId));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {`Mes ${L.patrons}`}
          </h2>
          <p className="text-[10px] opacity-60 uppercase tracking-wider mt-1">
            {patrons.length} patron{patrons.length > 1 ? "s" : ""} actif
            {patrons.length > 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={onAdd}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-lg"
        >
          + Nouveau
        </button>
      </div>

      {patrons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">👔</p>
          <p className="text-lg opacity-60 mb-6">Aucun patron créé</p>
          <button
            onClick={onAdd}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-3xl font-black uppercase text-[11px] active:scale-95 transition-all shadow-xl"
          >
            Créer mon premier patron
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {patrons.map((patron) => {
            const stats = getPatronStats(patron.id);
            const isExpanded = expandedPatronId === patron.id;

            return (
              <div
                key={patron.id}
                className={`rounded-[25px] overflow-hidden transition-all ${
                  isDark
                    ? "bg-white/5 border border-white/10"
                    : "bg-slate-100 border border-slate-200"
                }`}
              >
                <button
                  onClick={() => toggleExpand(patron.id)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 shadow-lg"
                    style={{ backgroundColor: patron.couleur || "#8b5cf6" }}
                  />

                  <div className="flex-1 text-left">
                    <p className="font-black text-lg uppercase tracking-tight">
                      {patron.nom}
                    </p>

                    <div className="flex gap-4 mt-1 flex-wrap">
                      {patron.taux_horaire != null && (
                        <span className="text-[10px] opacity-60">
                          {patron.taux_horaire}€/h
                        </span>
                      )}

                      <span className="text-[10px] opacity-60">
                        {stats.nbMissions} mission{stats.nbMissions > 1 ? "s" : ""}
                      </span>

                      <span className="text-[10px] font-bold text-green-400 amount-safe">
                        {formatEuro(stats.caBrut)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div
                    className={`px-5 pb-5 animate-in slide-in-from-top-2 duration-200 ${
                      isDark ? "bg-black/20" : "bg-white/50"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          isDark ? "bg-white/5" : "bg-white"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase opacity-50">
                          Total heures
                        </p>
                        <p className="text-lg font-black text-indigo-400">
                          {stats.totalHeures.toFixed(2)}h
                        </p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl ${
                          isDark ? "bg-white/5" : "bg-white"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase opacity-50">
                          Montant missions
                        </p>
                        <p className="text-lg font-black text-purple-400 amount-safe">
                          {formatEuro(stats.totalMontant)}
                        </p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl ${
                          isDark ? "bg-white/5" : "bg-white"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase opacity-50">
                          Frais
                        </p>
                        <p className="text-lg font-black text-amber-400 amount-safe">
                          {formatEuro(stats.totalFrais)}
                        </p>
                      </div>

                      <div
                        className={`p-3 rounded-2xl ${
                          isDark ? "bg-white/5" : "bg-white"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase opacity-50">
                          Acomptes
                        </p>
                        <p className="text-lg font-black text-cyan-400 amount-safe">
                          {formatEuro(stats.totalAcomptes)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30">
                      <p className="text-[9px] font-black uppercase opacity-60 mb-1">
                        Reste à percevoir
                      </p>
                      <p className="text-2xl font-black text-green-300 amount-safe">
                        {formatEuro(stats.reste)}
                      </p>
                    </div>

                    {acomptes.filter((a) => a?.patron_id === patron.id).length > 0 && (
                      <div className="mb-4">
                        <p className="text-[9px] font-black uppercase opacity-50 mb-2">
                          💰 Acomptes
                        </p>
                        <div className="space-y-2">
                          {acomptes
                            .filter((a) => a?.patron_id === patron.id)
                            .sort((a, b) => new Date(b.date_acompte) - new Date(a.date_acompte))
                            .map((acompte) => (
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
                                      } catch (err) {
                                        triggerAlert?.("❌ Erreur lors de la suppression de l'acompte");
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(patron)}
                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${
                          isDark
                            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                            : "bg-blue-100 text-blue-700 border border-blue-300"
                        } active:scale-95`}
                      >
                        ✏️ Modifier
                      </button>

                      <button
                        onClick={() => onDelete(patron)}
                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${
                          isDark
                            ? "bg-red-600/20 text-red-400 border border-red-500/30"
                            : "bg-red-100 text-red-700 border border-red-300"
                        } active:scale-95`}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useMemo } from "react";
import { formatEuro } from "../../utils/formatters";

/**
 * Gestionnaire complet des patrons avec liste et actions
 * - Affiche les patrons
 * - Statistiques par patron (missions / frais / acomptes)
 * - Expand / collapse par patron
 */
export function PatronsManager({
  patrons = [],          // ✅ safe: éviter undefined
  onEdit = () => {},     // ✅ safe: fallback
  onDelete = () => {},   // ✅ safe: fallback
  onAdd = () => {},      // ✅ safe: fallback
  darkMode = true,
  missions = [],         // ✅ safe
  fraisDivers = [],      // ✅ safe
  acomptes = [],         // ✅ safe
}) {
  const [expandedPatronId, setExpandedPatronId] = useState(null);

  /**
   * ✅ Calcul des stats pour un patron
   * - missions: heures + montant
   * - frais: total frais (⚠️ souvent "montant" en string)
   * - acomptes: total acomptes (⚠️ souvent "montant" en string)
   */
  const getPatronStats = useCallback(
    (patronId) => {
      const patronMissions = missions.filter((m) => m?.patron_id === patronId);
      const patronFrais = fraisDivers.filter((f) => f?.patron_id === patronId);
      const patronAcomptes = acomptes.filter((a) => a?.patron_id === patronId);

      const nbMissions = patronMissions.length;

      // Total heures (missions)
      const totalHeures = patronMissions.reduce(
        (sum, m) => sum + (parseFloat(m?.duree) || 0),
        0
      );

      // Total montant missions
      const totalMontant = patronMissions.reduce(
        (sum, m) => sum + (parseFloat(m?.montant) || 0),
        0
      );

      // Total frais (montant peut être string)
      const totalFrais = patronFrais.reduce(
        (sum, f) => sum + (parseFloat(f?.montant) || 0),
        0
      );

      // Total acomptes (montant peut être string)
      const totalAcomptes = patronAcomptes.reduce(
        (sum, a) => sum + (parseFloat(a?.montant) || 0),
        0
      );

      // CA brut = missions + frais
      const caBrut = totalMontant + totalFrais;

      // Reste à percevoir = CA brut - acomptes
      // ✅ clamp à 0 pour éviter un affichage négatif
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

  /**
   * Toggle expand/collapse
   */
  const toggleExpand = useCallback((patronId) => {
    setExpandedPatronId((prev) => (prev === patronId ? null : patronId));
  }, []);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Mes Patrons
          </h2>
          <p className="text-[10px] opacity-60 uppercase tracking-wider mt-1">
            {patrons.length} patron{patrons.length > 1 ? "s" : ""} actif
            {patrons.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Bouton ajout */}
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-lg"
        >
          + Nouveau
        </button>
      </div>

      {/* Liste des patrons */}
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
            // ✅ stats calculées par patron
            const stats = getPatronStats(patron.id);
            const isExpanded = expandedPatronId === patron.id;

            return (
              <div
                key={patron.id}
                className={`rounded-[25px] overflow-hidden transition-all ${
                  darkMode
                    ? "bg-white/5 border border-white/10"
                    : "bg-slate-100 border border-slate-200"
                }`}
              >
                {/* En-tête patron (clic = expand) */}
                <button
                  onClick={() => toggleExpand(patron.id)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-all"
                >
                  {/* Pastille couleur */}
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 shadow-lg"
                    style={{ backgroundColor: patron.couleur || "#8b5cf6" }} // ✅ fallback
                  />

                  {/* Infos principales */}
                  <div className="flex-1 text-left">
                    <p className="font-black text-lg uppercase tracking-tight">
                      {patron.nom}
                    </p>

                    {/* Mini infos */}
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

                  {/* Icône expand */}
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

                {/* Détails expandables */}
                {isExpanded && (
                  <div
                    className={`px-5 pb-5 animate-in slide-in-from-top-2 duration-200 ${
                      darkMode ? "bg-black/20" : "bg-white/50"
                    }`}
                  >
                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          darkMode ? "bg-white/5" : "bg-white"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase opacity-50">
                          Total heures
                        </p>
                        <p className="text-lg font-black text-indigo-400">
                          {stats.totalHeures.toFixed(2)}h
                        </p>
                      </div>

                      {/* ⚠️ ici, tu affichais un montant mais le label disait "Missions" */}
                      <div
                        className={`p-3 rounded-2xl ${
                          darkMode ? "bg-white/5" : "bg-white"
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
                          darkMode ? "bg-white/5" : "bg-white"
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
                          darkMode ? "bg-white/5" : "bg-white"
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

                    {/* Reste à percevoir */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30">
                      <p className="text-[9px] font-black uppercase opacity-60 mb-1">
                        Reste à percevoir
                      </p>
                      <p className="text-2xl font-black text-green-300 amount-safe">
                        {formatEuro(stats.reste)}
                      </p>
                    </div>

                    {/* Actions */}
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

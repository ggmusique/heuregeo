import React, { useState, useMemo } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";

/**
 * ✅ Gestionnaire complet des lieux avec liste et stats
 * - Liste + recherche
 * - Stats globales + stats par lieu
 * - Boutons edit/delete/add
 *
 * ✅ Améliorations "safe" :
 * - Calcul stats en useMemo (pas de Promise inutile)
 * - Filtres robustes (strings / numbers)
 * - GPS affiché seulement si lat/lon valides
 */
export const LieuxManager = ({
  lieux = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  darkMode = true,
  missions = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * ✅ Calculer les stats par lieu (synchrone)
   * - mission match si lieu_id === lieu.id OU lieu TEXT === lieu.nom
   * - ajoute : nombreMissions, totalHeures, totalCA, derniereMission
   */
  const lieuxWithStats = useMemo(() => {
    const lieuxArray = Array.isArray(lieux) ? lieux : [];
    const missionsArray = Array.isArray(missions) ? missions : [];

    return lieuxArray.map((lieu) => {
      const lieuId = lieu?.id;
      const lieuNom = (lieu?.nom || "").toString();

      const lieuMissions = missionsArray.filter((m) => {
        const matchId = m?.lieu_id && lieuId && m.lieu_id === lieuId;
        const matchNom = m?.lieu && lieuNom && m.lieu === lieuNom;
        return matchId || matchNom;
      });

      const totalHeures = lieuMissions.reduce((sum, m) => sum + (Number(m?.duree) || 0), 0);
      const totalCA = lieuMissions.reduce((sum, m) => sum + (Number(m?.montant) || 0), 0);

      const derniereMission =
        lieuMissions.length > 0
          ? [...lieuMissions]
              .sort((a, b) => new Date(b?.date_iso) - new Date(a?.date_iso))[0]
              ?.date_iso || null
          : null;

      return {
        ...lieu,
        nombreMissions: lieuMissions.length,
        totalHeures,
        totalCA,
        derniereMission,
      };
    });
  }, [lieux, missions]);

  /**
   * ✅ Filtrer les lieux selon la recherche (safe)
   */
  const filteredLieux = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return lieuxWithStats;

    return lieuxWithStats.filter((lieu) => {
      const nom = (lieu?.nom || "").toString().toLowerCase();
      const adresse = (lieu?.adresse_complete || "").toString().toLowerCase();
      return nom.includes(term) || adresse.includes(term);
    });
  }, [lieuxWithStats, searchTerm]);

  /**
   * ✅ Trier par nombre de missions (les plus fréquentés en premier)
   */
  const sortedLieux = useMemo(() => {
    return [...filteredLieux].sort(
      (a, b) => (Number(b?.nombreMissions) || 0) - (Number(a?.nombreMissions) || 0)
    );
  }, [filteredLieux]);

  /**
   * ✅ Stats globales (calculées une seule fois)
   */
  const globalStats = useMemo(() => {
    const totalMissions = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.nombreMissions) || 0), 0);
    const totalHeures = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalHeures) || 0), 0);
    const totalCA = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalCA) || 0), 0);

    return { totalMissions, totalHeures, totalCA };
  }, [lieuxWithStats]);

  /**
   * ✅ Helper : vérifier GPS valide
   */
  const isValidNumber = (v) => typeof v === "number" && !Number.isNaN(v);

  return (
    <div className="space-y-6">
      {/* Header avec bouton ajouter et recherche */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Rechercher un lieu..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
            } backdrop-blur-md`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={onAdd}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-black text-white text-[11px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 backdrop-blur-md"
        >
          + Nouveau Lieu
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30"
              : "bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-300"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            Total Lieux
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {Array.isArray(lieux) ? lieux.length : 0}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30"
              : "bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            Total Missions
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {globalStats.totalMissions}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30"
              : "bg-gradient-to-br from-cyan-100 to-blue-100 border border-cyan-300"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            Total Heures
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {formatHeures(globalStats.totalHeures)}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30"
              : "bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            CA Total
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {formatEuro(globalStats.totalCA)}
          </div>
        </div>
      </div>

      {/* Liste des lieux */}
      <div className="space-y-3">
        {sortedLieux.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-20">📍</div>
            <p className="text-lg font-bold opacity-60">
              {searchTerm ? "Aucun lieu trouvé" : "Aucun lieu enregistré"}
            </p>
            {!searchTerm && (
              <button
                onClick={onAdd}
                className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-2xl font-black text-white text-[11px] uppercase transition-all"
              >
                Créer le premier lieu
              </button>
            )}
          </div>
        ) : (
          sortedLieux.map((lieu) => {
            const hasGps =
              isValidNumber(lieu?.latitude) && isValidNumber(lieu?.longitude);

            return (
              <div
                key={lieu.id}
                className={`p-5 rounded-[25px] backdrop-blur-md border-2 ${
                  darkMode
                    ? "bg-white/5 border-white/10 hover:border-purple-500/40"
                    : "bg-white border-slate-200 hover:border-purple-300"
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Infos lieu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-black text-white truncate">
                        {lieu?.nom || "Lieu"}
                      </h3>

                      {Number(lieu?.nombreMissions) === 0 && (
                        <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-[9px] font-black text-yellow-400 uppercase">
                          Nouveau
                        </span>
                      )}

                      {/* ✅ Badge GPS OK */}
                      {hasGps && (
                        <span className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-300 uppercase">
                          GPS OK ✓
                        </span>
                      )}
                    </div>

                    {/* Adresse & GPS */}
                    <div className="space-y-1 mb-3">
                      {lieu?.adresse_complete && (
                        <div className="text-xs text-white/60 flex items-start gap-2">
                          <span className="shrink-0">📍</span>
                          <span className="line-clamp-2">
                            {lieu.adresse_complete}
                          </span>
                        </div>
                      )}

                      {hasGps && (
                        <div className="text-xs text-white/60 flex items-center gap-2">
                          <span>🌐</span>
                          <span>
                            GPS: {lieu.latitude.toFixed(6)},{" "}
                            {lieu.longitude.toFixed(6)}
                          </span>
                        </div>
                      )}

                      {lieu?.notes && (
                        <div className="text-xs text-white/60 flex items-start gap-2">
                          <span className="shrink-0">📝</span>
                          <span className="line-clamp-2">{lieu.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">
                          Missions
                        </div>
                        <div className="text-base font-black text-purple-400">
                          {Number(lieu?.nombreMissions) || 0}
                        </div>
                      </div>

                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">
                          Heures
                        </div>
                        <div className="text-base font-black text-cyan-400">
                          {formatHeures(Number(lieu?.totalHeures) || 0)}
                        </div>
                      </div>

                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">
                          CA
                        </div>
                        <div className="text-base font-black text-green-400">
                          {formatEuro(Number(lieu?.totalCA) || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Dernière mission */}
                    {lieu?.derniereMission && (
                      <div className="mt-2 text-[10px] text-white/40">
                        Dernière mission :{" "}
                        {new Date(lieu.derniereMission).toLocaleDateString(
                          "fr-FR"
                        )}
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(lieu)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                        darkMode
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
                          : "bg-blue-100 text-blue-600 border border-blue-300 hover:bg-blue-200"
                      }`}
                      title="Modifier"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => onDelete(lieu)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                        darkMode
                          ? "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
                          : "bg-red-100 text-red-600 border border-red-300 hover:bg-red-200"
                      }`}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

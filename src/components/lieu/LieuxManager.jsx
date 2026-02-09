import React, { useState, useEffect } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";

/**
 * Gestionnaire complet des lieux avec liste et stats
 */
export const LieuxManager = ({
  lieux = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  darkMode = true,
  missions = [], // Pour calculer les stats
}) => {
  const [lieuxWithStats, setLieuxWithStats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculer les stats pour chaque lieu
  useEffect(() => {
    const statsPromises = lieux.map(async (lieu) => {
      // Filtrer les missions de ce lieu (lieu_id OU lieu TEXT)
      const lieuMissions = missions.filter(
        (m) => m.lieu_id === lieu.id || m.lieu === lieu.nom
      );

      const stats = {
        nombreMissions: lieuMissions.length,
        totalHeures: lieuMissions.reduce((sum, m) => sum + (m.duree || 0), 0),
        totalCA: lieuMissions.reduce((sum, m) => sum + (m.montant || 0), 0),
        derniereMission:
          lieuMissions.length > 0
            ? lieuMissions.sort(
                (a, b) => new Date(b.date_iso) - new Date(a.date_iso)
              )[0].date_iso
            : null,
      };

      return { ...lieu, ...stats };
    });

    Promise.all(statsPromises).then(setLieuxWithStats);
  }, [lieux, missions]);

  // Filtrer les lieux selon la recherche
  const filteredLieux = lieuxWithStats.filter(
    (lieu) =>
      lieu.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lieu.adresse_complete?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trier par nombre de missions (les plus fréquentés en premier)
  const sortedLieux = [...filteredLieux].sort(
    (a, b) => b.nombreMissions - a.nombreMissions
  );

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
            {lieux.length}
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
            {lieuxWithStats.reduce((sum, l) => sum + l.nombreMissions, 0)}
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
            {formatHeures(
              lieuxWithStats.reduce((sum, l) => sum + l.totalHeures, 0)
            )}
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
            {formatEuro(lieuxWithStats.reduce((sum, l) => sum + l.totalCA, 0))}
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
          sortedLieux.map((lieu) => (
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
                      {lieu.nom}
                    </h3>
                    {lieu.nombreMissions === 0 && (
                      <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-[9px] font-black text-yellow-400 uppercase">
                        Nouveau
                      </span>
                    )}
                  </div>

                  {/* Adresse & GPS */}
                  <div className="space-y-1 mb-3">
                    {lieu.adresse_complete && (
                      <div className="text-xs text-white/60 flex items-start gap-2">
                        <span className="shrink-0">📍</span>
                        <span className="line-clamp-2">
                          {lieu.adresse_complete}
                        </span>
                      </div>
                    )}
                    {lieu.latitude && lieu.longitude && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>🌐</span>
                        <span>
                          GPS: {lieu.latitude.toFixed(6)},{" "}
                          {lieu.longitude.toFixed(6)}
                        </span>
                      </div>
                    )}
                    {lieu.notes && (
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
                        {lieu.nombreMissions}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        Heures
                      </div>
                      <div className="text-base font-black text-cyan-400">
                        {formatHeures(lieu.totalHeures)}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        CA
                      </div>
                      <div className="text-base font-black text-green-400">
                        {formatEuro(lieu.totalCA)}
                      </div>
                    </div>
                  </div>

                  {/* Dernière mission */}
                  {lieu.derniereMission && (
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
          ))
        )}
      </div>
    </div>
  );
};

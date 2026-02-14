import React, { useState, useMemo } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";

/**
 * ClientsManager (ULTRA PRO + DEDOUBLONNAGE)
 * ✅ Optimisation:
 * - Index missions par client_id (Map) + fallback par client (nom)
 * - Dédoublonnage strict par mission.id pour éviter les doubles comptes
 * - Même UI / même comportement
 */
export const ClientsManager = ({
  clients = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  darkMode = true,
  missions = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * ✅ Index missions :
   * - byClientId : Map(client_id => missions[])
   * - byClientName : Map(clientName => missions[]) (fallback legacy)
   */
  const missionIndex = useMemo(() => {
    const safeMissions = Array.isArray(missions) ? missions : [];

    const byClientId = new Map();
    const byClientName = new Map();

    for (const m of safeMissions) {
      if (!m) continue;

      if (m.client_id) {
        const key = m.client_id;
        if (!byClientId.has(key)) byClientId.set(key, []);
        byClientId.get(key).push(m);
      }

      if (m.client) {
        const name = String(m.client);
        if (!byClientName.has(name)) byClientName.set(name, []);
        byClientName.get(name).push(m);
      }
    }

    return { byClientId, byClientName };
  }, [missions]);

  /**
   * ✅ Clients enrichis avec stats
   * - récupère missions depuis Map (rapide)
   * - concatène id + fallback nom
   * - dédoublonne par mission.id (ou fallback clé si pas d'id)
   */
  const clientsWithStats = useMemo(() => {
    const safeClients = Array.isArray(clients) ? clients : [];

    return safeClients.map((client) => {
      const fromId = missionIndex.byClientId.get(client.id) || [];
      const fromName = missionIndex.byClientName.get(client.nom) || [];

      // ✅ Fusion + dédoublonnage
      const merged = [...fromId, ...fromName];
      const seen = new Set();

      const clientMissions = merged.filter((m) => {
        // id idéal
        const key =
          m?.id != null
            ? `id:${m.id}`
            : `fallback:${m?.date_iso || ""}|${m?.debut || ""}|${m?.fin || ""}|${
                m?.montant || 0
              }|${m?.duree || 0}`;

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const totalHeures = clientMissions.reduce(
        (sum, m) => sum + (m?.duree || 0),
        0
      );

      const totalCA = clientMissions.reduce(
        (sum, m) => sum + (m?.montant || 0),
        0
      );

      const derniereMission =
        clientMissions.length > 0
          ? [...clientMissions].sort(
              (a, b) => new Date(b.date_iso) - new Date(a.date_iso)
            )[0]?.date_iso || null
          : null;

      return {
        ...client,
        nombreMissions: clientMissions.length,
        totalHeures,
        totalCA,
        derniereMission,
      };
    });
  }, [clients, missionIndex]);

  /**
   * ✅ Filtrage (recherche sur nom)
   */
  const filteredClients = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return clientsWithStats;

    return clientsWithStats.filter((client) =>
      (client?.nom || "").toLowerCase().includes(term)
    );
  }, [clientsWithStats, searchTerm]);

  /**
   * ✅ Tri par activité
   */
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort(
      (a, b) => (b.nombreMissions || 0) - (a.nombreMissions || 0)
    );
  }, [filteredClients]);

  /**
   * ✅ Stats globales
   */
  const globalStats = useMemo(() => {
    return {
      totalClients: clients.length,
      totalMissions: clientsWithStats.reduce(
        (sum, c) => sum + (c.nombreMissions || 0),
        0
      ),
      totalHeures: clientsWithStats.reduce(
        (sum, c) => sum + (c.totalHeures || 0),
        0
      ),
      totalCA: clientsWithStats.reduce((sum, c) => sum + (c.totalCA || 0), 0),
    };
  }, [clients.length, clientsWithStats]);

  return (
    <div className="space-y-6">
      {/* Header avec bouton ajouter et recherche */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Rechercher un client..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
            } backdrop-blur-md`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={onAdd}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-black text-white text-[11px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 backdrop-blur-md"
        >
          + Nouveau Client
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30"
              : "bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-300"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            Total Clients
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {globalStats.totalClients}
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

      {/* Liste des clients */}
      <div className="space-y-3">
        {sortedClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-20">🏢</div>
            <p className="text-lg font-bold opacity-60">
              {searchTerm ? "Aucun client trouvé" : "Aucun client enregistré"}
            </p>
            {!searchTerm && (
              <button
                onClick={onAdd}
                className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-white text-[11px] uppercase transition-all"
              >
                Créer le premier client
              </button>
            )}
          </div>
        ) : (
          sortedClients.map((client) => (
            <div
              key={client.id}
              className={`p-5 rounded-[25px] backdrop-blur-md border-2 ${
                darkMode
                  ? "bg-white/5 border-white/10 hover:border-indigo-500/40"
                  : "bg-white border-slate-200 hover:border-indigo-300"
              } transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Infos client */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-black text-white truncate">
                      {client.nom}
                    </h3>
                    {client.nombreMissions === 0 && (
                      <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-[9px] font-black text-yellow-400 uppercase">
                        Nouveau
                      </span>
                    )}
                  </div>

                  {/* Contact & lieu_travail */}
                  <div className="space-y-1 mb-3">
                    {client.contact && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📞</span>
                        <span>{client.contact}</span>
                      </div>
                    )}
                    {client.lieu_travail && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📍</span>
                        <span className="truncate">{client.lieu_travail}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📝</span>
                        <span className="truncate">{client.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        Missions
                      </div>
                      <div className="text-base font-black text-indigo-400">
                        {client.nombreMissions}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        Heures
                      </div>
                      <div className="text-base font-black text-cyan-400">
                        {formatHeures(client.totalHeures)}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        CA
                      </div>
                      <div className="text-base font-black text-green-400">
                        {formatEuro(client.totalCA)}
                      </div>
                    </div>
                  </div>

                  {/* Dernière mission */}
                  {client.derniereMission && (
                    <div className="mt-2 text-[10px] text-white/40">
                      Dernière mission :{" "}
                      {new Date(client.derniereMission).toLocaleDateString(
                        "fr-FR"
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(client)}
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
                    onClick={() => onDelete(client)}
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

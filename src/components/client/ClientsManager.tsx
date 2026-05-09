import React, { useState, useMemo } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";

interface Props {
  clients?: any[];
  onEdit?: (client: any) => void;
  onDelete?: (client: any) => void;
  onAdd?: () => void;
  darkMode?: boolean;
  missions?: any[];
  allowActions?: boolean;
}

export const ClientsManager = ({
  clients = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  darkMode = true,
  missions = [],
  allowActions = true,
}: Props) => {
  const L = useLabels();
  const [searchTerm, setSearchTerm] = useState("");

  const clientsDeduped = useMemo(() => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const map = new Map<string, any>();

    for (const c of safeClients) {
      if (!c?.nom) continue;
      const key = String(c.nom).trim().toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          ...c,
          _ids: [c.id],
          lieuxTravail: c.lieu_travail ? [c.lieu_travail] : [],
        });
      } else {
        const existing = map.get(key);
        existing._ids.push(c.id);

        if (c.lieu_travail && !existing.lieuxTravail.includes(c.lieu_travail)) {
          existing.lieuxTravail.push(c.lieu_travail);
        }

        if (!existing.contact && c.contact) existing.contact = c.contact;
        if (!existing.notes && c.notes) existing.notes = c.notes;
      }
    }

    return Array.from(map.values());
  }, [clients]);

  const missionIndex = useMemo(() => {
    const safeMissions = Array.isArray(missions) ? missions : [];

    const byClientId = new Map<string, any[]>();
    const byClientName = new Map<string, any[]>();

    for (const m of safeMissions) {
      if (!m) continue;

      if (m.client_id) {
        const key = m.client_id;
        if (!byClientId.has(key)) byClientId.set(key, []);
        byClientId.get(key)!.push(m);
      }

      if (m.client) {
        const name = String(m.client);
        if (!byClientName.has(name)) byClientName.set(name, []);
        byClientName.get(name)!.push(m);
      }
    }

    return { byClientId, byClientName };
  }, [missions]);

  const clientsWithStats = useMemo(() => {
    const safeClients = Array.isArray(clientsDeduped) ? clientsDeduped : [];

    return safeClients.map((client) => {
      const ids = Array.isArray(client._ids) ? client._ids : [client.id];
      const fromIds = ids.flatMap((id: string) => missionIndex.byClientId.get(id) || []);

      const fromName = missionIndex.byClientName.get(client.nom) || [];

      const merged = [...fromIds, ...fromName];
      const seen = new Set<string>();

      const clientMissions = merged.filter((m) => {
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
        (sum: number, m: any) => sum + (m?.duree || 0),
        0
      );

      const totalCA = clientMissions.reduce(
        (sum: number, m: any) => sum + (m?.montant || 0),
        0
      );

      const derniereMission =
        clientMissions.length > 0
          ? [...clientMissions].sort(
              (a: any, b: any) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
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
  }, [clientsDeduped, missionIndex]);

  const filteredClients = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return clientsWithStats;

    return clientsWithStats.filter((client: any) =>
      (client?.nom || "").toLowerCase().includes(term)
    );
  }, [clientsWithStats, searchTerm]);

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort(
      (a: any, b: any) => (b.nombreMissions || 0) - (a.nombreMissions || 0)
    );
  }, [filteredClients]);

  const globalStats = useMemo(() => {
    return {
      totalClients: clientsDeduped.length,
      totalMissions: clientsWithStats.reduce(
        (sum: number, c: any) => sum + (c.nombreMissions || 0),
        0
      ),
      totalHeures: clientsWithStats.reduce(
        (sum: number, c: any) => sum + (c.totalHeures || 0),
        0
      ),
      totalCA: clientsWithStats.reduce((sum: number, c: any) => sum + (c.totalCA || 0), 0),
    };
  }, [clientsDeduped.length, clientsWithStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Rechercher un client..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                : "bg-[var(--color-field)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)]"
            } backdrop-blur-md`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={onAdd}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)] rounded-2xl font-black text-white text-[11px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 backdrop-blur-md"
        >
          + Nouveau {L.client}
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-[var(--color-accent-violet)]/20 to-[var(--color-accent-fuchsia)]/20 border border-[var(--color-accent-violet)]/30"
              : "bg-gradient-to-br from-[var(--color-accent-violet)]/10 to-[var(--color-accent-fuchsia)]/10 border border-[var(--color-accent-violet)]/20"
          } backdrop-blur-md`}
        >
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">
            Total {L.clients}
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {globalStats.totalClients}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl ${
            darkMode
              ? "bg-gradient-to-br from-[var(--color-accent-green)]/20 to-[var(--color-accent-green)]/20 border border-[var(--color-accent-green)]/30"
              : "bg-gradient-to-br from-[var(--color-accent-green)]/10 to-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/20"
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
              ? "bg-gradient-to-br from-[var(--color-accent-cyan)]/20 to-[color-mix(in_srgb,var(--color-accent-cyan)_20%,var(--color-accent-violet))]/20 border border-[var(--color-accent-cyan)]/30"
              : "bg-gradient-to-br from-[var(--color-accent-cyan)]/10 to-[color-mix(in_srgb,var(--color-accent-cyan)_20%,var(--color-accent-violet))]/10 border border-[var(--color-accent-cyan)]/20"
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
              ? "bg-gradient-to-br from-[var(--color-accent-amber)]/20 to-[var(--color-accent-orange)]/20 border border-[var(--color-accent-amber)]/30"
              : "bg-gradient-to-br from-[var(--color-accent-amber)]/10 to-[var(--color-accent-orange)]/10 border border-[var(--color-accent-amber)]/20"
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
                className="mt-4 px-6 py-3 bg-[var(--color-accent-violet)] hover:bg-[color-mix(in_srgb,var(--color-accent-violet)_80%,black)] rounded-2xl font-black text-white text-[11px] uppercase transition-all"
              >
                Créer le premier client
              </button>
            )}
          </div>
        ) : (
          sortedClients.map((client: any) => (
            <div
              key={client.id}
              className={`p-5 rounded-[25px] backdrop-blur-md border-2 ${
                darkMode
                  ? "bg-white/5 border-white/10 hover:border-[var(--color-accent-violet)]/40"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-violet)]/30"
              } transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-black text-white truncate">
                      {client.nom}
                    </h3>
                    {client.nombreMissions === 0 && (
                      <span className="px-2 py-1 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 rounded-lg text-[9px] font-black text-[var(--color-primary)] uppercase">
                        Nouveau
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mb-3">
                    {client.contact && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📞</span>
                        <span>{client.contact}</span>
                      </div>
                    )}

                    {client.lieuxTravail?.length > 0 && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📍</span>
                        <span className="truncate">
                          {client.lieuxTravail.length === 1
                            ? client.lieuxTravail[0]
                            : `${client.lieuxTravail[0]} (+${
                                client.lieuxTravail.length - 1
                              } autre${
                                client.lieuxTravail.length - 1 > 1 ? "s" : ""
                              })`}
                        </span>
                      </div>
                    )}

                    {client.notes && (
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <span>📝</span>
                        <span className="truncate">{client.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        Missions
                      </div>
                      <div className="text-base font-black text-[var(--color-accent-violet)]">
                        {client.nombreMissions}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        Heures
                      </div>
                      <div className="text-base font-black text-[var(--color-accent-cyan)]">
                        {formatHeures(client.totalHeures)}
                      </div>
                    </div>
                    <div className="bg-black/20 px-3 py-2 rounded-xl">
                      <div className="text-[9px] font-black uppercase opacity-40">
                        CA
                      </div>
                      <div className="text-base font-black text-[var(--color-accent-green)]">
                        {formatEuro(client.totalCA)}
                      </div>
                    </div>
                  </div>

                  {client.derniereMission && (
                    <div className="mt-2 text-[10px] text-white/40">
                      Dernière mission :{" "}
                      {new Date(client.derniereMission).toLocaleDateString(
                        "fr-FR"
                      )}
                    </div>
                  )}
                </div>

                {allowActions && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    aria-label="Modifier ce client"
                    title="Modifier"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      darkMode
                        ? "bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 hover:bg-[var(--color-accent-cyan)]/30"
                        : "bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 hover:bg-[var(--color-accent-cyan)]/20"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(client)}
                    aria-label="Supprimer ce client"
                    title="Supprimer"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      darkMode
                        ? "bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30 hover:bg-[var(--color-accent-red)]/30"
                        : "bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30 hover:bg-[var(--color-accent-red)]/20"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

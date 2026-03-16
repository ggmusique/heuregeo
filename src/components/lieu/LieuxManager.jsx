import React, { useState, useMemo, useCallback } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { geocodeAddress } from "../../utils/geocode";
import { isSuspectLieu } from "../../utils/suspectCoords";
import { useLabels } from "../../contexts/LabelsContext";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * ✅ Gestionnaire complet des lieux avec liste et stats
 */
export const LieuxManager = ({
  lieux = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  onLieuEdit = () => {},
  missions = [],
  allowActions = true,
  kmSettings = null,
  onRegeocoderLieu = null,
}) => {
  const L = useLabels();
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(null);
  const [backfillResult, setBackfillResult] = useState(null);
  const [regeocodingId, setRegeocodingId] = useState(null);
  const [regeocodingErrors, setRegeocodingErrors] = useState({});

  const lieuxSansCoords = useMemo(() => {
    return lieux.filter((l) => !l.latitude || !l.longitude);
  }, [lieux]);

  const handleBackfillCoords = useCallback(async () => {
    if (backfillRunning || lieuxSansCoords.length === 0) return;
    setBackfillRunning(true);
    setBackfillProgress({ done: 0, total: lieuxSansCoords.length });
    setBackfillResult(null);
    let updated = 0;
    const errors = [];
    for (let i = 0; i < lieuxSansCoords.length; i++) {
      const lieu = lieuxSansCoords[i];
      const query = [lieu.adresse_complete, lieu.nom].filter(Boolean).join(", ");
      const result = await geocodeAddress(query);
      if (result) {
        try {
          await onEdit({ ...lieu, latitude: result.lat, longitude: result.lng });
          updated++;
        } catch {
          errors.push({ id: lieu.id, nom: lieu.nom });
        }
      } else {
        errors.push({ id: lieu.id, nom: lieu.nom });
      }
      setBackfillProgress({ done: i + 1, total: lieuxSansCoords.length });
    }
    setBackfillResult({ updated, errors });
    setBackfillRunning(false);
  }, [backfillRunning, lieuxSansCoords, onEdit]);

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

  const filteredLieux = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return lieuxWithStats;

    return lieuxWithStats.filter((lieu) => {
      const nom = (lieu?.nom || "").toString().toLowerCase();
      const adresse = (lieu?.adresse_complete || "").toString().toLowerCase();
      return nom.includes(term) || adresse.includes(term);
    });
  }, [lieuxWithStats, searchTerm]);

  const sortedLieux = useMemo(() => {
    return [...filteredLieux].sort(
      (a, b) => (Number(b?.nombreMissions) || 0) - (Number(a?.nombreMissions) || 0)
    );
  }, [filteredLieux]);

  const globalStats = useMemo(() => {
    const totalMissions = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.nombreMissions) || 0), 0);
    const totalHeures = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalHeures) || 0), 0);
    const totalCA = lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalCA) || 0), 0);
    return { totalMissions, totalHeures, totalCA };
  }, [lieuxWithStats]);

  const isValidNumber = (v) => typeof v === "number" && !Number.isNaN(v);

  const homeLat = kmSettings?.km_domicile_lat ?? null;
  const homeLng = kmSettings?.km_domicile_lng ?? null;
  const homeLabel = kmSettings?.km_domicile_adresse ?? null;

  const handleRegeocoderLieu = useCallback(async (lieu) => {
    if (regeocodingId || !onRegeocoderLieu) return;
    const query = [lieu.adresse_complete, lieu.nom].filter(Boolean).join(", ");
    if (!query.trim()) return;
    setRegeocodingId(lieu.id);
    setRegeocodingErrors((prev) => { const { [lieu.id]: _, ...rest } = prev; return rest; }); // eslint-disable-line no-unused-vars
    const result = await geocodeAddress(query);
    if (result) {
      try {
        await onRegeocoderLieu(lieu.id, {
          latitude: result.lat,
          longitude: result.lng,
          adresse_complete: result.normalizedAddress || lieu.adresse_complete,
        });
      } catch (err) {
        console.error("Erreur re-géocodage lieu:", err);
        setRegeocodingErrors((prev) => ({ ...prev, [lieu.id]: "Erreur lors de la sauvegarde des coordonnées." }));
      }
    } else {
      setRegeocodingErrors((prev) => ({
        ...prev,
        [lieu.id]: "Impossible de trouver les coordonnées. Vérifie l'orthographe ou l'adresse.",
      }));
    }
    setRegeocodingId(null);
  }, [regeocodingId, onRegeocoderLieu]);

  return (
    <div className="space-y-6">
      {lieuxSansCoords.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          isDark ? "border-blue-500/30 bg-blue-500/5" : "border-blue-300 bg-blue-50"
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase text-blue-300 tracking-wider mb-1">
                📍 Coordonnées GPS manquantes
              </p>
              <p className="text-sm text-white/60">
                {lieuxSansCoords.length} lieu{lieuxSansCoords.length > 1 ? "x" : ""} sans coordonnées GPS
              </p>
            </div>
            <button
              onClick={handleBackfillCoords}
              disabled={backfillRunning}
              className="px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] font-black uppercase tracking-wider hover:bg-blue-600/30 disabled:opacity-50 transition-all"
            >
              {backfillRunning ? "En cours..." : "🗺️ Compléter les coordonnées GPS"}
            </button>
          </div>
          {backfillProgress && (
            <p className="mt-2 text-sm text-white/60">
              {backfillProgress.done} / {backfillProgress.total} lieux traités
            </p>
          )}
          {backfillResult && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-green-400 font-bold">
                Terminé : {backfillResult.updated} mis à jour
                {backfillResult.errors.length > 0 && `, ${backfillResult.errors.length} erreur${backfillResult.errors.length > 1 ? "s" : ""}`}
              </p>
              {backfillResult.errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-red-400 text-xs">{e.nom}</span>
                  <button
                    onClick={() => onLieuEdit(lieux.find((l) => l.id === e.id))}
                    className="text-[10px] font-black uppercase text-purple-300 hover:text-purple-100 transition-all"
                  >
                    Modifier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍 Rechercher un lieu..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              isDark
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
          + Nouveau {L.lieu}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30"
            : "bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-300"
        } backdrop-blur-md`}>
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">Total {L.lieux}</div>
          <div className="text-2xl font-black text-white mt-1">{Array.isArray(lieux) ? lieux.length : 0}</div>
        </div>

        <div className={`p-4 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30"
            : "bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300"
        } backdrop-blur-md`}>
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">Total Missions</div>
          <div className="text-2xl font-black text-white mt-1">{globalStats.totalMissions}</div>
        </div>

        <div className={`p-4 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30"
            : "bg-gradient-to-br from-cyan-100 to-blue-100 border border-cyan-300"
        } backdrop-blur-md`}>
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">Total Heures</div>
          <div className="text-2xl font-black text-white mt-1">{formatHeures(globalStats.totalHeures)}</div>
        </div>

        <div className={`p-4 rounded-2xl ${
          isDark
            ? "bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30"
            : "bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300"
        } backdrop-blur-md`}>
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider">CA Total</div>
          <div className="text-2xl font-black text-white mt-1">{formatEuro(globalStats.totalCA)}</div>
        </div>
      </div>

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
            const hasGps = isValidNumber(lieu?.latitude) && isValidNumber(lieu?.longitude);
            const suspect = isSuspectLieu(lieu, homeLat, homeLng, homeLabel);
            const needsRegeocode = suspect || !hasGps;
            const isRegeocoding = regeocodingId === lieu.id;
            const regeoError = regeocodingErrors[lieu.id];

            return (
              <div
                key={lieu.id}
                className={`p-5 rounded-[25px] backdrop-blur-md border-2 ${
                  suspect
                    ? isDark
                      ? "bg-amber-900/10 border-amber-500/40 hover:border-amber-400/60"
                      : "bg-amber-50 border-amber-300 hover:border-amber-400"
                    : isDark
                    ? "bg-white/5 border-white/10 hover:border-purple-500/40"
                    : "bg-white border-slate-200 hover:border-purple-300"
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-black text-white truncate">{lieu?.nom || "Lieu"}</h3>

                      {Number(lieu?.nombreMissions) === 0 && (
                        <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-[9px] font-black text-yellow-400 uppercase">Nouveau</span>
                      )}

                      {suspect && (
                        <span className="px-2 py-1 bg-amber-600/20 border border-amber-500/40 rounded-lg text-[9px] font-black text-amber-300 uppercase">⚠️ Coordonnées suspectes</span>
                      )}

                      {hasGps && !suspect && (
                        <span className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-300 uppercase">GPS OK ✓</span>
                      )}
                    </div>

                    <div className="space-y-1 mb-3">
                      {lieu?.adresse_complete && (
                        <div className="text-xs text-white/60 flex items-start gap-2">
                          <span className="shrink-0">📍</span>
                          <span className="line-clamp-2">{lieu.adresse_complete}</span>
                        </div>
                      )}

                      {hasGps && (
                        <div className="text-xs text-white/60 flex items-center gap-2">
                          <span>🌐</span>
                          <span>GPS: {lieu.latitude.toFixed(6)}, {lieu.longitude.toFixed(6)}</span>
                        </div>
                      )}

                      {lieu?.notes && (
                        <div className="text-xs text-white/60 flex items-start gap-2">
                          <span className="shrink-0">📝</span>
                          <span className="line-clamp-2">{lieu.notes}</span>
                        </div>
                      )}

                      {needsRegeocode && onRegeocoderLieu && (
                        <div className="mt-1">
                          <button
                            onClick={() => handleRegeocoderLieu(lieu)}
                            disabled={!!regeocodingId}
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
                              suspect
                                ? "bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30"
                                : "bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30"
                            }`}
                          >
                            {isRegeocoding ? "🔄 Recherche…" : "🗺️ Re-géocoder"}
                          </button>
                          {regeoError && (
                            <p className="mt-1 text-[10px] text-red-400">{regeoError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">Missions</div>
                        <div className="text-base font-black text-purple-400">{Number(lieu?.nombreMissions) || 0}</div>
                      </div>
                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">Heures</div>
                        <div className="text-base font-black text-cyan-400">{formatHeures(Number(lieu?.totalHeures) || 0)}</div>
                      </div>
                      <div className="bg-black/20 px-3 py-2 rounded-xl">
                        <div className="text-[9px] font-black uppercase opacity-40">CA</div>
                        <div className="text-base font-black text-green-400">{formatEuro(Number(lieu?.totalCA) || 0)}</div>
                      </div>
                    </div>

                    {lieu?.derniereMission && (
                      <div className="mt-2 text-[10px] text-white/40">
                        Dernière mission : {new Date(lieu.derniereMission).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>

                  {allowActions && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(lieu)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                        isDark
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
                        isDark
                          ? "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
                          : "bg-red-100 text-red-600 border border-red-300 hover:bg-red-200"
                      }`}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

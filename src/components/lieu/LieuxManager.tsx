import React, { useState, useMemo, useCallback } from "react";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { geocodeAddress } from "../../utils/geocode";
import { isSuspectLieu } from "../../utils/suspectCoords";
import { useLabels } from "../../contexts/LabelsContext";

interface Props {
  lieux?: any[];
  onEdit?: (lieu: any) => void;
  onDelete?: (lieu: any) => void;
  onAdd?: () => void;
  onLieuEdit?: (lieu: any) => void;
  darkMode?: boolean;
  missions?: any[];
  allowActions?: boolean;
  kmSettings?: any;
  onRegeocoderLieu?: ((id: any, data: any) => Promise<void>) | null;
}

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
}: Props) => {
  const L = useLabels();
  const [searchTerm, setSearchTerm] = useState("");
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null);
  const [backfillResult, setBackfillResult] = useState<{ updated: number; errors: { id: any; nom: string }[] } | null>(null);
  const [regeocodingId, setRegeocodingId] = useState<any>(null);
  const [regeocodingErrors, setRegeocodingErrors] = useState<Record<string, string>>({});

  const lieuxSansCoords = useMemo(() => lieux.filter((l) => !l.latitude || !l.longitude), [lieux]);

  const handleBackfillCoords = useCallback(async () => {
    if (backfillRunning || lieuxSansCoords.length === 0) return;
    setBackfillRunning(true);
    setBackfillProgress({ done: 0, total: lieuxSansCoords.length });
    setBackfillResult(null);
    let updated = 0;
    const errors: { id: any; nom: string }[] = [];
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
          ? [...lieuMissions].sort((a, b) => new Date(b?.date_iso).getTime() - new Date(a?.date_iso).getTime())[0]?.date_iso || null
          : null;

      return { ...lieu, nombreMissions: lieuMissions.length, totalHeures, totalCA, derniereMission };
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

  const sortedLieux = useMemo(() => [...filteredLieux].sort((a, b) => (Number(b?.nombreMissions) || 0) - (Number(a?.nombreMissions) || 0)), [filteredLieux]);

  const globalStats = useMemo(() => ({
    totalMissions: lieuxWithStats.reduce((sum, l) => sum + (Number(l?.nombreMissions) || 0), 0),
    totalHeures: lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalHeures) || 0), 0),
    totalCA: lieuxWithStats.reduce((sum, l) => sum + (Number(l?.totalCA) || 0), 0),
  }), [lieuxWithStats]);

  const isValidNumber = (v: any) => typeof v === "number" && !Number.isNaN(v);

  const homeLat = kmSettings?.km_domicile_lat ?? null;
  const homeLng = kmSettings?.km_domicile_lng ?? null;
  const homeLabel = kmSettings?.km_domicile_adresse ?? null;

  const handleRegeocoderLieu = useCallback(async (lieu: any) => {
    if (regeocodingId || !onRegeocoderLieu) return;
    const query = [lieu.adresse_complete, lieu.nom].filter(Boolean).join(", ");
    if (!query.trim()) return;
    setRegeocodingId(lieu.id);
    setRegeocodingErrors((prev) => { const next = { ...prev }; delete next[lieu.id]; return next; });
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
      setRegeocodingErrors((prev) => ({ ...prev, [lieu.id]: "Impossible de trouver les coordonnées. Vérifie l'orthographe ou l'adresse." }));
    }
    setRegeocodingId(null);
  }, [regeocodingId, onRegeocoderLieu]);

  return (
    <div className="space-y-6">
      {lieuxSansCoords.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase text-[var(--color-accent-cyan)] tracking-wider mb-1">📍 Coordonnées GPS manquantes</p>
              <p className="text-sm text-[var(--color-text-muted)]">{lieuxSansCoords.length} lieu{lieuxSansCoords.length > 1 ? "x" : ""} sans coordonnées GPS</p>
            </div>
            <button onClick={handleBackfillCoords} disabled={backfillRunning} className="px-4 py-2 rounded-xl bg-[var(--color-accent-cyan)]/20 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--color-accent-cyan)]/30 disabled:opacity-50 transition-[background] duration-150">
              {backfillRunning ? "En cours..." : "🗺️ Compléter les coordonnées GPS"}
            </button>
          </div>
          {backfillProgress && <p className="mt-2 text-sm text-[var(--color-text-muted)]">{backfillProgress.done} / {backfillProgress.total} lieux traités</p>}
          {backfillResult && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-green-400 font-bold">Terminé : {backfillResult.updated} mis à jour{backfillResult.errors.length > 0 && `, ${backfillResult.errors.length} erreur${backfillResult.errors.length > 1 ? "s" : ""}`}</p>
              {backfillResult.errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-red-400 text-xs">{e.nom}</span>
                  <button onClick={() => onLieuEdit(lieux.find((l) => l.id === e.id))} aria-label="Modifier ce lieu" className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[var(--color-accent-violet)] hover:opacity-80 transition-[opacity] duration-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
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
          <input type="text" placeholder="🔍 Rechercher un lieu..." className="w-full p-4 rounded-2xl font-bold outline-none border-2 transition-[border-color] duration-150 bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={onAdd} className="w-full sm:w-auto px-8 py-4 bg-[var(--color-accent-violet)] rounded-2xl font-black text-white text-[11px] uppercase tracking-wider shadow-card hover:opacity-90 transition-[opacity] duration-150 active:scale-95">+ Nouveau {L.lieu}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-accent-violet)]/15 border border-[var(--color-accent-violet)]/30 backdrop-blur-card">
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider text-[var(--color-text-muted)]">Total {L.lieux}</div>
          <div className="text-2xl font-black text-[var(--color-text)] mt-1">{Array.isArray(lieux) ? lieux.length : 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-accent-green)]/15 border border-[var(--color-accent-green)]/30 backdrop-blur-card">
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider text-[var(--color-text-muted)]">Total Missions</div>
          <div className="text-2xl font-black text-[var(--color-text)] mt-1">{globalStats.totalMissions}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 backdrop-blur-card">
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider text-[var(--color-text-muted)]">Total Heures</div>
          <div className="text-2xl font-black text-[var(--color-text)] mt-1">{formatHeures(globalStats.totalHeures)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-accent-amber)]/15 border border-[var(--color-accent-amber)]/30 backdrop-blur-card">
          <div className="text-[10px] font-black uppercase opacity-60 tracking-wider text-[var(--color-text-muted)]">CA Total</div>
          <div className="text-2xl font-black text-[var(--color-text)] mt-1">{formatEuro(globalStats.totalCA)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedLieux.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-20">📍</div>
            <p className="text-lg font-bold opacity-60">{searchTerm ? "Aucun lieu trouvé" : "Aucun lieu enregistré"}</p>
            {!searchTerm && <button onClick={onAdd} className="mt-4 px-6 py-3 bg-[var(--color-accent-violet)] hover:opacity-90 rounded-2xl font-black text-white text-[11px] uppercase transition-[opacity] duration-150">Créer le premier lieu</button>}
          </div>
        ) : (
          sortedLieux.map((lieu) => {
            const hasGps = isValidNumber(lieu?.latitude) && isValidNumber(lieu?.longitude);
            const suspect = isSuspectLieu(lieu, homeLat, homeLng, homeLabel);
            const needsRegeocode = suspect || !hasGps;
            const isRegeocoding = regeocodingId === lieu.id;
            const regeoError = regeocodingErrors[lieu.id];

            return (
              <div key={lieu.id} className={`p-5 rounded-[25px] backdrop-blur-card border-2 ${suspect ? "bg-[var(--color-accent-amber)]/10 border-[var(--color-accent-amber)]/40 hover:border-[var(--color-accent-amber)]/60" : "bg-[var(--color-surface-offset)] border-[var(--color-border)] hover:border-[var(--color-accent-violet)]/40"} transition-[border-color] duration-150`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-black text-[var(--color-text)] truncate">{lieu?.nom || "Lieu"}</h3>
                      {Number(lieu?.nombreMissions) === 0 && <span className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-[9px] font-black text-yellow-400 uppercase">Nouveau</span>}
                      {suspect && <span className="px-2 py-1 bg-amber-600/20 border border-amber-500/40 rounded-lg text-[9px] font-black text-amber-300 uppercase">⚠️ Coordonnées suspectes</span>}
                      {hasGps && !suspect && <span className="px-2 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-300 uppercase">GPS OK ✓</span>}
                    </div>
                    <div className="space-y-1 mb-3">
                      {lieu?.adresse_complete && <div className="text-xs text-[var(--color-text-muted)] flex items-start gap-2"><span className="shrink-0">📍</span><span className="line-clamp-2">{lieu.adresse_complete}</span></div>}
                      {hasGps && <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2"><span>🌐</span><span>GPS: {lieu.latitude.toFixed(6)}, {lieu.longitude.toFixed(6)}</span></div>}
                      {lieu?.notes && <div className="text-xs text-[var(--color-text-muted)] flex items-start gap-2"><span className="shrink-0">📝</span><span className="line-clamp-2">{lieu.notes}</span></div>}
                      {needsRegeocode && onRegeocoderLieu && (
                        <div className="mt-1">
                          <button onClick={() => handleRegeocoderLieu(lieu)} disabled={!!regeocodingId} className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-[background] duration-150 disabled:opacity-50 ${suspect ? "bg-[var(--color-accent-amber)]/20 border border-[var(--color-accent-amber)]/40 text-[var(--color-accent-amber)] hover:bg-[var(--color-accent-amber)]/30" : "bg-[var(--color-accent-cyan)]/20 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/30"}`}>{isRegeocoding ? "🔄 Recherche…" : "🗺️ Re-géocoder"}</button>
                          {regeoError && <p className="mt-1 text-[10px] text-red-400">{regeoError}</p>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[var(--color-surface)] px-3 py-2 rounded-xl"><div className="text-[9px] font-black uppercase opacity-40">Missions</div><div className="text-base font-black text-[var(--color-accent-violet)]">{Number(lieu?.nombreMissions) || 0}</div></div>
                      <div className="bg-[var(--color-surface)] px-3 py-2 rounded-xl"><div className="text-[9px] font-black uppercase opacity-40">Heures</div><div className="text-base font-black text-[var(--color-accent-cyan)]">{formatHeures(Number(lieu?.totalHeures) || 0)}</div></div>
                      <div className="bg-[var(--color-surface)] px-3 py-2 rounded-xl"><div className="text-[9px] font-black uppercase opacity-40">CA</div><div className="text-base font-black text-[var(--color-accent-green)]">{formatEuro(Number(lieu?.totalCA) || 0)}</div></div>
                    </div>
                    {lieu?.derniereMission && <div className="mt-2 text-[10px] text-[var(--color-text-muted)] opacity-60">Dernière mission : {new Date(lieu.derniereMission).toLocaleDateString("fr-FR")}</div>}
                  </div>
                  {allowActions && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(lieu)}
                        aria-label="Modifier ce lieu"
                        title="Modifier"
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-[background] duration-150 active:scale-90 bg-[var(--color-accent-violet)]/15 text-[var(--color-accent-violet)] border border-[var(--color-accent-violet)]/30 hover:bg-[var(--color-accent-violet)]/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(lieu)}
                        aria-label="Supprimer ce lieu"
                        title="Supprimer"
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors transition-transform active:scale-90 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
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
            );
          })
        )}
      </div>
    </div>
  );
};

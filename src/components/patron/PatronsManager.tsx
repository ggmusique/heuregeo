import React, { useState, useCallback, useMemo } from "react";
import { formatEuro, formatDateFR } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";

interface Props {
  patrons?: any[];
  onEdit?: (patron: any) => void;
  onDelete?: (patron: any) => void;
  onAdd?: () => void;
  darkMode?: boolean;
  missions?: any[];
  fraisDivers?: any[];
  acomptes?: any[];
  deleteAcompte?: ((id: any) => Promise<void>) | null;
  fetchAcomptes?: (() => Promise<void>) | null;
  showConfirm?: ((opts: any) => Promise<boolean>) | null;
  triggerAlert?: ((msg: string) => void) | null;
  isViewer?: boolean;
}

export function PatronsManager({
  patrons = [],
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  darkMode = true,
  missions = [],
  fraisDivers = [],
  acomptes = [],
  deleteAcompte = null,
  fetchAcomptes = null,
  showConfirm = null,
  triggerAlert = null,
  isViewer = false,
}: Props) {
  const L = useLabels();
  const [expandedPatronId, setExpandedPatronId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getPatronStats = useCallback((patronId: string) => {
    const patronMissions = missions.filter((m) => m?.patron_id === patronId);
    const patronFrais = fraisDivers.filter((f) => f?.patron_id === patronId);
    const patronAcomptes = acomptes.filter((a) => a?.patron_id === patronId);
    const nbMissions = patronMissions.length;
    const totalHeures = patronMissions.reduce((sum, m) => sum + (parseFloat(m?.duree) || 0), 0);
    const totalMontant = patronMissions.reduce((sum, m) => sum + (parseFloat(m?.montant) || 0), 0);
    const totalFrais = patronFrais.reduce((sum, f) => sum + (parseFloat(f?.montant) || 0), 0);
    const totalAcomptes = patronAcomptes.reduce((sum, a) => sum + (parseFloat(a?.montant) || 0), 0);
    const caBrut = totalMontant + totalFrais;
    const reste = Math.max(0, caBrut - totalAcomptes);
    return { nbMissions, totalHeures, totalMontant, totalFrais, totalAcomptes, caBrut, reste };
  }, [missions, fraisDivers, acomptes]);

  const toggleExpand = useCallback((patronId: string) => {
    setExpandedPatronId((prev) => (prev === patronId ? null : patronId));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{`Mes ${L.patrons}`}</h2>
          <p className="text-[10px] opacity-60 uppercase tracking-wider mt-1">{patrons.length} patron{patrons.length > 1 ? "s" : ""} actif{patrons.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={onAdd} className="px-6 py-3 bg-gradient-to-r from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)] text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-lg">+ Nouveau</button>
      </div>

      {patrons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">👔</p>
          <p className="text-lg opacity-60 mb-6">Aucun patron créé</p>
          <button onClick={onAdd} className="px-8 py-4 bg-gradient-to-r from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)] text-white rounded-3xl font-black uppercase text-[11px] active:scale-95 transition-all shadow-xl">Créer mon premier patron</button>
        </div>
      ) : (
        <div className="space-y-3">
          {patrons.map((patron) => {
            const stats = getPatronStats(patron.id);
            const isExpanded = expandedPatronId === patron.id;

            return (
              <div key={patron.id} className="rounded-[25px] overflow-hidden transition-all bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
                <button onClick={() => toggleExpand(patron.id)} className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-all">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: patron.couleur || "#8b5cf6" }} />
                  <div className="flex-1 text-left">
                    <p className="font-black text-lg uppercase tracking-tight">{patron.nom}</p>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {patron.taux_horaire != null && <span className="text-[10px] opacity-60">{patron.taux_horaire}€/h</span>}
                      <span className="text-[10px] opacity-60">{stats.nbMissions} mission{stats.nbMissions > 1 ? "s" : ""}</span>
                      <span className="text-[10px] font-bold text-[var(--color-accent-green)] amount-safe">{formatEuro(stats.caBrut)}</span>
                    </div>
                  </div>
                  <div className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200 bg-[var(--color-surface)]">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: "Total heures", value: `${stats.totalHeures.toFixed(2)}h`, cls: "text-[var(--color-accent-violet)]" },
                        { label: "Montant missions", value: formatEuro(stats.totalMontant), cls: "text-[var(--color-accent-fuchsia)]" },
                        { label: "Frais", value: formatEuro(stats.totalFrais), cls: "text-[var(--color-accent-amber)]" },
                        { label: "Acomptes", value: formatEuro(stats.totalAcomptes), cls: "text-[var(--color-accent-cyan)]" },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="p-3 rounded-2xl bg-[var(--color-surface-2)]">
                          <p className="text-[9px] font-black uppercase opacity-50">{label}</p>
                          <p className={`text-lg font-black amount-safe ${cls}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4 p-4 bg-gradient-to-r from-[var(--color-accent-green)]/20 to-[var(--color-accent-green)]/20 rounded-2xl border border-[var(--color-accent-green)]/30">
                      <p className="text-[9px] font-black uppercase opacity-60 mb-1">Reste à percevoir</p>
                      <p className="text-2xl font-black text-[var(--color-accent-green)] amount-safe">{formatEuro(stats.reste)}</p>
                    </div>

                    {acomptes.filter((a) => a?.patron_id === patron.id).length > 0 && (
                      <div className="mb-4">
                        <p className="text-[9px] font-black uppercase opacity-50 mb-2">💰 Acomptes</p>
                        <div className="space-y-2">
                          {acomptes.filter((a) => a?.patron_id === patron.id)
                            .sort((a, b) => new Date(b.date_acompte).getTime() - new Date(a.date_acompte).getTime())
                            .map((acompte) => (
                              <div key={acompte.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                                <div>
                                  <span className="text-sm font-bold text-[var(--color-accent-cyan)] amount-safe">{formatEuro(acompte.montant)}</span>
                                  <span className="text-[10px] opacity-60 ml-2">{formatDateFR(acompte.date_acompte)}</span>
                                </div>
                                {!isViewer && deleteAcompte && showConfirm && (
                                  <button
                                    onClick={async () => {
                                      const confirmed = await showConfirm({ title: "Supprimer cet acompte", message: `Montant: ${formatEuro(acompte.montant)} - Date: ${formatDateFR(acompte.date_acompte)}\n\nCela annulera les paiements automatiques des semaines payées par cet acompte.\n\nContinuer ?`, confirmText: "Supprimer", cancelText: "Annuler", type: "danger" });
                                      if (!confirmed) return;
                                      setDeletingId(acompte.id);
                                      try {
                                        await deleteAcompte(acompte.id);
                                        triggerAlert?.("✅ Acompte supprimé !");
                                        await fetchAcomptes?.();
                                      } catch (err) {
                                        triggerAlert?.("❌ Erreur lors de la suppression de l'acompte");
                                      } finally { setDeletingId(null); }
                                    }}
                                    disabled={deletingId === acompte.id}
                                    className="w-8 h-8 bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)] rounded-lg flex items-center justify-center border border-[var(--color-accent-red)]/30 active:scale-90 transition-all disabled:opacity-50"
                                  >
                                    {deletingId === acompte.id ? "⏳" : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        <line x1="10" y1="11" x2="10" y2="17"/>
                                        <line x1="14" y1="11" x2="14" y2="17"/>
                                      </svg>
                                    )}
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
                        aria-label="Modifier ce patron"
                        title="Modifier"
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 hover:bg-[var(--color-accent-cyan)]/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(patron)}
                        aria-label="Supprimer ce patron"
                        title="Supprimer"
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30 hover:bg-[var(--color-accent-red)]/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
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

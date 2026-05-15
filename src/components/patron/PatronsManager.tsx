import React, { useState, useCallback, useMemo } from "react";
import { formatEuro, formatDateFR } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";
import { usePatronAccess } from "../../hooks/usePatronAccess";
import type { UserProfile, PatronAccessProfile, PatronInvitation } from "../../types/profile";

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
  /** Profil de l'ouvrier (pour les invitations). */
  ownerProfile?: UserProfile | null;
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
  ownerProfile = null,
}: Props) {
  const L = useLabels();
  const [expandedPatronId, setExpandedPatronId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);

  // ── Accès patron (invitations) ────────────────────────────────────────────
  const patronAccessHook = usePatronAccess(
    ownerProfile?.id ?? null,
    triggerAlert ?? undefined
  );
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

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
                      {/* ── Bouton Inviter ── */}
                      {!isViewer && ownerProfile && patron.email && (
                        <button
                          onClick={async () => {
                            const hasPending = Boolean(patronAccessHook.getInvitationForPatron(patron.id));
                            const hasAccess = Boolean(patronAccessHook.getAccessForPatron(patron.id));
                            const isReinvite = hasPending || hasAccess;
                            const confirmMsg = isReinvite
                              ? `Renvoyer l'invitation a ${patron.email} ?`
                              : `Inviter ${patron.nom} (${patron.email}) a consulter ses heures sur HeurGeo ?`;
                            const confirmed = await showConfirm?.({
                              title: "Invitation patron",
                              message: confirmMsg,
                              confirmText: "Envoyer",
                              cancelText: "Annuler",
                            });
                            if (!confirmed) return;
                            try {
                              const inviteUrl = await patronAccessHook.invitePatron(patron, ownerProfile);
                              // Copier l'URL dans le presse-papier et afficher un message
                              try {
                                await navigator.clipboard.writeText(inviteUrl);
                                triggerAlert?.(`Lien copie ! Envoyez-le a ${patron.email} :\n${inviteUrl}`);
                              } catch {
                                triggerAlert?.(`Lien cree. Copiez-le et envoyez-le a ${patron.email} :\n${inviteUrl}`);
                              }
                            } catch (err) {
                              triggerAlert?.("Erreur : " + (err as Error).message);
                            }
                          }}
                          disabled={patronAccessHook.inviting === patron.id}
                          aria-label="Inviter ce patron"
                          title="Inviter ce patron à consulter ses heures"
                          className="px-3 h-10 rounded-xl flex items-center gap-1.5 transition-all active:scale-90 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                        >
                          {patronAccessHook.inviting === patron.id ? (
                            <div className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                          )}
                          {(() => {
                            if (patronAccessHook.getInvitationForPatron(patron.id)) return "Re-inviter";
                            if (patronAccessHook.getAccessForPatron(patron.id)) return "Re-inviter";
                            return "Inviter";
                          })()}
                        </button>
                      )}

                      {/* ── Bouton Annuler l'invitation (pending ou accepted) ── */}
                      {!isViewer && ownerProfile && (() => {
                        const invitation = patronAccessHook.getInvitationForPatron(patron.id);
                        if (!invitation) return null;
                        const isCancelling = cancellingInvite === patron.id;
                        return (
                          <button
                            onClick={async () => {
                              const confirmed = await showConfirm?.({
                                title: "Annuler l'invitation",
                                message: `Annuler l'invitation de ${patron.nom} ? Cette action est irréversible.`,
                                confirmText: "Annuler l'invitation",
                                cancelText: "Garder",
                                type: "danger",
                              });
                              if (!confirmed) return;
                              setCancellingInvite(patron.id);
                              try {
                                await patronAccessHook.cancelInvitation(invitation.id, patron.id);
                                triggerAlert?.("Invitation annulée.");
                              } catch (err) {
                                triggerAlert?.("Erreur : " + (err as Error).message);
                              } finally {
                                setCancellingInvite(null);
                              }
                            }}
                            disabled={isCancelling || patronAccessHook.cancellingInvite === patron.id}
                            aria-label="Annuler l'invitation"
                            title="Annuler l'invitation en attente"
                            className="px-3 h-10 rounded-xl flex items-center gap-1.5 transition-all active:scale-90 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                          >
                            {isCancelling || patronAccessHook.cancellingInvite === patron.id ? (
                              <div className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                            Annuler
                          </button>
                        );
                      })()}

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

                    {/* ── Panel acces patron ── */}
                    {!isViewer && ownerProfile && (() => {
                      const access = patronAccessHook.getAccessForPatron(patron.id);
                      const invitation = patronAccessHook.getInvitationForPatron(patron.id);
                      if (!access && !invitation) return null;
                      return (
                        <PatronAccessPanel
                          access={access}
                          invitation={invitation}
                          togglingFeature={togglingFeature}
                          onRevoke={async () => {
                            if (!access) return;
                            const confirmed = await showConfirm?.({
                              title: "Revoquer l'acces",
                              message: `Revoquer l'acces de ${patron.nom} ?`,
                              confirmText: "Revoquer",
                              cancelText: "Annuler",
                              type: "danger",
                            });
                            if (!confirmed) return;
                            try {
                              await patronAccessHook.revokeAccess(access.id);
                              triggerAlert?.("Acces revoque");
                            } catch (err) {
                              triggerAlert?.("Erreur : " + (err as Error).message);
                            }
                          }}
                          onReinstate={async () => {
                            if (!access) return;
                            try {
                              await patronAccessHook.reinstateAccess(access.id);
                              triggerAlert?.("Acces retabli");
                            } catch (err) {
                              triggerAlert?.("Erreur : " + (err as Error).message);
                            }
                          }}
                          onToggleFeature={async (feature, value) => {
                            if (!access) return;
                            setTogglingFeature(feature);
                            try {
                              await patronAccessHook.toggleFeature(access.id, feature, value);
                            } catch (err) {
                              triggerAlert?.("Erreur : " + (err as Error).message);
                            } finally {
                              setTogglingFeature(null);
                            }
                          }}
                        />
                      );
                    })()}

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

// ─── Sous-composant : panneau de gestion d'acces ─────────────────────────────

interface PatronAccessPanelProps {
  access: PatronAccessProfile | undefined;
  invitation: PatronInvitation | undefined;
  togglingFeature: string | null;
  onRevoke: () => Promise<void>;
  onReinstate: () => Promise<void>;
  onToggleFeature: (
    feature: "access_agenda" | "access_dashboard",
    value: boolean
  ) => Promise<void>;
}

function PatronAccessPanel({
  access,
  invitation,
  togglingFeature,
  onRevoke,
  onReinstate,
  onToggleFeature,
}: PatronAccessPanelProps) {
  // Determiner le statut affiche
  const displayStatus: string = access?.status ?? (invitation ? "pending" : "");
  if (!displayStatus) return null;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    revoked: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    active: "Actif",
    revoked: "Revoque",
  };

  const cls = statusColors[displayStatus] ?? statusColors.pending;
  const label = statusLabels[displayStatus] ?? displayStatus;

  return (
    <div className="w-full mt-3 pt-3 border-t border-[var(--color-border)] space-y-3">
      {/* Statut */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
          Acces patron
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}>
          {label}
        </span>
      </div>

      {/* Toggles features (seulement si actif) */}
      {access?.status === "active" && (
        <div className="grid grid-cols-2 gap-2">
          {(["access_agenda", "access_dashboard"] as const).map((feat) => {
            const featureLabels = { access_agenda: "Agenda", access_dashboard: "Dashboard" };
            const isOn = access.features?.[feat] ?? false;
            const isLoading = togglingFeature === feat;
            return (
              <button
                key={feat}
                type="button"
                disabled={isLoading}
                onClick={() => onToggleFeature(feat, !isOn)}
                className={
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 " +
                  (isOn
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                    : "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border-[var(--color-border)]")
                }
              >
                {featureLabels[feat]}
                {isLoading ? (
                  <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                ) : (
                  <div className={`w-7 h-4 rounded-full transition-all relative ${isOn ? "bg-indigo-500" : "bg-slate-600"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${isOn ? "left-3.5" : "left-0.5"}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Actions revoquer / retablir (seulement si profil actif/revoque) */}
      {access && (
        <div>
          {access.status === "active" ? (
            <button
              type="button"
              onClick={onRevoke}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
            >
              Revoquer l&apos;acces
            </button>
          ) : access.status === "revoked" ? (
            <button
              type="button"
              onClick={onReinstate}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
            >
              Retablir l&apos;acces
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

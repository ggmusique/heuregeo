
import React, { Component, Dispatch, SetStateAction, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { CompteTab } from "./CompteTab";
import { DonneesTab } from "./DonneesTab";
import { InviteSection } from "../components/invitations/InviteSection";
import { ThemeSelector } from "../components/ui/ThemeSelector";
import { Button } from "../components/ui/Button";
import { EUROPE_COUNTRIES, KM_RATES, detectCountryFromLatLng } from "../utils/kmRatesByCountry";
import { geocodeAddress } from "../utils/geocode";
import { haversineKm } from "../utils/calculators";
import { getKmEnabled, setKmEnabled } from "../utils/kmSettings";
import { supabase } from "../services/supabase";
import { useLabels } from "../contexts/LabelsContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { buildContractFeaturesUpdate, resolveContractActive } from "../features/contracts/contractSettingsPersistence";
import type { Mission, Patron, Client, Lieu } from "../types/entities";
import type { KmSettings, KmFraisResult } from "../hooks/useKmDomicile";
import type { UserProfile } from "../types/profile";

const AdminPage = lazy(() =>
  import("./AdminPage").then((m) => ({ default: m.AdminPage }))
);
const DiagnosticsPage = lazy(() =>
  import("./DiagnosticsPage").then((m) => ({ default: m.DiagnosticsPage }))
);

// ─── Icônes SVG ─────────────────────────────────────────────

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const IconDatabase = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z" />
    <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 2l9 4v6c0 5-3.5 9.7-9 11-5.5-1.3-9-6-9-11V6l9-4z" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);

const IconPalette = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);

// ─── Couleurs par section ────────────────────────────────────────

import { colorTokens } from "../utils/colorTokens";
import type { ColorTokens } from "../utils/colorTokens";



// ─── Error boundary Diagnostics ─────────────────────────────────

interface DiagBoundaryState { hasError: boolean; error: Error | null; }

class DiagnosticsErrorBoundary extends Component<React.PropsWithChildren, DiagBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DiagBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 space-y-3">
          <p className="text-sm font-black text-red-400 uppercase tracking-widest">Erreur diagnostics</p>
          <p className="text-xs text-white/60">{this.state.error?.message || "Erreur inconnue"}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-2 rounded-lg border border-white/20 text-xs font-black uppercase tracking-widest text-white/70 hover:text-white"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Composant principal ───────────────────────────────────────

interface ParametresTabProps {
  profile: any;
  profileSaving?: boolean;
  saveProfile: (data: any) => Promise<any>;
  userEmail?: string;
  patrons: Patron[];
  clients: Client[];
  lieux: Lieu[];
  missions: Mission[];
  fraisDivers?: any[];
  acomptes?: any[];
  onPatronEdit?: (patron: Patron) => void | Promise<void>;
  onPatronDelete?: (patron: Patron) => void | Promise<void>;
  onPatronAdd?: () => void;
  onClientEdit?: (client: Client) => void | Promise<void>;
  onClientDelete?: (client: Client) => void | Promise<void>;
  onClientAdd?: () => void;
  onLieuEdit?: (lieu: Lieu) => void | Promise<void>;
  onLieuDelete?: (lieu: Lieu) => void | Promise<void>;
  onLieuAdd?: () => void;
  showMissionRateEditor?: boolean;
  onToggleMissionRateEditor?: Dispatch<SetStateAction<boolean>>;
  kmSettings?: KmSettings | null;
  onRegeocoderLieu?: ((id: string, coords: Partial<Lieu>) => Promise<void>) | null;
  domicileLatLng?: { lat: number; lng: number } | null;
  missionsThisWeek?: Mission[];
  kmFraisThisWeek?: KmFraisResult | null;
  onRegeocoderBatch?: ((lieuxManquants: Lieu[]) => Promise<any>) | null;
  onRecalculerKmSemaine?: (() => Promise<{ message: string }>) | null;
  onRebuildBilans?: ((patronId: string | null, startWeek: number, endWeek: number) => Promise<any>) | null;
  onRepairBilans?: ((patronId: string | null) => Promise<any>) | null;
  deleteAcompte?: ((id: string) => Promise<void>) | null;
  fetchAcomptes?: (() => Promise<any>) | null;
  showConfirm?: ((options?: any) => Promise<boolean>) | null;
  triggerAlert?: ((message: string) => void) | null;
  ownerProfile?: UserProfile | null;
  onMissionDelete?: (id: string) => Promise<void>;
}

export function ParametresTab({
  profile,
  profileSaving,
  saveProfile,
  userEmail,
  patrons,
  clients,
  lieux,
  missions,
  fraisDivers,
  acomptes,
  onPatronEdit,
  onPatronDelete,
  onPatronAdd,
  onClientEdit,
  onClientDelete,
  onClientAdd,
  onLieuEdit,
  onLieuDelete,
  onLieuAdd,
  showMissionRateEditor = true,
  onToggleMissionRateEditor,
  kmSettings = null,
  onRegeocoderLieu = null,
  domicileLatLng = null,
  missionsThisWeek = [],
  kmFraisThisWeek = null,
  onRegeocoderBatch = null,
  onRecalculerKmSemaine = null,
  onRebuildBilans = null,
  onRepairBilans = null,
  deleteAcompte = null,
  fetchAcomptes = null,
  showConfirm = null,
  triggerAlert = null,
  ownerProfile = null,
  onMissionDelete,
}: ParametresTabProps) {
  const { isAdmin, isPro, isViewer } = usePermissions();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const sections = useMemo(
    () => [
      {
        key: "profil",
        icon: <IconUser />,
        color: "indigo",
        title: "Profil",
        subtitle: "Identité, coordonnées et compte",
      },
      {
        key: "donnees",
        icon: <IconDatabase />,
        color: "violet",
        title: "Données",
        subtitle: `${patrons.length} patrons · ${clients.length} clients · ${lieux.length} lieux`,
      },
      {
        key: "extra-pro",
        icon: <IconSparkles />,
        color: "yellow",
        title: "Options Pro",
        subtitle: "Fonctionnalités avancées",
      },
      {
        key: "libelles",
        icon: <IconEdit />,
        color: "teal",
        title: "Libellés",
        subtitle: "Personnaliser le vocabulaire",
      },
      {
        key: "apparence",
        icon: <IconPalette />,
        color: "violet",
        title: "Apparence",
        subtitle: "Thème, couleurs et style visuel",
      },
      {
        key: "invitations",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polyline points="2,4 12,13 22,4" />
          </svg>
        ),
        color: "green",
        title: "Invitations",
        subtitle: "Gérer les accès patrons in-app",
      },
      ...(isAdmin
        ? [
            {
              key: "admin",
              icon: <IconShield />,
              color: "red",
              title: "Admin",
              subtitle: "Configuration et supervision",
            },
            {
              key: "diagnostics",
              icon: <IconSearch />,
              color: "cyan",
              title: "Diagnostics avancés",
              subtitle: "GPS, bilans, acomptes, rebuild",
            },
          ]
        : []),
    ],
    [isAdmin, patrons.length, clients.length, lieux.length]
  );

  const activeSection = sections.find((item) => item.key === activePanel) || null;

  useEffect(() => {
    if (activePanel && !sections.some((item) => item.key === activePanel)) {
      setActivePanel(null);
    }
  }, [sections, activePanel]);

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">

        {/* ── Sidebar ── */}
        <aside className="rounded-2xl border backdrop-blur-modal p-3 space-y-1.5 lg:sticky lg:top-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* ── Titre du compte ── */}
          {profile && (
            <div className="px-3 pt-2 pb-3 mb-1 border-b border-[var(--color-border)]">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-1.5">Compte</p>
              <p className="text-xl font-black text-[var(--color-text)] leading-tight">
                {[profile.prenom, profile.nom].filter(Boolean).join(" ") || "—"}
              </p>
              {userEmail && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{userEmail}</p>
              )}
            </div>
          )}
          <p className="text-[9px] font-black uppercase tracking-[0.25em] px-2 pb-1 text-[var(--color-text-muted)]">
            Navigation
          </p>
          {sections.map((item) => {
            const isActive = activePanel === item.key;
            const colors = colorTokens[item.color];
            return (
              <button
                key={item.key}
                onClick={() => setActivePanel(isActive ? null : item.key)}
                aria-label={`Section ${item.title}`}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-colors duration-200 ${
                  isActive
                    ? colors.active + " shadow-sm"
                    : "bg-transparent border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] hover:border-[var(--color-border)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors duration-200 ${isActive ? colors.icon : "text-[var(--color-text-muted)] bg-[var(--color-surface-offset)]"}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-black uppercase tracking-widest truncate transition-colors duration-200 ${isActive ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                      {item.title}
                    </p>
                    <p className="text-[10px] leading-snug truncate mt-0.5 text-[var(--color-text-muted)]">
                      {item.subtitle}
                    </p>
                  </div>
                  {isActive && (
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                  )}
                </div>
              </button>
            );
          })}
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full text-left rounded-xl border px-3 py-3 transition-colors duration-200 bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg flex-shrink-0 text-current bg-current/10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide">Se déconnecter</p>
                  {userEmail && <p className="text-[9px] mt-0.5 opacity-60 truncate max-w-[140px]">{userEmail}</p>}
                </div>
              </div>
            </button>
          </div>
        </aside>

        {/* ── Panneau de contenu ── */}
        <div className="rounded-2xl border backdrop-blur-modal overflow-hidden min-h-[300px] border-[var(--color-border)] bg-[var(--color-surface)]">
          {!activeSection ? (
            // État bienvenue
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text-faint)]">
                <IconSettings />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Paramètres
                </p>
                <p className="text-xs mt-1.5 text-[var(--color-text-muted)]">
                  Sélectionnez une section dans le menu
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {sections.map((item) => {
                  const colors = colorTokens[item.color];
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActivePanel(item.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors hover:opacity-90 ${colors.badge}`}
                    >
                      {item.icon}
                      {item.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Header de section */}
              {(() => {
                const colors = colorTokens[activeSection.color];
                return (
                  <div className={`px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r ${colors.header}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${colors.icon}`}>
                          {activeSection.icon}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${colors.headerText}`}>
                            {activeSection.title}
                          </p>
                          <p className="text-[10px] truncate mt-0.5 text-[var(--color-text-muted)]">
                            {activeSection.subtitle}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActivePanel(null)}
                        className="p-1.5 rounded-lg border transition-colors flex-shrink-0 border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]"
                        aria-label="Fermer"
                      >
                        <IconClose />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Contenu de la section */}
              <div className="p-4 sm:p-5">
                {activePanel === "profil" && (
                  <CompteTab
                    profile={profile}
                    saving={profileSaving}
                    onSave={saveProfile}
                    userEmail={userEmail}
                  />
                )}

                {activePanel === "extra-pro" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border p-4 border-[var(--color-accent-amber)]/25 bg-[var(--color-accent-amber)]/5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[var(--color-accent-amber)]/80">
                        Sélecteur taux du jour
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Afficher le sélecteur &quot;taux du jour&quot; dans Saisie
                        </p>
                        <button
                          type="button"
                          disabled={!isPro}
                          onClick={() => onToggleMissionRateEditor?.((prev: boolean) => !prev)}
                          className={
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " +
                            (showMissionRateEditor
                              ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
                            (!isPro ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {showMissionRateEditor ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                    </div>
                    <KmSettingsPanel
                      profile={profile}
                      saveProfile={saveProfile}
                      isPro={isPro}
                      lieux={lieux}
                      onForceRecalc={onRecalculerKmSemaine}
                      onRegeocoderBatch={onRegeocoderBatch}
                      triggerAlert={triggerAlert}
                    />
                    <ContractSettingsPanel
                      profile={profile}
                      saveProfile={saveProfile}
                      profileSaving={profileSaving}
                    />
                    <div className="rounded-2xl border p-4 border-emerald-500/25 bg-emerald-500/5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-emerald-200/80">
                        Agenda
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Calendrier, RDV et rappels
                        </p>
                        <button
                          type="button"
                          disabled={!isPro || profileSaving}
                          onClick={async () => {
                            const current = profile?.features?.agenda === true;
                            await saveProfile({ features: { ...(profile?.features || {}), agenda: !current } });
                          }}
                          className={
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " +
                            (profile?.features?.agenda
                              ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
                            (!isPro || profileSaving ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {profile?.features?.agenda ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                      {profile?.features?.agenda && (
                        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center gap-3">
                          <p className="text-sm text-[var(--color-text-muted)] flex-1">
                            Jours de congé annuels
                          </p>
                          <input
                            key={String(profile?.conges_annuels ?? "")}
                            type="number"
                            min={0}
                            max={365}
                            placeholder="Ex : 20"
                            defaultValue={profile?.conges_annuels ?? ""}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              await saveProfile({ conges_annuels: val === "" ? null : Number(val) });
                            }}
                            className="w-24 px-2 py-1.5 rounded-lg text-sm text-right border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 placeholder-[var(--color-text-dim)] focus:outline-none focus:border-emerald-400/60 disabled:opacity-40"
                            disabled={profileSaving}
                          />
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border p-4 border-[var(--color-accent-violet)]/25 bg-[var(--color-accent-violet)]/5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[var(--color-accent-violet)]/80">
                        Dashboard
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Tableau de bord avancé (KPIs, graphiques, top clients)
                        </p>
                        <button
                          type="button"
                          disabled={!isPro || profileSaving}
                          onClick={async () => {
                            const current = profile?.features?.dashboard === true;
                            await saveProfile({ features: { ...(profile?.features || {}), dashboard: !current } });
                          }}
                          className={
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " +
                            (profile?.features?.dashboard
                              ? "border-[var(--color-accent-violet)]/40 text-[var(--color-accent-violet)] bg-[var(--color-accent-violet)]/10"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
                            (!isPro || profileSaving ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {profile?.features?.dashboard ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4 border-amber-500/25 bg-amber-500/5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-amber-200/80">
                        Facturation
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Générer des factures PDF professionnelles
                        </p>
                        <button
                          type="button"
                          disabled={!isPro || profileSaving}
                          onClick={async () => {
                            const current = profile?.features?.facture === true;
                            await saveProfile({ features: { ...(profile?.features || {}), facture: !current } });
                          }}
                          className={
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " +
                            (profile?.features?.facture
                              ? "border-amber-400/40 text-amber-300 bg-amber-500/10"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
                            (!isPro || profileSaving ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {profile?.features?.facture ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activePanel === "donnees" && (
                  <DonneesTab
                    patrons={patrons}
                    clients={clients}
                    lieux={lieux}
                    missions={missions}
                    fraisDivers={fraisDivers}
                    acomptes={acomptes}
                    darkMode={false}
                    onPatronEdit={onPatronEdit}
                    onPatronDelete={onPatronDelete}
                    onPatronAdd={onPatronAdd}
                    onClientEdit={onClientEdit}
                    onClientDelete={onClientDelete}
                    onClientAdd={onClientAdd}
                    onLieuEdit={onLieuEdit}
                    onLieuDelete={onLieuDelete}
                    onLieuAdd={onLieuAdd}
                    defaultOpenPatrons={false}
                    allowClientActions={true}
                    allowLieuActions={true}
                    kmSettings={kmSettings}
                    onRegeocoderLieu={onRegeocoderLieu}
                    deleteAcompte={deleteAcompte}
                    fetchAcomptes={fetchAcomptes}
                    showConfirm={showConfirm}
                    triggerAlert={triggerAlert}
                    isViewer={isViewer}
                    ownerProfile={ownerProfile}
                  />
                )}

                {activePanel === "apparence" && (
                  <div className="space-y-6">
                    {/* Sélecteur de thème */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-[var(--color-accent-violet)]">
                        Thème de l&apos;interface
                      </p>
                      <ThemeSelector layout="grid" />
                      <p className="text-[10px] text-[var(--color-text-dim)] mt-3">
                        Le thème est sauvegardé automatiquement sur cet appareil.
                      </p>
                    </div>

                    {/* Aperçu tokens */}
                    <div className="rounded-2xl border border-[var(--color-border)] p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-[var(--color-text-muted)]">
                        Aperçu du thème actif
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Fond",       bg: "var(--color-bg)" },
                          { label: "Surface",    bg: "var(--color-surface)" },
                          { label: "Primaire",   bg: "var(--color-primary)" },
                          { label: "Accent",     bg: "var(--color-accent-violet)" },
                          { label: "Cyan",       bg: "var(--color-accent-cyan)" },
                          { label: "Vert",       bg: "var(--color-accent-green)" },
                          { label: "Ambre",      bg: "var(--color-accent-amber)" },
                          { label: "Rouge",      bg: "var(--color-error)" },
                        ].map(({ label, bg }) => (
                          <div key={label} className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-full h-8 rounded-[var(--radius-md)] border border-[var(--color-border)]"
                              style={{ background: `var(${bg.slice(4, -1)})` }}
                            />
                            <span className="text-[9px] font-bold text-[var(--color-text-dim)] truncate w-full text-center">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePanel === "libelles" && (                  <LabelsPanel
                    profile={profile}
                    saveProfile={saveProfile}
                    profileSaving={profileSaving}
                  />
                )}

                {activePanel === "invitations" && (
                  <InviteSection />
                )}

                {activePanel === "admin" && isAdmin && (
                  <Suspense
                    fallback={
                      <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                        Chargement…
                      </div>
                    }
                  >
                    <AdminPage darkMode={false} isAdmin={isAdmin} />
                  </Suspense>
                )}

                {activePanel === "diagnostics" && isAdmin && (
                  <DiagnosticsErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                          Chargement diagnostics…
                        </div>
                      }
                    >
                      <DiagnosticsPage
                        profile={profile}
                        kmSettings={kmSettings}
                        domicileLatLng={domicileLatLng}
                        lieux={lieux}
                        missionsThisWeek={missionsThisWeek}
                        kmFraisThisWeek={kmFraisThisWeek ?? undefined}
                        onRegeocoderBatch={onRegeocoderBatch}
                        onRecalculerKmSemaine={onRecalculerKmSemaine}
                        onRebuildBilans={onRebuildBilans}
                        onRepairBilans={onRepairBilans}
                        patrons={patrons}
                        onMissionDelete={onMissionDelete}
                      />
                    </Suspense>
                  </DiagnosticsErrorBoundary>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── LabelsPanel ──────────────────────────────────────────────

interface LabelsPanelProps {
  profile: any;
  saveProfile: (data: any) => Promise<any>;
  profileSaving?: boolean;
}

function LabelsPanel({ profile, saveProfile, profileSaving }: LabelsPanelProps) {
  const DEFS: Record<string, string> = { patron: "Patron", patrons: "Patrons", client: "Client", clients: "Clients", lieu: "Lieu", lieux: "Lieux", mission: "Mission", missions: "Missions" };
  const saved = profile?.features?.labels ?? {};
  const [vals, setVals] = useState<Record<string, string>>({
    patron:   saved.patron   ?? "",
    patrons:  saved.patrons  ?? "",
    client:   saved.client   ?? "",
    clients:  saved.clients  ?? "",
    lieu:     saved.lieu     ?? "",
    lieux:    saved.lieux    ?? "",
    mission:  saved.mission  ?? "",
    missions: saved.missions ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = profile?.features?.labels ?? {};
    setVals({
      patron:   s.patron   ?? "",
      patrons:  s.patrons  ?? "",
      client:   s.client   ?? "",
      clients:  s.clients  ?? "",
      lieu:     s.lieu     ?? "",
      lieux:    s.lieux    ?? "",
      mission:  s.mission  ?? "",
      missions: s.missions ?? "",
    });
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const cleaned: Record<string, string> = {};
    Object.entries(vals).forEach(([k, v]) => { if (v.trim()) cleaned[k] = v.trim(); });
    await saveProfile({ features: { ...(profile?.features ?? {}), labels: Object.keys(cleaned).length ? cleaned : null } });
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    const { labels: _removed, ...rest } = profile?.features ?? {};
    await saveProfile({ features: rest });
    setSaving(false);
  };

  const rows = [
    { key: "patron",  keyP: "patrons",  label: "Employeur / Patron" },
    { key: "client",  keyP: "clients",  label: "Client / Bénéficiaire" },
    { key: "lieu",    keyP: "lieux",    label: "Lieu / Adresse" },
    { key: "mission", keyP: "missions", label: "Mission / Prestation" },
  ];

  const inp = (key: string) => (
    <input
      type="text"
      value={vals[key]}
      onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
      placeholder={DEFS[key]}
      className="w-full p-2.5 rounded-xl font-bold outline-none border-2 transition-colors text-sm backdrop-blur-card bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] focus:border-teal-500 placeholder:text-[var(--color-text-faint)]"
    />
  );

  return (
    <div className="space-y-4 p-1">
      <p className="text-xs text-[var(--color-text-muted)]">
        Personnalisez le vocabulaire affiché dans l&apos;application. Laissez vide pour garder la valeur par défaut.
      </p>
      <div className="space-y-3">
        {rows.map(({ key, keyP, label }) => (
          <div key={key} className="rounded-xl border p-3 space-y-2 border-[var(--color-border)] bg-[var(--color-surface-offset)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300/70">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-1 text-[var(--color-text-muted)]">Singulier</p>
                {inp(key)}
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-1 text-[var(--color-text-muted)]">Pluriel</p>
                {inp(keyP)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || profileSaving}
          className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={handleReset}
          disabled={saving || profileSaving}
          className="px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

// ─── KmSettingsPanel ─────────────────────────────────────────

interface KmSettingsPanelProps {
  profile: any;
  saveProfile: (data: any) => Promise<any>;
  isPro: boolean;
  lieux?: Lieu[];
  onForceRecalc?: (() => Promise<{ message: string }>) | null;
  onRegeocoderBatch?: ((lieuxManquants: Lieu[]) => Promise<any>) | null;
  triggerAlert?: ((message: string) => void) | null;
}

interface ContractSettingsPanelProps {
  profile: any;
  saveProfile: (data: any) => Promise<any>;
  profileSaving?: boolean;
}

function ContractSettingsPanel({ profile, saveProfile, profileSaving }: ContractSettingsPanelProps) {
  const features = profile?.features ?? {};
  const plan = features.plan === "pro" ? "pro" : "free";
  const isProPlan = plan === "pro";
  const contractActive = resolveContractActive(features);
  const contractType =
    features.contract_type === "interim" ||
    features.contract_type === "formation" ||
    features.contract_type === "cdd" ||
    features.contract_type === "cdi" ||
    features.contract_type === "other"
      ? features.contract_type
      : "other";
  const contractHoursWeek = Number(features.contract_hours_week ?? features.contract_weekly_quota_hours ?? 20);
  const surplusRule =
    features.surplus_rule === "payable" ||
    features.surplus_rule === "banque" ||
    features.surplus_rule === "les_deux"
      ? features.surplus_rule
      : (features.contract_overflow_rule === "to_reserve" ? "banque" : "payable");
  const splitPct = Number(features.surplus_split_pct ?? 50);

  const [localType, setLocalType] = useState(contractType);
  const [localHoursWeek, setLocalHoursWeek] = useState(String(contractHoursWeek));
  const [localSurplusRule, setLocalSurplusRule] = useState(surplusRule);
  const [localSplitPct, setLocalSplitPct] = useState(String(splitPct));
  const [localContractActive, setLocalContractActive] = useState(contractActive);
  const localContractActiveRef = useRef(contractActive);
  const hasPendingContractChangesRef = useRef(false);
  const [savingContract, setSavingContract] = useState(false);

  const pushContractDebug = (event: string, data: Record<string, unknown>) => {
    const payload = { event, at: new Date().toISOString(), ...data };
    console.log("[contract-debug]", payload);
    if (typeof window !== "undefined") {
      const debugWindow = window as any;
      const history = Array.isArray(debugWindow.__contractDebug) ? debugWindow.__contractDebug : [];
      history.push(payload);
      debugWindow.__contractDebug = history.slice(-50);
      debugWindow.__contractDebugLast = payload;
    }
  };

  useEffect(() => {
    if (hasPendingContractChangesRef.current) {
      pushContractDebug("sync-skipped-pending-local-changes", {
        contractActive,
        localContractActive,
        refValue: localContractActiveRef.current,
      });
      return;
    }

    setLocalType(contractType);
    setLocalHoursWeek(String(contractHoursWeek));
    setLocalSurplusRule(surplusRule);
    setLocalSplitPct(String(splitPct));
    setLocalContractActive(contractActive);
    localContractActiveRef.current = contractActive;
    pushContractDebug("sync-from-profile", {
      contractActive,
      localContractActive,
      refValue: localContractActiveRef.current,
      profileSaving: !!profileSaving,
    });
  }, [contractType, contractHoursWeek, surplusRule, splitPct, contractActive]);

  const handleSaveContract = async (forcedContractActive?: boolean) => {
    if (!isProPlan || profileSaving) return;
    const effectiveContractActive = forcedContractActive ?? localContractActiveRef.current;
    const nextFeatures = buildContractFeaturesUpdate(features, {
      contractActive: effectiveContractActive,
      contractType: localType,
      contractHoursWeek: Number(localHoursWeek),
      surplusRule: localSurplusRule,
      surplusSplitPct: Number(localSplitPct),
    });

    pushContractDebug("save-click", {
      localContractActive,
      refValue: localContractActiveRef.current,
      effectiveContractActive,
      nextContractActive: nextFeatures.contract_active,
      nextContractEnabled: nextFeatures.contract_enabled,
      nextContractReserveEnabled: nextFeatures.contract_reserve_enabled,
    });

    setSavingContract(true);
    try {
      const result = await saveProfile({ features: nextFeatures });
      if (!result?.error) {
        hasPendingContractChangesRef.current = false;
        const persistedActive = Boolean(result?.data?.features?.contract_active);
        localContractActiveRef.current = persistedActive;
        setLocalContractActive(persistedActive);
      }
      pushContractDebug("save-result", {
        localContractActive,
        refValue: localContractActiveRef.current,
        resultError: result?.error ?? null,
        resultContractActive: result?.data?.features?.contract_active ?? null,
      });
    } finally {
      setSavingContract(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 border-[var(--color-accent-violet)]/25 bg-[var(--color-accent-violet)]/5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-violet)]/80">
            Mon contrat
          </p>
          {!localContractActive && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Carte compacte (contrat désactivé)
            </p>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">plan: {plan}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">Activer mon contrat</p>
        <button
          type="button"
          disabled={!isProPlan || profileSaving || savingContract}
          onClick={async () => {
            const nextValue = !localContractActiveRef.current;
            hasPendingContractChangesRef.current = true;
            pushContractDebug("toggle-click", {
              previousState: localContractActive,
              previousRef: localContractActiveRef.current,
              nextValue,
            });
            localContractActiveRef.current = nextValue;
            setLocalContractActive(nextValue);

            // UX attendu: si le contrat est désactivé, on persiste immédiatement
            // et le bouton Enregistrer détaillé n'est plus affiché.
            if (!nextValue) {
              await handleSaveContract(false);
            }
          }}
          className={
            "rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-[background,border-color] duration-150 " +
            (localContractActive
              ? "border-[var(--color-accent-violet)]/40 text-[var(--color-accent-violet)] bg-[var(--color-accent-violet)]/10"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
            (!isProPlan || profileSaving || savingContract ? " opacity-50 cursor-not-allowed" : "")
          }
        >
          {localContractActive ? "Activé" : "Désactivé"}
        </button>
      </div>

      <div
        className={
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out " +
          (localContractActive ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0")
        }
      >
        <div className="space-y-3 pt-1">

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--color-text-muted)]">
          Type de contrat
          <select
            value={localType}
            disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
            onChange={(e) => {
              hasPendingContractChangesRef.current = true;
              setLocalType(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 py-1.5 text-sm text-[var(--color-text)]"
          >
            <option value="interim">Intérim</option>
            <option value="formation">Formation</option>
            <option value="cdd">CDD</option>
            <option value="cdi">CDI</option>
            <option value="other">Autre</option>
          </select>
        </label>

        <label className="text-xs text-[var(--color-text-muted)]">
          Heures / semaine
          <input
            type="number"
            min={1}
            step={0.5}
            value={localHoursWeek}
            disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
            onChange={(e) => {
              hasPendingContractChangesRef.current = true;
              setLocalHoursWeek(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 py-1.5 text-sm text-[var(--color-text)]"
          />
        </label>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-3 space-y-3">
        <p className="text-xs font-bold text-[var(--color-text-muted)]">Surplus</p>

        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            type="radio"
            name="surplus-rule"
            checked={localSurplusRule === "payable"}
            disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
            onChange={() => {
              hasPendingContractChangesRef.current = true;
              setLocalSurplusRule("payable");
            }}
          />
          Payable
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            type="radio"
            name="surplus-rule"
            checked={localSurplusRule === "banque"}
            disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
            onChange={() => {
              hasPendingContractChangesRef.current = true;
              setLocalSurplusRule("banque");
            }}
          />
          Banque (réserve)
        </label>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text)]">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="surplus-rule"
              checked={localSurplusRule === "les_deux"}
              disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
              onChange={() => {
                hasPendingContractChangesRef.current = true;
                setLocalSurplusRule("les_deux");
              }}
            />
            Les deux
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={localSplitPct}
            disabled={!isProPlan || profileSaving || savingContract || localSurplusRule !== "les_deux" || !localContractActive}
            onChange={(e) => {
              hasPendingContractChangesRef.current = true;
              setLocalSplitPct(e.target.value);
            }}
            className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 py-1 text-sm text-[var(--color-text)]"
          />
          <span className="text-xs text-[var(--color-text-muted)]">% payable</span>
        </div>
      </div>
        </div>
      </div>

      {localContractActive && (
        <Button
          variant="secondary"
          size="sm"
          disabled={!isProPlan || profileSaving || savingContract || !localContractActive}
          loading={savingContract}
          onClick={() => handleSaveContract()}
        >
          Enregistrer
        </Button>
      )}
    </div>
  );
}

function KmSettingsPanel({
  profile,
  saveProfile,
  isPro,
  lieux = [],
  onForceRecalc = null,
  onRegeocoderBatch = null,
  triggerAlert = null,
}: KmSettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [geocodeBatchLoading, setGeocodeBatchLoading] = useState(false);
  const [kmEnable, setKmEnable] = useState(() => getKmEnabled(profile?.features));
  const [kmIncludeRetour, setKmIncludeRetour] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_include_retour ?? ks.roundTrip ?? false;
  });
  const [kmDomicileAdresse, setKmDomicileAdresse] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_domicile_address || ks.homeLabel || "";
  });
  const [kmCountryCode, setKmCountryCode] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_country || ks.countryCode || "FR";
  });
  const [kmRateMode, setKmRateMode] = useState(
    () => profile?.features?.km_rate_mode || "AUTO_BY_COUNTRY"
  );
  const [kmRate, setKmRate] = useState(() => profile?.features?.km_rate_custom ?? "");

  useEffect(() => {
    if (!profile) return;
    const f = profile.features ?? {};
    const ks = f.km_settings ?? {};
    setKmEnable(getKmEnabled(f));
    setKmIncludeRetour(f.km_include_retour ?? ks.roundTrip ?? false);
    setKmDomicileAdresse(f.km_domicile_address || ks.homeLabel || "");
    setKmCountryCode(f.km_country || ks.countryCode || "FR");
    setKmRateMode(f.km_rate_mode || "AUTO_BY_COUNTRY");
    setKmRate(f.km_rate_custom ?? "");
  }, [profile]);

  const recommendedRate = KM_RATES[kmCountryCode] || 0.42;
  const countryLabel =
    EUROPE_COUNTRIES.find((c) => c.code === kmCountryCode)?.label || kmCountryCode;
  const hasDomicileInProfile = !!(profile?.adresse || profile?.ville);

  const domLat = Number(profile?.features?.km_domicile_lat);
  const domLng = Number(profile?.features?.km_domicile_lng);
  const hasDomicileCoords = Number.isFinite(domLat) && Number.isFinite(domLng);

  const effectiveRate =
    kmRateMode === "CUSTOM" ? (parseFloat(String(kmRate)) || recommendedRate) : recommendedRate;
  const retourMultiplier = kmIncludeRetour ? 2 : 1;

  const lieuxSansGps = (lieux ?? []).filter(
    (l) => !Number.isFinite(Number(l.latitude)) || !Number.isFinite(Number(l.longitude))
  );

  const previewLieu = (lieux ?? []).find(
    (l) => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude))
  );
  let previewLabel = "Exemple";
  let previewDistance = 10;
  let previewIsReal = false;
  if (hasDomicileCoords && previewLieu) {
    previewDistance = haversineKm(domLat, domLng, Number(previewLieu.latitude), Number(previewLieu.longitude));
    previewLabel = previewLieu.nom || "Lieu";
    previewIsReal = true;
  }
  const previewTotal = previewDistance * retourMultiplier * effectiveRate;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const runRecalc = async (silent = false) => {
    if (!onForceRecalc) return;
    if (!silent) {
      setRecalcLoading(true);
      setSaveError(null);
    }
    try {
      const res = await onForceRecalc();
      if (!silent && res?.message) triggerAlert?.(res.message);
    } catch (e: any) {
      if (!silent) setSaveError(e?.message || "Échec du recalcul des frais km.");
    } finally {
      if (!silent) setRecalcLoading(false);
    }
  };

  const handleGeocodeBatch = async () => {
    if (!onRegeocoderBatch || lieuxSansGps.length === 0) return;
    setGeocodeBatchLoading(true);
    setSaveError(null);
    try {
      await onRegeocoderBatch(lieuxSansGps);
      triggerAlert?.("Géocodage lancé pour les lieux sans GPS.");
    } catch (e: any) {
      setSaveError(e?.message || "Échec du géocodage des lieux.");
    } finally {
      setGeocodeBatchLoading(false);
    }
  };

  const handleToggleEnable = async () => {
    if (!isPro) return;
    const newEnabled = !kmEnable;
    setKmEnable(newEnabled);
    setSaving(true);
    setSaveError(null);
    const prevFeatures = profile?.features ?? {};
    let nextFeatures = setKmEnabled(prevFeatures, newEnabled);

    // Si on active km et qu'il n'y a pas encore de coords GPS → géocoder l'adresse profil
    if (newEnabled && !Number.isFinite(prevFeatures.km_domicile_lat)) {
      const addr =
        (prevFeatures.km_domicile_address || "").trim() ||
        [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ");
      if (addr) {
        const geoResult = await geocodeAddress(addr);
        if (geoResult) {
          nextFeatures = {
            ...nextFeatures,
            km_domicile_lat: geoResult.lat,
            km_domicile_lng: geoResult.lng,
            km_domicile_address: prevFeatures.km_domicile_address || addr,
            km_settings: {
              ...(nextFeatures.km_settings ?? {}),
              homeLat: geoResult.lat,
              homeLng: geoResult.lng,
              homeLabel: prevFeatures.km_domicile_address || addr,
            },
          };
        }
      }
    }

    const result = await saveProfile({ features: nextFeatures });
    if (result?.error) {
      setSaveError(result.error);
      setKmEnable(getKmEnabled(profile?.features));
    } else if (newEnabled) {
      await runRecalc(true);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const prevFeatures = profile?.features ?? {};

    let kmDomicileLat = prevFeatures.km_domicile_lat ?? null;
    let kmDomicileLng = prevFeatures.km_domicile_lng ?? null;
    let detectedCountry = null;

    const storedAddr = (prevFeatures.km_domicile_address || "").trim();
    const typedAddr = (kmDomicileAdresse || "").trim();
    const fallbackAddr = [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ");
    const effectiveAddr = typedAddr || fallbackAddr;
    const alreadyGeocoded = Number.isFinite(Number(prevFeatures.km_domicile_lat)) && Number.isFinite(Number(prevFeatures.km_domicile_lng));
    const addrChanged = typedAddr !== storedAddr;

    // Géocoder uniquement si l'adresse a changé ou n'a jamais été géocodée
    if (effectiveAddr && (addrChanged || !alreadyGeocoded)) {
      const geoResult = await geocodeAddress(effectiveAddr);
      if (geoResult) {
        kmDomicileLat = geoResult.lat;
        kmDomicileLng = geoResult.lng;
        detectedCountry = detectCountryFromLatLng(geoResult.lat, geoResult.lng);
        if (detectedCountry) setKmCountryCode(detectedCountry);
      } else {
        setSaveError("Adresse introuvable via géocodage. Essayez une adresse plus précise (ex: 12 Rue Dupont, 75001 Paris).");
        setSaving(false);
        return;
      }
    }
    const effectiveCountry = detectedCountry || kmCountryCode;

    const nextFeatures = {
      ...setKmEnabled(prevFeatures, kmEnable),
      km_country: effectiveCountry,
      km_rate_mode: kmRateMode,
      km_rate_custom: kmRateMode === "CUSTOM" ? parseFloat(String(kmRate)) || null : null,
      km_include_retour: kmIncludeRetour,
      km_domicile_address: kmDomicileAdresse || null,
      km_domicile_lat: kmDomicileLat,
      km_domicile_lng: kmDomicileLng,
      km_settings: {
        ...(prevFeatures.km_settings ?? {}),
        enabled: kmEnable,
        roundTrip: kmIncludeRetour,
        homeLabel: kmDomicileAdresse || null,
        homeLat: kmDomicileLat,
        homeLng: kmDomicileLng,
        countryCode: effectiveCountry,
        ratePerKm:
          kmRateMode === "CUSTOM"
            ? parseFloat(String(kmRate)) || null
            : KM_RATES[effectiveCountry] || 0.42,
      },
    };

    const result = await saveProfile({ features: nextFeatures });
    if (result?.error) {
      setSaveError(result.error);
    } else {
      await runRecalc(true);
    }
    setSaving(false);
  };

  const handleGeolocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSaveError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoLoading(true);
    setSaveError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const prevFeatures = profile?.features ?? {};
        const detected = detectCountryFromLatLng(lat, lng);
        if (detected) setKmCountryCode(detected);
        const nextFeatures = {
          ...prevFeatures,
          km_domicile_lat: lat,
          km_domicile_lng: lng,
          km_country: detected || kmCountryCode,
          km_settings: {
            ...(prevFeatures.km_settings ?? {}),
            homeLat: lat,
            homeLng: lng,
            countryCode: detected || kmCountryCode,
          },
        };
        const result = await saveProfile({ features: nextFeatures });
        if (result?.error) setSaveError(result.error);
        setGeoLoading(false);
      },
      (err) => {
        setSaveError(err?.message || "Impossible de récupérer votre position.");
        setGeoLoading(false);
      }
    );
  };

  return (
    <div className="rounded-2xl border p-4 border-[var(--color-accent-cyan)]/25 bg-[var(--color-accent-cyan)]/5 space-y-4">
      {/* En-tête + activation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-cyan)]/80">
            Frais kilométriques
          </p>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)]">
            Pro
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleEnable}
          disabled={!isPro || saving}
          className={
            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-[background,border-color] duration-150 " +
            (kmEnable
              ? "border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]") +
            (!isPro ? " opacity-50 cursor-not-allowed" : "")
          }
        >
          {kmEnable ? "Activé" : "Désactivé"}
        </button>
      </div>

      {!isPro ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          <span className="text-[var(--color-accent-amber)]/90 font-bold">Fonctionnalité Pro.</span>{" "}
          Calcule automatiquement tes frais de route (domicile → lieu de mission) et les ajoute à ton bilan.
        </p>
      ) : !kmEnable ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Inclus dans ton offre Pro. Active pour calculer automatiquement tes frais de route depuis ton domicile.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Bandeau lieux sans GPS */}
          {lieuxSansGps.length > 0 && (
            <div className="rounded-xl border p-3 border-[var(--color-accent-amber)]/40 bg-[var(--color-accent-amber)]/10 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-accent-amber)]">
                ⚠️ {lieuxSansGps.length} lieu{lieuxSansGps.length > 1 ? "x" : ""} sans GPS
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Ces lieux n&apos;ont pas encore de coordonnées : {lieuxSansGps.map((l) => l.nom).filter(Boolean).join(", ")}.
              </p>
              {onRegeocoderBatch && (
                <button
                  type="button"
                  onClick={handleGeocodeBatch}
                  disabled={geocodeBatchLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors border-[var(--color-accent-amber)]/40 text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/10 hover:bg-[var(--color-accent-amber)]/20 disabled:opacity-40"
                >
                  {geocodeBatchLoading ? "⏳ Géocodage…" : "📍 Géocoder maintenant"}
                </button>
              )}
            </div>
          )}

          {/* 1 · Point de départ (domicile) */}
          <div className="rounded-xl border p-3 border-[var(--color-border)] bg-[var(--color-surface-offset)] space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-cyan)]/80">
              1 · Point de départ (domicile)
            </p>
            <input
              type="text"
              value={kmDomicileAdresse}
              onChange={(e) => setKmDomicileAdresse(e.target.value)}
              placeholder={
                hasDomicileInProfile
                  ? [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ")
                  : "Ex: Rue de la Paix 1, 75001 Paris"
              }
              className="w-full p-3 rounded-xl font-bold outline-none border-2 transition-[border-color] duration-150 text-sm bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-cyan)] placeholder:text-[var(--color-text-faint)]"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-[background] duration-150 border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 hover:bg-[var(--color-accent-cyan)]/20 disabled:opacity-40"
              >
                {geoLoading ? "⏳ Localisation…" : "📍 Ma position actuelle"}
              </button>
              {hasDomicileCoords ? (
                <span className="text-[11px] font-bold text-green-400">✓ Coordonnées trouvées</span>
              ) : (
                <span className="text-[11px] font-bold text-[var(--color-accent-amber)]/90">⚠ Adresse à préciser</span>
              )}
            </div>
            {hasDomicileInProfile && !kmDomicileAdresse && (
              <p className="text-[10px] italic text-[var(--color-text-muted)]">
                Si vide, l&apos;adresse du profil sera utilisée.
              </p>
            )}
          </div>

          {/* 2 · Barème */}
          <div className="rounded-xl border p-3 border-[var(--color-border)] bg-[var(--color-surface-offset)] space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-cyan)]/80">
              2 · Barème
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="km-rate-mode"
                className="mt-1"
                checked={kmRateMode === "AUTO_BY_COUNTRY"}
                onChange={() => setKmRateMode("AUTO_BY_COUNTRY")}
              />
              <span className="flex-1 text-sm text-[var(--color-text)]">
                Barème officiel par pays
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  {countryLabel} · {recommendedRate} €/km
                </span>
              </span>
            </label>
            {kmRateMode === "AUTO_BY_COUNTRY" && (
              <select
                value={kmCountryCode}
                onChange={(e) => { setKmCountryCode(e.target.value); setKmRateMode("AUTO_BY_COUNTRY"); }}
                className="w-full p-2.5 rounded-xl font-bold outline-none border-2 text-sm bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-cyan)]"
              >
                {EUROPE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            )}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="km-rate-mode"
                className="mt-1"
                checked={kmRateMode === "CUSTOM"}
                onChange={() => { setKmRateMode("CUSTOM"); if (!kmRate) setKmRate(String(recommendedRate)); }}
              />
              <span className="flex-1 text-sm text-[var(--color-text)]">Taux personnalisé</span>
            </label>
            {kmRateMode === "CUSTOM" && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={kmRate}
                  onChange={(e) => setKmRate(e.target.value)}
                  placeholder={`${recommendedRate}`}
                  className="flex-1 p-2.5 rounded-xl font-bold outline-none border-2 text-sm bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-cyan)] placeholder:text-[var(--color-text-faint)]"
                />
                <span className="text-sm text-[var(--color-text-muted)]">€/km</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-sm text-[var(--color-text-muted)]">Aller-retour (×2)</p>
              <button
                type="button"
                onClick={() => setKmIncludeRetour((v: boolean) => !v)}
                className={
                  "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors " +
                  (kmIncludeRetour
                    ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]")
                }
              >
                {kmIncludeRetour ? "Activé" : "Désactivé"}
              </button>
            </div>
          </div>

          {/* Aperçu en direct */}
          <div className="rounded-xl border p-3 border-[var(--color-accent-cyan)]/25 bg-[var(--color-accent-cyan)]/5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent-cyan)]/80">
              Aperçu en direct
            </p>
            <p className="text-sm text-[var(--color-text)]">
              {previewIsReal ? `Domicile → ${previewLabel}` : "Exemple"} :{" "}
              <strong>{fmt(previewDistance)} km</strong>
              {kmIncludeRetour ? <> × 2 (retour)</> : null} × {fmt(effectiveRate)} € ={" "}
              <strong className="text-[var(--color-accent-cyan)]">{fmt(previewTotal)} €</strong>
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              ℹ️ Distance à vol d&apos;oiseau{previewIsReal ? "" : " (exemple — ajoute un lieu géocodé pour un calcul réel)"}.
            </p>
          </div>

          {saveError && <p className="text-red-400 text-xs font-bold">{saveError}</p>}

          <Button
            variant="secondary"
            fullWidth
            loading={saving}
            disabled={saving}
            onClick={handleSave}
          >
            Enregistrer les réglages km
          </Button>

          {/* Calcul automatique / forcer */}
          <div className="rounded-xl border p-3 border-emerald-500/25 bg-emerald-500/5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80">
              Calcul automatique
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Les frais se recalculent automatiquement quand tu enregistres tes réglages. Utilise le bouton en cas de besoin.
            </p>
            {onForceRecalc && (
              <button
                type="button"
                onClick={() => runRecalc(false)}
                disabled={recalcLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors border-emerald-400/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                {recalcLoading ? "⏳ Recalcul…" : "↻ Forcer le recalcul"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

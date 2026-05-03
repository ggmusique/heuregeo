import React, { Component, Dispatch, SetStateAction, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CompteTab } from "./CompteTab";
import { DonneesTab } from "./DonneesTab";
import { EUROPE_COUNTRIES, KM_RATES, detectCountryFromLatLng } from "../utils/kmRatesByCountry";
import { geocodeAddress } from "../utils/geocode";
import { getKmEnabled, setKmEnabled } from "../utils/kmSettings";
import { supabase } from "../services/supabase";
import { useLabels } from "../contexts/LabelsContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { usePermissions } from "../contexts/PermissionsContext";
import type { Mission, Patron, Client, Lieu } from "../types/entities";
import type { KmSettings, KmFraisResult } from "../hooks/useKmDomicile";

const AdminPage = lazy(() =>
  import("./AdminPage").then((m) => ({ default: m.AdminPage }))
);
const DiagnosticsPage = lazy(() =>
  import("./DiagnosticsPage").then((m) => ({ default: m.DiagnosticsPage }))
);

// ─── Icônes SVG ─────────────────────────────────────────────────────────────

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

// ─── Couleurs par section ────────────────────────────────────────────────────

type ColorTokens = {
  active: string;
  icon: string;
  dot: string;
  header: string;
  headerText: string;
  badge: string;
};

const colorMap: Record<string, ColorTokens> = {
  indigo: {
    active: "bg-indigo-500/15 border-indigo-400/40",
    icon: "text-indigo-400 bg-indigo-500/15",
    dot: "bg-indigo-400",
    header: "from-indigo-500/15 to-transparent border-indigo-500/20",
    headerText: "text-indigo-300",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
  },
  violet: {
    active: "bg-violet-500/15 border-violet-400/40",
    icon: "text-violet-400 bg-violet-500/15",
    dot: "bg-violet-400",
    header: "from-violet-500/15 to-transparent border-violet-500/20",
    headerText: "text-violet-300",
    badge: "bg-violet-500/20 text-violet-300 border-violet-400/30",
  },
  yellow: {
    active: "bg-yellow-500/15 border-yellow-400/40",
    icon: "text-yellow-400 bg-yellow-500/15",
    dot: "bg-yellow-400",
    header: "from-yellow-500/15 to-transparent border-yellow-500/20",
    headerText: "text-yellow-300",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  },
  teal: {
    active: "bg-teal-500/15 border-teal-400/40",
    icon: "text-teal-400 bg-teal-500/15",
    dot: "bg-teal-400",
    header: "from-teal-500/15 to-transparent border-teal-500/20",
    headerText: "text-teal-300",
    badge: "bg-teal-500/20 text-teal-300 border-teal-400/30",
  },
  red: {
    active: "bg-red-500/15 border-red-400/40",
    icon: "text-red-400 bg-red-500/15",
    dot: "bg-red-400",
    header: "from-red-500/15 to-transparent border-red-500/20",
    headerText: "text-red-300",
    badge: "bg-red-500/20 text-red-300 border-red-400/30",
  },
  cyan: {
    active: "bg-cyan-500/15 border-cyan-400/40",
    icon: "text-cyan-400 bg-cyan-500/15",
    dot: "bg-cyan-400",
    header: "from-cyan-500/15 to-transparent border-cyan-500/20",
    headerText: "text-cyan-300",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  },
};

const colorMapLight: Record<string, ColorTokens> = {
  indigo: { ...colorMap.indigo, headerText: "text-indigo-600", badge: "bg-indigo-100 text-indigo-600 border-indigo-300/60" },
  violet: { ...colorMap.violet, headerText: "text-violet-600", badge: "bg-violet-100 text-violet-600 border-violet-300/60" },
  yellow: { ...colorMap.yellow, headerText: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-300/60" },
  teal: { ...colorMap.teal, headerText: "text-teal-700", badge: "bg-teal-100 text-teal-700 border-teal-300/60" },
  red: { ...colorMap.red, headerText: "text-red-600", badge: "bg-red-100 text-red-600 border-red-300/60" },
  cyan: { ...colorMap.cyan, headerText: "text-cyan-700", badge: "bg-cyan-100 text-cyan-700 border-cyan-300/60" },
};

// ─── Error boundary Diagnostics ──────────────────────────────────────────────

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

// ─── Composant principal ─────────────────────────────────────────────────────

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
}: ParametresTabProps) {
  const { darkMode } = useDarkMode();
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
        <aside className={"rounded-2xl border backdrop-blur-xl p-3 space-y-1.5 lg:sticky lg:top-4 " + (darkMode ? "border-white/10 bg-black/30" : "border-slate-200 bg-white/80 shadow-sm")}>
          <p className={"text-[9px] font-black uppercase tracking-[0.25em] px-2 pb-1 " + (darkMode ? "text-white/35" : "text-slate-400")}>
            Navigation
          </p>
          {sections.map((item) => {
            const isActive = activePanel === item.key;
            const colors = (darkMode ? colorMap : colorMapLight)[item.color];
            return (
              <button
                key={item.key}
                onClick={() => setActivePanel(isActive ? null : item.key)}
                aria-label={`Section ${item.title}`}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all duration-200 ${
                  isActive
                    ? colors.active + " shadow-sm"
                    : (darkMode ? "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/25" : "bg-transparent border-slate-200 hover:bg-slate-50 hover:border-slate-300")
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 transition-all duration-200 ${isActive ? colors.icon : (darkMode ? "text-white/40 bg-white/5" : "text-slate-400 bg-slate-100")}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-black uppercase tracking-widest truncate transition-colors duration-200 ${isActive ? (darkMode ? "text-white" : "text-slate-800") : (darkMode ? "text-white/75" : "text-slate-600")}`}>
                      {item.title}
                    </p>
                    <p className={"text-[10px] leading-snug truncate mt-0.5 " + (darkMode ? "text-white/45" : "text-slate-400")}>
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
          <div className={"mt-2 pt-2 border-t " + (darkMode ? "border-white/10" : "border-slate-200")}>
            <button
              onClick={() => supabase.auth.signOut()}
              className={"w-full text-left rounded-xl border px-3 py-3 transition-all duration-200 " +
                (darkMode
                  ? "bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/40 hover:text-red-400"
                  : "bg-transparent border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500")}
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
        <div className={"rounded-2xl border backdrop-blur-xl overflow-hidden min-h-[300px] " + (darkMode ? "border-white/10 bg-black/25" : "border-slate-200 bg-white/80 shadow-sm")}>
          {!activeSection ? (
            // État bienvenue
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-5">
              <div className={"w-14 h-14 rounded-2xl border flex items-center justify-center " + (darkMode ? "bg-white/5 border-white/10 text-white/25" : "bg-slate-100 border-slate-200 text-slate-300")}>
                <IconSettings />
              </div>
              <div>
                <p className={"text-sm font-black uppercase tracking-[0.2em] " + (darkMode ? "text-white/50" : "text-slate-400")}>
                  Paramètres
                </p>
                <p className={"text-xs mt-1.5 " + (darkMode ? "text-white/30" : "text-slate-400")}>
                  Sélectionnez une section dans le menu
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {sections.map((item) => {
                  const colors = (darkMode ? colorMap : colorMapLight)[item.color];
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActivePanel(item.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-90 ${colors.badge}`}
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
                const colors = (darkMode ? colorMap : colorMapLight)[activeSection.color];
                return (
                  <div className={`px-5 py-4 border-b bg-gradient-to-r ${colors.header} ` + (darkMode ? "border-white/10" : "border-slate-200")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${colors.icon}`}>
                          {activeSection.icon}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${colors.headerText}`}>
                            {activeSection.title}
                          </p>
                          <p className={"text-[10px] truncate mt-0.5 " + (darkMode ? "text-white/45" : "text-slate-400")}>
                            {activeSection.subtitle}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActivePanel(null)}
                        className={"p-1.5 rounded-lg border transition-all flex-shrink-0 " + (darkMode ? "border-white/15 text-white/40 hover:text-white hover:border-white/30" : "border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300")}
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
                    <div className={"rounded-2xl border p-4 " + (darkMode ? "border-yellow-500/25 bg-yellow-500/5" : "border-amber-300/50 bg-amber-50/50")}>
                      <p className={"text-[10px] font-black uppercase tracking-widest mb-3 " + (darkMode ? "text-yellow-200/80" : "text-amber-700")}>
                        Sélecteur taux du jour
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>
                          Afficher le sélecteur &quot;taux du jour&quot; dans Saisie
                        </p>
                        <button
                          type="button"
                          disabled={!isPro}
                          onClick={() => onToggleMissionRateEditor?.((prev: boolean) => !prev)}
                          className={
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                            (showMissionRateEditor
                              ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                              : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500")) +
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
                      darkMode={darkMode}
                    />
                    <div className={"rounded-2xl border p-4 " + (darkMode ? "border-emerald-500/25 bg-emerald-500/5" : "border-emerald-300/50 bg-emerald-50/50")}>
                      <p className={"text-[10px] font-black uppercase tracking-widest mb-3 " + (darkMode ? "text-emerald-200/80" : "text-emerald-700")}>
                        Agenda
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>
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
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                            (profile?.features?.agenda
                              ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                              : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500")) +
                            (!isPro || profileSaving ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {profile?.features?.agenda ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                    </div>
                    <div className={"rounded-2xl border p-4 " + (darkMode ? "border-indigo-500/25 bg-indigo-500/5" : "border-indigo-300/50 bg-indigo-50/50")}>
                      <p className={"text-[10px] font-black uppercase tracking-widest mb-3 " + (darkMode ? "text-indigo-200/80" : "text-indigo-700")}>
                        Dashboard
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>
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
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                            (profile?.features?.dashboard
                              ? "border-indigo-400/40 text-indigo-300 bg-indigo-500/10"
                              : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500")) +
                            (!isPro || profileSaving ? " opacity-40 cursor-not-allowed" : "")
                          }
                        >
                          {profile?.features?.dashboard ? "Activé" : "Désactivé"}
                        </button>
                      </div>
                    </div>
                    <div className={"rounded-2xl border p-4 " + (darkMode ? "border-amber-500/25 bg-amber-500/5" : "border-amber-300/50 bg-amber-50/50")}>
                      <p className={"text-[10px] font-black uppercase tracking-widest mb-3 " + (darkMode ? "text-amber-200/80" : "text-amber-700")}>
                        Facturation
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>
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
                            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                            (profile?.features?.facture
                              ? "border-amber-400/40 text-amber-300 bg-amber-500/10"
                              : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500")) +
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
                    darkMode={darkMode}
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
                    allowClientActions={false}
                    allowLieuActions={true}
                    kmSettings={kmSettings}
                    onRegeocoderLieu={onRegeocoderLieu}
                    deleteAcompte={deleteAcompte}
                    fetchAcomptes={fetchAcomptes}
                    showConfirm={showConfirm}
                    triggerAlert={triggerAlert}
                    isViewer={isViewer}
                  />
                )}

                {activePanel === "libelles" && (
                  <LabelsPanel
                    profile={profile}
                    saveProfile={saveProfile}
                    darkMode={darkMode}
                    profileSaving={profileSaving}
                  />
                )}

                {activePanel === "admin" && isAdmin && (
                  <Suspense
                    fallback={
                      <div className={"py-8 text-center text-sm " + (darkMode ? "text-white/40" : "text-slate-400")}>
                        Chargement…
                      </div>
                    }
                  >
                    <AdminPage darkMode={darkMode} />
                  </Suspense>
                )}

                {activePanel === "diagnostics" && isAdmin && (
                  <DiagnosticsErrorBoundary>
                    <Suspense
                      fallback={
                        <div className={"py-8 text-center text-sm " + (darkMode ? "text-white/40" : "text-slate-400")}>
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

// ─── LabelsPanel ──────────────────────────────────────────────────────────────

interface LabelsPanelProps {
  profile: any;
  saveProfile: (data: any) => Promise<any>;
  darkMode: boolean;
  profileSaving?: boolean;
}

function LabelsPanel({ profile, saveProfile, darkMode, profileSaving }: LabelsPanelProps) {
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
      className={"w-full p-2.5 rounded-xl font-bold outline-none border-2 transition-all text-sm backdrop-blur-md " +
        (darkMode ? "bg-black/20 border-white/10 text-white focus:border-teal-500 placeholder:text-white/25" : "bg-white border-slate-200 text-slate-800 focus:border-teal-500 placeholder:text-slate-300")}
    />
  );

  return (
    <div className="space-y-4 p-1">
      <p className={"text-xs " + (darkMode ? "text-white/50" : "text-slate-500")}>
        Personnalisez le vocabulaire affiché dans l&apos;application. Laissez vide pour garder la valeur par défaut.
      </p>
      <div className="space-y-3">
        {rows.map(({ key, keyP, label }) => (
          <div key={key} className={"rounded-xl border p-3 space-y-2 " + (darkMode ? "border-white/10 bg-white/3" : "border-slate-200 bg-slate-50")}>
            <p className={"text-[10px] font-black uppercase tracking-widest " + (darkMode ? "text-teal-300/70" : "text-teal-700")}>{label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={"text-[9px] uppercase tracking-wider mb-1 " + (darkMode ? "text-white/35" : "text-slate-400")}>Singulier</p>
                {inp(key)}
              </div>
              <div>
                <p className={"text-[9px] uppercase tracking-wider mb-1 " + (darkMode ? "text-white/35" : "text-slate-400")}>Pluriel</p>
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
          className={"flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all " +
            (darkMode ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 disabled:opacity-40" : "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 disabled:opacity-40")}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={handleReset}
          disabled={saving || profileSaving}
          className={"px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all " +
            (darkMode ? "border border-white/10 text-white/40 hover:text-white/60 disabled:opacity-40" : "border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-40")}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

// ─── KmSettingsPanel ─────────────────────────────────────────────────────────

interface KmSettingsPanelProps {
  profile: any;
  saveProfile: (data: any) => Promise<any>;
  isPro: boolean;
  darkMode?: boolean;
}

function KmSettingsPanel({ profile, saveProfile, isPro, darkMode = true }: KmSettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
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
      km_rate_custom: kmRateMode === "CUSTOM" ? parseFloat(kmRate) || null : null,
      km_include_retour: kmIncludeRetour,
      km_domicile_address: kmDomicileAdresse || null,
      km_domicile_lat: kmDomicileLat,
      km_domicile_lng: kmDomicileLng,
      km_settings: {
        ...(prevFeatures.km_settings ?? {}),
        enabled: kmEnable,
        homeLat: kmDomicileLat,
        homeLng: kmDomicileLng,
        homeLabel: kmDomicileAdresse || null,
        ratePerKm: kmRateMode === "CUSTOM" ? parseFloat(kmRate) || null : null,
        roundTrip: kmIncludeRetour,
        countryCode: effectiveCountry,
      },
    };
    const result = await saveProfile({ features: nextFeatures });
    if (result?.error) {
      setSaveError(result.error);
      setKmEnable(getKmEnabled(profile?.features));
    }
    setSaving(false);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setSaveError("Géolocalisation non supportée par ce navigateur.");
      return;
    }
    setGeoLoading(true);
    setSaveError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const detectedCountry = detectCountryFromLatLng(lat, lng);
        const prevFeatures = profile?.features ?? {};
        const nextFeatures = {
          ...prevFeatures,
          km_domicile_lat: lat,
          km_domicile_lng: lng,
          ...(detectedCountry ? { km_country: detectedCountry } : {}),
          km_settings: {
            ...(prevFeatures.km_settings ?? {}),
            homeLat: lat,
            homeLng: lng,
            ...(detectedCountry ? { countryCode: detectedCountry } : {}),
          },
        };
        if (detectedCountry) setKmCountryCode(detectedCountry);
        const result = await saveProfile({ features: nextFeatures });
        if (result?.error) setSaveError(result.error);
        setGeoLoading(false);
      },
      (err) => {
        setSaveError("Impossible d'obtenir votre position : " + err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={"rounded-2xl border p-4 space-y-4 " + (darkMode ? "border-blue-500/25 bg-blue-500/5" : "border-blue-300/50 bg-blue-50/50")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={"text-[10px] font-black uppercase tracking-widest mb-1 " + (darkMode ? "text-blue-200/80" : "text-blue-700")}>
            Frais kilométriques
          </p>
          {!isPro && (
            <p className="text-[10px] text-yellow-400/80">Fonctionnalité Pro</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleEnable}
          disabled={!isPro || saving}
          className={
            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
            (kmEnable
              ? "border-blue-400/40 text-blue-300 bg-blue-500/10"
              : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500")) +
            (!isPro ? " opacity-50 cursor-not-allowed" : "")
          }
        >
          {kmEnable ? "Activé" : "Désactivé"}
        </button>
      </div>

      {kmEnable && isPro && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>Inclure le trajet retour (aller-retour)</p>
            <button
              type="button"
              onClick={() => setKmIncludeRetour((v: boolean) => !v)}
              className={
                "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                (kmIncludeRetour
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                  : (darkMode ? "border-white/20 text-white/60" : "border-slate-300 text-slate-500"))
              }
            >
              {kmIncludeRetour ? "Aller-Retour" : "Aller seul"}
            </button>
          </div>

          <div>
            <label className={"block text-[10px] font-black uppercase mb-1 tracking-wider " + (darkMode ? "text-blue-300/80" : "text-blue-700")}>
              Adresse domicile
            </label>
            <input
              type="text"
              value={kmDomicileAdresse}
              onChange={(e) => setKmDomicileAdresse(e.target.value)}
              placeholder={
                hasDomicileInProfile
                  ? [profile?.adresse, profile?.code_postal, profile?.ville]
                      .filter(Boolean)
                      .join(", ")
                  : "Ex: Rue de la Paix 1, 75001 Paris"
              }
              className={"w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm backdrop-blur-md " + (darkMode ? "bg-black/20 border-white/10 text-white focus:border-blue-500 placeholder:text-white/30" : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400")}
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading || saving}
              className={"mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " +
                (darkMode
                  ? "border-blue-400/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-40"
                  : "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40")}
            >
              {geoLoading ? "⏳ Localisation…" : "📍 Ma position actuelle"}
            </button>
            {hasDomicileInProfile && !kmDomicileAdresse && (
              <p className={"text-[10px] mt-1 italic " + (darkMode ? "text-white/40" : "text-slate-400")}>
                Si vide, l&apos;adresse du profil sera utilisée.
              </p>
            )}
            {Number.isFinite(Number(profile?.features?.km_domicile_lat)) &&
            Number.isFinite(Number(profile?.features?.km_domicile_lng)) ? (
              <p className="text-[10px] text-green-400 mt-1">✅ Coordonnées GPS enregistrées</p>
            ) : (
              <p className="text-[10px] text-yellow-400/80 mt-1">
                ⚠️ Coordonnées non résolues — enregistrez pour les calculer
              </p>
            )}
          </div>

          <div>
            <label className={"block text-[10px] font-black uppercase mb-1 tracking-wider " + (darkMode ? "text-blue-300/80" : "text-blue-700")}>
              Pays
            </label>
            <select
              value={kmCountryCode}
              onChange={(e) => {
                setKmCountryCode(e.target.value);
                setKmRateMode("AUTO_BY_COUNTRY");
              }}
              className={"w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm backdrop-blur-md " + (darkMode ? "bg-black/20 border-white/10 text-white focus:border-blue-500" : "bg-white border-slate-200 text-slate-800 focus:border-blue-500")}
            >
              {EUROPE_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={"block text-[10px] font-black uppercase mb-1 tracking-wider " + (darkMode ? "text-blue-300/80" : "text-blue-700")}>
              Taux kilométrique
            </label>
            {kmRateMode === "AUTO_BY_COUNTRY" ? (
              <div className={"flex items-center justify-between p-3 rounded-xl border " + (darkMode ? "bg-black/20 border-white/10" : "bg-white border-slate-200")}>
                <span className={"text-sm " + (darkMode ? "text-white/70" : "text-slate-600")}>
                  Taux recommandé :{" "}
                  <strong className="text-blue-300">{recommendedRate} €/km</strong> ({countryLabel})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setKmRateMode("CUSTOM");
                    setKmRate(recommendedRate);
                  }}
                  className="text-[10px] font-black uppercase text-purple-300 hover:text-purple-100 transition-all ml-2"
                >
                  Personnaliser
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={kmRate}
                  onChange={(e) => setKmRate(e.target.value)}
                  placeholder={`${recommendedRate}`}
                  className={"flex-1 p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm backdrop-blur-md " + (darkMode ? "bg-black/20 border-white/10 text-white focus:border-blue-500 placeholder:text-white/30" : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400")}
                />
                <span className={"text-sm " + (darkMode ? "text-white/60" : "text-slate-500")}>€/km</span>
                <button
                  type="button"
                  onClick={() => setKmRateMode("AUTO_BY_COUNTRY")}
                  className={"text-[10px] font-black uppercase transition-all " + (darkMode ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-slate-700")}
                >
                  Auto
                </button>
              </div>
            )}
          </div>

          {saveError && <p className="text-red-400 text-xs font-bold">{saveError}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase text-[11px] text-white transition-all disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les réglages km"}
          </button>
        </div>
      )}
    </div>
  );
}

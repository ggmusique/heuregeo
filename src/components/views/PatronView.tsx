// src/components/views/PatronView.tsx
// Vue dédiée aux utilisateurs ayant role='patron'.
// Affiche bilan, agenda (si access_agenda), dashboard (si access_dashboard).
// Les données sont filtrées automatiquement par RLS côté Supabase.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";

import { useMissions } from "../../hooks/useMissions";
import { useFrais } from "../../hooks/useFrais";
import { useAcomptes } from "../../hooks/useAcomptes";
import { useBilan } from "../../hooks/useBilan";
import { useAppUI } from "../../hooks/useAppUI";
import { useConfirm } from "../../hooks/useConfirm";
import { useAgenda } from "../../hooks/useAgenda";

import { BilanTab } from "../../pages/BilanTab";
import { AgendaPage } from "../agenda/AgendaPage";
import { VueDashboard } from "./VueDashboard";
import { PeriodModal } from "../common/bilan/PeriodModal";
import { CustomAlert } from "../common/CustomAlert";
import { PatronSelectorModal, useEnrichedPatronAccesses } from "../patron/PatronSelectorModal";

import { DarkModeProvider } from "../../contexts/DarkModeContext";
import { LabelsContext } from "../../contexts/LabelsContext";
import { PermissionsContext } from "../../contexts/PermissionsContext";
import { getLabels } from "../../utils/labels";
import { PatronInviteSection } from "../invitations/PatronInviteSection";
import { useInvitations } from "../../hooks/useInvitations";

import type { User } from "@supabase/supabase-js";
import type { EnrichedAccess } from "../patron/PatronSelectorModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatronTab = "bilan" | "agenda" | "dashboard" | "equipe";

interface PatronViewInnerProps {
  access: EnrichedAccess;
  user: User;
  onSwitchOwner: () => void;
  hasMultipleOwners: boolean;
  onAccessChange: () => void;
}

// ─── Sous-composant : vue après sélection de l'ouvrier ───────────────────────

function PatronViewInner({
  access,
  user,
  onSwitchOwner,
  hasMultipleOwners,
  onAccessChange,
}: PatronViewInnerProps) {
  const [activeTab, setActiveTab] = useState<PatronTab>("bilan");
  const { triggerAlert, customAlert, dismissAlert } = useAppUI();
  const { confirmState: _cs, showConfirm, hideConfirm: _hc } = useConfirm();

  // ── Données (filtrées par RLS) ───────────────────────────────────────────
  const {
    missions,
    getMissionsByWeek,
    getMissionsByPeriod,
    fetchMissions,
  } = useMissions(triggerAlert);

  const { fraisDivers, getFraisByWeek, getTotalFrais, fetchFrais } = useFrais(triggerAlert);

  const {
    listeAcomptes,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua,
    fetchAcomptes,
  } = useAcomptes(missions, fraisDivers, triggerAlert);

  // Chargement initial des données
  useEffect(() => {
    fetchMissions();
    fetchFrais();
    fetchAcomptes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Patron courant (pour l'affichage dans useBilan)
  const [patronNom, setPatronNom] = useState<string>(access.patronNom || "Patron");

  useEffect(() => {
    // Charger le nom du patron depuis la table patrons si pas encore connu
    if (access.patronNom) { setPatronNom(access.patronNom); return; }
    if (!access.patronId) {
      console.error('[PatronViewInner] patronId null, impossible de charger le nom du patron');
      return;
    }
    supabase
      .from("patrons")
      .select("nom")
      .eq("id", access.patronId)
      .maybeSingle()
      .then(({ data }) => { if (data?.nom) setPatronNom(data.nom as string); });
  }, [access.patronId, access.patronNom]);

  // Patron fictif pour que useBilan puisse afficher le nom
  const patrons = [{ id: access.patronId, nom: patronNom, couleur: "#8b5cf6" }] as import("../../types/entities").Patron[];

  // ── useBilan ─────────────────────────────────────────────────────────────
  const bilan = useBilan({
    missions,
    fraisDivers,
    patrons,
    getMissionsByWeek,
    getMissionsByPeriod,
    getFraisByWeek,
    getTotalFrais,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua,
    triggerAlert,
  });

  // Forcer le filtrage sur ce patron (RLS garantit déjà le scope mais le bilan
  // doit afficher le bon libellé de patron)
  useEffect(() => {
    bilan.setShowBilan(false);
  }, [access.patronId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcul des périodes disponibles quand le modal s'ouvre
  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Agenda (si access_agenda) ─────────────────────────────────────────────
  // On passe ownerUserId pour que useAgenda charge les events de l'ouvrier
  const agendaHook = useAgenda({
    userId: access.access_agenda ? access.ownerUserId : null,
    triggerAlert,
  });

  // ── Labels et permissions ─────────────────────────────────────────────────
  const labels = getLabels(null);
  const permissions = {
    isViewer: false,
    viewerPatronId: access.patronId,
    isAdmin: false,
    isPro: false,
    canBilanMois: true,
    canBilanAnnee: true,
    canExportPDF: true,
    canExportExcel: true,
    canExportCSV: true,
    canKilometrage: false,
    canAgenda: access.access_agenda,
    canFacture: false,
    canDashboard: access.access_dashboard,
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const navItems: { id: PatronTab; label: string; icon: string }[] = [
    { id: "bilan", label: "Bilan", icon: "�" },
    ...(access.access_dashboard ? [{ id: "dashboard" as PatronTab, label: "Dashboard", icon: "📊" }] : []),
    ...(access.access_agenda ? [{ id: "agenda" as PatronTab, label: "Agenda", icon: "📅" }] : []),    { id: "equipe", label: "Équipe", icon: "🔗" },  ];

  return (
    <>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={dismissAlert} />

          {/* En-tête patron */}
          <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl">
            <div className="px-4">
              <div className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                    <img src="/icons/icon.svg" alt="Tracko" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tracko</span>
                </div>

                <div className="flex items-center gap-2">
                  {hasMultipleOwners && (
                    <button
                      onClick={onSwitchOwner}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 transition-all text-xs font-bold"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      Changer
                    </button>
                  )}
                  <button
                    onClick={() => supabase.auth.signOut()}
                    title="Se déconnecter"
                    className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-400 transition-colors text-xs"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <h1 className="text-[22px] sm:text-[30px] font-black italic tracking-[0.08em] sm:tracking-[0.1em] text-[var(--color-primary)] drop-shadow-2xl font-['Playfair_Display'] pb-3">
                {"HEURES DE " + (access.ownerName?.trim()?.toUpperCase() || "—")}
              </h1>
            </div>
          </header>

          {/* Contenu principal */}
          <main className="relative px-4 pt-4 pb-28">
            {activeTab === "bilan" && (
              <>
                <BilanTab
                  bilan={bilan}
                  bilanPatronId={access.patronId}
                  currentWeek={0}
                  missionsThisWeek={[]}
                  patrons={patrons}
                  getPatronNom={(id) => (id === access.patronId ? patronNom : "Patron")}
                  getPatronColor={() => "#8b5cf6"}
                  profile={null}
                  isViewer={true}
                  canBilanMois={true}
                  canBilanAnnee={true}
                  canExportPDF={true}
                  canExportExcel={true}
                  canExportCSV={true}
                  canFacture={false}
                />

                {/* PeriodModal : pas de filtre patron (lecture seule, 1 seul patron) */}
                <PeriodModal
                  show={bilan.showPeriodModal}
                  periodType={bilan.bilanPeriodType as "semaine" | "mois" | "annee"}
                  setPeriodType={bilan.setBilanPeriodType}
                  periodValue={bilan.bilanPeriodValue}
                  setPeriodValue={bilan.setBilanPeriodValue}
                  availablePeriods={bilan.availablePeriods}
                  formatPeriodLabel={bilan.formatPeriodLabel}
                  onConfirm={() => { bilan.genererBilan(access.patronId); bilan.setShowPeriodModal(false); }}
                  onCancel={() => bilan.setShowPeriodModal(false)}
                  // Pas de filtre patron (le patron voit uniquement ses propres données)
                  patrons={[]}
                  selectedPatronId={null}
                  isViewer={true}
                  canBilanMois={true}
                  canBilanAnnee={true}
                />
              </>
            )}

            {activeTab === "dashboard" && access.access_dashboard && (
              <VueDashboard
                missions={missions}
                fraisDivers={fraisDivers}
                listeAcomptes={listeAcomptes}
                patrons={patrons}
                clients={[]}
                lieux={[]}
                profile={null}
                kmSettings={null}
                domicileLatLng={null}
              />
            )}

            {activeTab === "agenda" && access.access_agenda && (
              <AgendaPage
                userId={access.ownerUserId}
                triggerAlert={triggerAlert}
                onOpenForDate={(_dateIso: string) => {}}
                onEventEdit={(_event) => {}}
                onEventDelete={(_id: string) => Promise.resolve()}
                refreshKey={0}
              />
            )}

            {activeTab === "equipe" && (
              <PatronInviteSection onAccessChange={onAccessChange} />
            )}
          </main>

          {/* Barre de navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={
                    "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all " +
                    (activeTab === item.id
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]")
                  }
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
    </>
  );
}

// ─── Composant racine PatronView ──────────────────────────────────────────────

// ─── Écran d'onboarding Patron (aucun accès actif) ───────────────────────────

function PatronOnboarding() {
  const {
    myInviteCode,
    generateMyCode,
    searchResult,
    searching,
    searchError,
    searchByInviteCode,
    clearSearch,
    sendInvitation,
    pendingReceived,
    pendingSent,
    acceptInvitation,
    refuseInvitation,
    cancelInvitation,
    refresh,
  } = useInvitations();

  const [codeInput, setCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCopy = () => {
    if (!myInviteCode) return;
    navigator.clipboard.writeText(myInviteCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim().length < 4) return;
    searchByInviteCode(codeInput.trim());
  };

  const handleSend = async () => {
    if (!searchResult) return;
    setSendError(null);
    setSendLoading(true);
    const { error } = await sendInvitation(codeInput.trim(), "patron");
    setSendLoading(false);
    if (error) {
      setSendError(error);
    } else {
      setSent(true);
      setCodeInput("");
      clearSearch();
      refresh();
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    await acceptInvitation(id);
    setActionLoading(null);
    refresh();
  };

  const handleRefuse = async (id: string) => {
    setActionLoading(id);
    await refuseInvitation(id);
    setActionLoading(null);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    await cancelInvitation(id);
    setActionLoading(null);
  };

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                <img src="/icons/icon.svg" alt="Tracko" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tracko</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-400 hover:border-red-500/40 transition-colors text-xs"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </div>
        </header>

        {/* Corps */}
        <div className="px-4 pt-8 pb-16 max-w-xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Bienvenue 👋</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
              Vous n&apos;avez encore aucun accès actif. Entrez le code d&apos;un ouvrier pour lui envoyer une demande, ou partagez votre propre code.
            </p>
          </div>

          {sent && (
            <div className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-success)]">
              Demande envoyée ! L’ouvrier doit maintenant l’accepter dans ses paramètres.
            </div>
          )}

          {/* Mon code */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              Mon code unique
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Partagez ce code à vos ouvriers pour qu’ils puissent vous inviter.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {myInviteCode ? (
                <>
                  <span className="font-mono font-black text-2xl tracking-[0.3em] text-[var(--color-primary)] select-all">
                    {myInviteCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      copiedCode
                        ? "border-[var(--color-success)]/40 text-[var(--color-success)] bg-[var(--color-success)]/10"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40"
                    }`}
                  >
                    {copiedCode ? "✓ Copié" : "Copier"}
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => { setGenerating(true); await generateMyCode(); setGenerating(false); }}
                  disabled={generating}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {generating ? "Génération…" : "Générer mon code"}
                </button>
              )}
            </div>
          </div>

          {/* Chercher un ouvrier */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              Se connecter à un ouvrier
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Entrez le code de l’ouvrier pour lui envoyer une demande de connexion.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Code (ex. A1B2C3D4)"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  clearSearch();
                  setSendError(null);
                }}
                maxLength={8}
                className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm font-mono font-bold focus:border-[var(--color-primary)]/60 focus:outline-none transition-all placeholder:text-[var(--color-text-muted)] placeholder:font-sans"
              />
              <button
                type="submit"
                disabled={codeInput.trim().length < 4 || searching}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm font-bold hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 disabled:opacity-40 transition-all"
              >
                {searching ? "…" : "Chercher"}
              </button>
            </form>
            {searchError && (
              <p className="text-xs text-[var(--color-error)]">{searchError}</p>
            )}
            {searchResult && (
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-3 space-y-2">
                <p className="font-bold text-sm text-[var(--color-text)]">
                  {[searchResult.prenom, searchResult.nom].filter(Boolean).join(" ") || "Ouvrier"}
                </p>
                {sendError && <p className="text-xs text-[var(--color-error)]">{sendError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={sendLoading}
                    className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {sendLoading ? "Envoi…" : "Envoyer la demande"}
                  </button>
                  <button
                    onClick={() => { clearSearch(); setCodeInput(""); }}
                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs hover:text-[var(--color-text)] transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invitations reçues (ouvrier → patron) */}
          {pendingReceived.filter(inv => inv.initiated_by === 'owner').length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                Demandes reçues ({pendingReceived.filter(inv => inv.initiated_by === 'owner').length})
              </p>
              {pendingReceived.filter(inv => inv.initiated_by === 'owner').map((inv) => (
                <div key={inv.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-text)] truncate">
                      {inv.other_name ?? "Ouvrier"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Demande reçue · {new Date(inv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-success)]/20 border border-[var(--color-success)]/30 text-[var(--color-success)] text-xs font-bold hover:bg-[var(--color-success)]/30 disabled:opacity-50 transition-all"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => handleRefuse(inv.id)}
                      disabled={actionLoading === inv.id}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-bold hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 disabled:opacity-50 transition-all"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invitations envoyées (patron → ouvrier) en attente */}
          {[...pendingSent, ...pendingReceived.filter(inv => inv.initiated_by === 'patron')].length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                En attente de réponse ({[...pendingSent, ...pendingReceived.filter(inv => inv.initiated_by === 'patron')].length})
              </p>
              {[...pendingSent, ...pendingReceived.filter(inv => inv.initiated_by === 'patron')].map((inv) => (
                <div key={inv.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-text)] truncate">
                      {inv.other_name ?? "Ouvrier"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Demande envoyée · {new Date(inv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(inv.id)}
                    disabled={actionLoading === inv.id}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-bold hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 disabled:opacity-50 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DarkModeProvider>
  );
}

interface PatronViewProps {
  user: User;
}

export function PatronView({ user }: PatronViewProps) {
  const { accesses, loading, refresh: refreshAccesses } = useEnrichedPatronAccesses();
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState<boolean>(false);

  // Sélection automatique si un seul accès (met à jour le contexte RLS)
  useEffect(() => {
    if (loading) return;
    if (accesses.length === 1) {
      // Toujours synchroniser le contexte RLS même pour un seul accès
      supabase.rpc("switch_patron_context", { p_invitation_id: accesses[0].profileId })
        .then(({ error }) => {
          if (error) console.error("[PatronView] switch_patron_context (auto):", error);
        });
      setSelectedAccessId(accesses[0].profileId);
    } else if (accesses.length > 1) {
      setShowSelector(true);
    }
  }, [accesses, loading]);

  const handleSelect = useCallback(async (profileId: string) => {
    // Met à jour profiles.owner_id / patron_id → le RLS lit ces colonnes
    const { error } = await supabase.rpc("switch_patron_context", { p_invitation_id: profileId });
    if (error) console.error("[PatronView] switch_patron_context:", error);
    setSelectedAccessId(profileId);
    setShowSelector(false);
  }, []);

  const handleSwitchOwner = useCallback(() => {
    setShowSelector(true);
    setSelectedAccessId(null);
  }, []);

  const selectedAccess = accesses.find((a) => a.profileId === selectedAccessId) ?? null;

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-xl">
            <span className="text-xl">⏱</span>
          </div>
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    );
  }

  // Aucun accès actif → écran d'onboarding
  if (!loading && accesses.length === 0) {
    return <PatronOnboarding />;
  }

  // Sélecteur d'ouvrier
  if (showSelector || !selectedAccess) {
    return (
      <DarkModeProvider>
        <PatronSelectorModal
          owners={accesses.map((a) => ({
            profileId: a.profileId,
            ownerName: a.ownerName,
            patronNom: a.patronNom,
          }))}
          onSelect={handleSelect}
        />
      </DarkModeProvider>
    );
  }

  // Vue principale
  return (
    <DarkModeProvider>
      <LabelsContext.Provider value={getLabels(null)}>
        <PermissionsContext.Provider value={{
          isViewer: false,
          viewerPatronId: selectedAccess.patronId,
          isAdmin: false,
          isPro: false,
          canBilanMois: true,
          canBilanAnnee: true,
          canExportPDF: false,
          canExportExcel: false,
          canExportCSV: false,
          canKilometrage: false,
          canAgenda: selectedAccess.access_agenda,
          canFacture: false,
          canDashboard: selectedAccess.access_dashboard,
        }}>
          <PatronViewInner
            access={selectedAccess}
            user={user}
            onSwitchOwner={handleSwitchOwner}
            hasMultipleOwners={accesses.length > 1}
            onAccessChange={refreshAccesses}
          />
        </PermissionsContext.Provider>
      </LabelsContext.Provider>
    </DarkModeProvider>
  );
}

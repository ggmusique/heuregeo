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
import { PeriodModal } from "../common/bilan/PeriodModal";
import { CustomAlert } from "../common/CustomAlert";
import { PatronSelectorModal, useEnrichedPatronAccesses } from "../patron/PatronSelectorModal";

import { DarkModeProvider } from "../../contexts/DarkModeContext";
import { LabelsContext } from "../../contexts/LabelsContext";
import { PermissionsContext } from "../../contexts/PermissionsContext";
import { getLabels } from "../../utils/labels";

import type { User } from "@supabase/supabase-js";
import type { EnrichedAccess } from "../patron/PatronSelectorModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatronTab = "bilan" | "agenda";

interface PatronViewInnerProps {
  access: EnrichedAccess;
  user: User;
  onSwitchOwner: () => void;
  hasMultipleOwners: boolean;
}

// ─── Sous-composant : vue après sélection de l'ouvrier ───────────────────────

function PatronViewInner({
  access,
  user,
  onSwitchOwner,
  hasMultipleOwners,
}: PatronViewInnerProps) {
  const [activeTab, setActiveTab] = useState<PatronTab>("bilan");
  const { triggerAlert, customAlert, dismissAlert } = useAppUI();
  const { confirmState: _cs, showConfirm, hideConfirm: _hc } = useConfirm();

  // ── Données (filtrées par RLS) ───────────────────────────────────────────
  const {
    missions,
    getMissionsByWeek,
    getMissionsByPeriod,
  } = useMissions(triggerAlert);

  const { fraisDivers, getFraisByWeek, getTotalFrais } = useFrais(triggerAlert);

  const {
    listeAcomptes,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua,
    fetchAcomptes,
  } = useAcomptes(missions, fraisDivers, triggerAlert);

  // Patron courant (pour l'affichage dans useBilan)
  const [patronNom, setPatronNom] = useState<string>(access.patronNom || "Patron");

  useEffect(() => {
    // Charger le nom du patron depuis la table patrons si pas encore connu
    if (access.patronNom) { setPatronNom(access.patronNom); return; }
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
    canExportPDF: false,
    canExportExcel: false,
    canExportCSV: false,
    canKilometrage: false,
    canAgenda: access.access_agenda,
    canFacture: false,
    canDashboard: access.access_dashboard,
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const navItems: { id: PatronTab; label: string; icon: string }[] = [
    { id: "bilan", label: "Bilan", icon: "📊" },
    ...(access.access_agenda ? [{ id: "agenda" as PatronTab, label: "Agenda", icon: "📅" }] : []),
  ];

  return (
    <LabelsContext.Provider value={labels}>
      <PermissionsContext.Provider value={permissions}>
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={dismissAlert} />

          {/* En-tête patron */}
          <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl px-4 py-3">
            <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                  <span className="text-base">⏱</span>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                    HeurGeo
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[160px]">
                    {access.ownerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasMultipleOwners && (
                  <button
                    onClick={onSwitchOwner}
                    title="Changer d'employeur"
                    className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-xs"
                  >
                    👥
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
          </header>

          {/* Contenu principal */}
          <main className="relative px-4 pt-4 pb-28 max-w-2xl mx-auto">
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
                  canExportPDF={false}
                  canExportExcel={false}
                  canExportCSV={false}
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
          </main>

          {/* Barre de navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xl">
            <div className="flex max-w-2xl mx-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={
                    "flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all " +
                    (activeTab === item.id
                      ? "text-indigo-400"
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
      </PermissionsContext.Provider>
    </LabelsContext.Provider>
  );
}

// ─── Composant racine PatronView ──────────────────────────────────────────────

interface PatronViewProps {
  user: User;
}

export function PatronView({ user }: PatronViewProps) {
  const { accesses, loading } = useEnrichedPatronAccesses();
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState<boolean>(false);

  // Sélection automatique si un seul accès
  useEffect(() => {
    if (loading) return;
    if (accesses.length === 1) {
      setSelectedAccessId(accesses[0].profileId);
    } else if (accesses.length > 1) {
      setShowSelector(true);
    }
  }, [accesses, loading]);

  const handleSelect = useCallback((profileId: string) => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
            <span className="text-xl">⏱</span>
          </div>
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Aucun accès actif
  if (!loading && accesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-100 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-black tracking-tight">Aucun accès actif</h1>
          <p className="text-slate-400 text-sm">
            Votre accès est en attente de validation ou a été révoqué.<br />
            Contactez votre employeur.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 px-6 py-2 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-red-500/60 transition-colors text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
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
      <PatronViewInner
        access={selectedAccess}
        user={user}
        onSwitchOwner={handleSwitchOwner}
        hasMultipleOwners={accesses.length > 1}
      />
    </DarkModeProvider>
  );
}

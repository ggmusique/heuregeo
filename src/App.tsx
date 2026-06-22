declare const __APP_VERSION__: string;

import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { User } from "@supabase/supabase-js";

import { useClients } from "./hooks/useClients";
import { useMissions } from "./hooks/useMissions";
import { useFrais } from "./hooks/useFrais";
import { useAcomptes } from "./hooks/useAcomptes";
import { usePatrons } from "./hooks/usePatrons";
import { useBilan } from "./hooks/useBilan";
import { useConfirm } from "./hooks/useConfirm";
import { useGeolocation } from "./hooks/useGeolocation";
import { useLieux } from "./hooks/useLieux";
import { useProfile } from "./hooks/useProfile";

import { useKmDomicile } from "./hooks/useKmDomicile";
import { useHistorique } from "./hooks/useHistorique";
import { useMissionForm } from "./hooks/useMissionForm";
import { useLieuModal } from "./hooks/useLieuModal";
import { useFraisModal } from "./hooks/useFraisModal";
import { usePatronModal } from "./hooks/usePatronModal";
import { useClientModal } from "./hooks/useClientModal";
import { useAcompteModal } from "./hooks/useAcompteModal";
import { useAgenda } from "./hooks/useAgenda";
import { useAgendaModal } from "./hooks/useAgendaModal";
import { useNavigation } from "./hooks/useNavigation";
import type { NavItem } from "./hooks/useNavigation";
import { useBilanFilters } from "./hooks/useBilanFilters";

import { CustomAlert } from "./components/common/CustomAlert";
import { UpdatePrompt } from "./components/common/UpdatePrompt";
import { ProfileCompletionGate } from "./components/auth/ProfileCompletionGate";
import { AppHeader } from "./components/layout/AppHeader";
import { AppNavBar } from "./components/layout/AppNavBar";
import { NavDrawer } from "./components/layout/NavDrawer";
import { AppModals } from "./components/AppModals";
import { PatronView } from "./components/views/PatronView";

const LazyAgendaPage = lazy(() => import("./components/agenda/AgendaPage").then(m => ({ default: m.AgendaPage })));
const LazyVueSuivi = lazy(() => import("./components/views/VueSuivi").then(m => ({ default: m.VueSuivi })));
const LazyVueDashboard = lazy(() => import("./components/views/VueDashboard").then(m => ({ default: m.VueDashboard })));
const LazyVueSaisie = lazy(() => import("./components/views/VueSaisie").then(m => ({ default: m.VueSaisie })));
const LazyParametresTab = lazy(() => import("./pages/ParametresTab").then(m => ({ default: m.ParametresTab })));
const LazySystemHealthPage = lazy(() => import("./pages/SystemHealthPage").then(m => ({ default: m.SystemHealthPage })));

import { DarkModeProvider } from "./contexts/DarkModeContext";
import { useAppUI } from "./hooks/useAppUI";
import { useAppProps } from "./hooks/useAppProps";
import { PermissionsContext } from "./contexts/PermissionsContext";
import { LabelsContext } from "./contexts/LabelsContext";
import { getLabels } from "./utils/labels";
import type { AlertState, TabId } from "./types/ui";
import type { UserProfile } from "./types/profile";

import "./inputs.css";

interface AppProps {
  user?: User;
}

export default function App({ user }: AppProps) {
  return (
    <DarkModeProvider>
      <AppContent user={user} />
    </DarkModeProvider>
  );
}

function AppContent({ user }: AppProps) {
  const { darkMode, liveTime, isIOS, loading, setLoading, triggerAlert, customAlert, dismissAlert } = useAppUI();

  const APP_VERSION = __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || "";

  const { profile, loading: profileLoading, saving: profileSaving, saveProfile, isProfileComplete, viewerPatronId, isAdmin, contract, isPro, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canKilometrage, canFacture } = useProfile(user);
  const { activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems } = useNavigation(profile);

  const labels = getLabels(profile);

  const permissions = {
    contract,
    isViewer, viewerPatronId, isAdmin, isPro,
    canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV,
    canKilometrage, canAgenda, canFacture, canDashboard,
  };

  if (user && !profileLoading && !isViewer && profile?.role !== "patron" && profile?.role !== "viewer" && !isProfileComplete) {
    return <ProfileCompletionGate profile={profile} saving={profileSaving} onSave={saveProfile}><></></ProfileCompletionGate>;
  }

  // Rôle "patron" : vue dédiée en lecture seule (RLS filtre les données)
  if (user && !profileLoading && profile?.role === "patron") {
    return <PatronView user={user} />;
  }

  return (
    <LabelsContext.Provider value={labels}>
      <PermissionsContext.Provider value={permissions}>
        <AppInner
          user={user}
          profile={profile}
          profileSaving={profileSaving}
          saveProfile={saveProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canAgenda={canAgenda}
          canDashboard={canDashboard}
          isViewer={isViewer}
          proNavItems={proNavItems}
          viewerPatronId={viewerPatronId}
          isPro={isPro}
          darkMode={darkMode}
          liveTime={liveTime}
          isIOS={isIOS}
          loading={loading}
          setLoading={setLoading}
          triggerAlert={triggerAlert}
          customAlert={customAlert}
          dismissAlert={dismissAlert}
          APP_VERSION={APP_VERSION}
        />
      </PermissionsContext.Provider>
    </LabelsContext.Provider>
  );
}

interface AppInnerProps {
  user?: User;
  profile: UserProfile | null;
  profileSaving: boolean;
  saveProfile: (data: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  canAgenda: boolean;
  canDashboard: boolean;
  isViewer: boolean;
  proNavItems: NavItem[];
  viewerPatronId: string | null;
  isPro: boolean;
  darkMode: boolean;
  liveTime: string;
  isIOS: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  triggerAlert: (msg: string) => void;
  customAlert: AlertState;
  dismissAlert: () => void;
  APP_VERSION: string;
}

function AppInner({
  user, profile, profileSaving, saveProfile,
  activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems, viewerPatronId, isPro,
  darkMode, liveTime, isIOS, loading, setLoading, triggerAlert, customAlert, dismissAlert,
  APP_VERSION,
}: AppInnerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMissionRateEditor, setShowMissionRateEditor] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("showMissionRateEditor") !== "false";
  });
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  const { missions, loading: missionsLoading, fetchMissions, createMission, updateMission, deleteMission, bulkCreateMissions, getMissionsByWeek, getMissionsByPeriod } = useMissions(triggerAlert);
  const { lieux, loading: lieuxLoading, fetchLieux, createLieu, updateLieu, deleteLieu } = useLieux(triggerAlert);
  const { fraisDivers, loading: fraisLoading, fetchFrais, createFrais, updateFrais, deleteFrais, getFraisByWeek, getTotalFrais } = useFrais(triggerAlert);
  const { listeAcomptes, loading: acomptesLoading, fetchAcomptes, createAcompte, deleteAcompte, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua } = useAcomptes(missions, fraisDivers, triggerAlert);
  const { patrons, loading: patronsLoading, createPatron, updatePatron, deletePatron, getPatronNom, getPatronColor } = usePatrons(triggerAlert);
  const { clients, loading: clientsLoading, createClient, updateClient, deleteClient } = useClients(triggerAlert);
  const { loading: gpsLoading } = useGeolocation(
    (address) => triggerAlert("Position chargee : " + address.substring(0, 45) + "..."),
    (error) => triggerAlert(error)
  );

  const { kmSettings, domicileLatLng, currentWeek, missionsThisWeek, kmFraisThisWeek, handleRecalculerKmSemaine } = useKmDomicile({ profile, saveProfile, lieux, getMissionsByWeek });

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
    kmSettings,
    domicileLatLng,
    lieux,
    profileFeatures: profile?.features ?? null,
    isViewer,
  });
  const { repairBilansDB } = bilan;

  const missionForm = useMissionForm({ createMission, updateMission, deleteMission, missions, setLoading, triggerAlert, showConfirm, setActiveTab });

  const lieuModal = useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated: missionForm.onLieuCreated });

  const historiqueHook = useHistorique({ fetchHistoriqueBilans: bilan.fetchHistoriqueBilans, triggerAlert });

  const { bilanPatronId, setBilanPatronId, bilanClientId, setBilanClientId, showImportModal, setShowImportModal, marquerCommePaye } = useBilanFilters({ showConfirm, bilan });

  const acompteModal = useAcompteModal({ createAcompte, fetchAcomptes, setLoading, triggerAlert, bilanPatronId, chargerHistorique: historiqueHook.chargerHistorique, bilan });

  const fraisModal = useFraisModal({ createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm });
  const patronModal = usePatronModal({ createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm });
  const clientModal = useClientModal({ createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm });

  const agendaHook  = useAgenda({ userId: user?.id ?? null, triggerAlert });
  const agendaModal = useAgendaModal({ createEvent: agendaHook.createEvent, updateEvent: agendaHook.updateEvent, deleteEvent: agendaHook.deleteEvent, triggerAlert });

  // Refresh AgendaPage data when the agenda modal closes (after CRUD operations)
  const [agendaRefreshKey, setAgendaRefreshKey] = useState<number>(0);
  const prevShowAgendaModal = useRef<boolean>(false);
  useEffect(() => {
    if (prevShowAgendaModal.current && !agendaModal.showAgendaModal) {
      setAgendaRefreshKey((k) => k + 1);
    }
    prevShowAgendaModal.current = agendaModal.showAgendaModal;
  }, [agendaModal.showAgendaModal]);

  useEffect(() => {
    document.title = "Tracko";
    const idle = typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 0);
    idle(() => {
      fetchMissions();
      fetchFrais();
      fetchAcomptes();
      fetchLieux();
    });
  }, [fetchMissions, fetchFrais, fetchAcomptes, fetchLieux]);

  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("showMissionRateEditor", showMissionRateEditor ? "true" : "false");
    }
  }, [showMissionRateEditor]);

  useEffect(() => {
    if (isViewer) historiqueHook.setSuiviDefaultView("bilan");
  }, [isViewer]);

  useEffect(() => {
    if (isViewer && viewerPatronId) {
      setBilanPatronId(viewerPatronId);
    }
  }, [isViewer, viewerPatronId]);

  useEffect(() => {
    if (canAgenda && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [canAgenda]);

  const isLoading = loading || missionsLoading || fraisLoading || acomptesLoading || patronsLoading || clientsLoading || lieuxLoading || gpsLoading || historiqueHook.loadingHistorique || agendaHook.loading;

  const { saisieProps, dashboardProps, suiviProps, modalsProps } = useAppProps({
    missionForm, lieuModal, fraisModal, acompteModal, patronModal, clientModal,
    bilan, bilanPatronId, setBilanPatronId, bilanClientId, setBilanClientId,
    historiqueHook, agendaHook, agendaModal,
    kmSettings, domicileLatLng, currentWeek, missionsThisWeek, kmFraisThisWeek,
    marquerCommePaye, getPatronNom, getPatronColor,
    setActiveTab, setShowImportModal, showImportModal, bulkCreateMissions,
    confirmState, hideConfirm,
    isViewer, viewerPatronId,
    lieux, patrons, clients, missions, fraisDivers, listeAcomptes,
    profile, saveProfile, loading, isIOS, showMissionRateEditor,
  });

  return (
    <div data-testid="app-shell" className={"min-h-screen relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300 " + (darkMode ? "dark" : "light")}>
      <div className="fixed inset-0 pointer-events-none">
        {darkMode && <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-800/10" />}
        <div className="absolute inset-0 backdrop-blur-modal" />
      </div>

      <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={dismissAlert} />
      <UpdatePrompt />

      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--color-primary)] border-t-transparent"></div>
        </div>
      )}

      <AppHeader profile={profile} isViewer={isViewer} isPro={isPro} liveTime={liveTime} APP_VERSION={APP_VERSION} onOpenMenu={() => setMenuOpen(true)} />

      <main className="relative px-5 -mt-10 pb-32 z-10">
        <Suspense fallback={null}>
          {activeTab === "saisie" && !isViewer && <LazyVueSaisie {...saisieProps} />}

          {activeTab === "dashboard" && canDashboard && <LazyVueDashboard {...dashboardProps} />}

          {activeTab === "suivi" && <LazyVueSuivi {...suiviProps} />}

          {activeTab === "agenda" && (
            <LazyAgendaPage
              userId={user?.id ?? null}
              triggerAlert={triggerAlert}
              onOpenForDate={agendaModal.openForDate}
              onEventEdit={agendaModal.handleEventEdit}
              onEventDelete={agendaModal.handleEventDelete}
              refreshKey={agendaRefreshKey}
            />
          )}

          {activeTab === "parametres" && !isViewer && (
            <LazyParametresTab
              profile={profile}
              profileSaving={profileSaving}
              saveProfile={saveProfile}
              userEmail={user?.email}
              patrons={patrons}
              clients={clients}
              lieux={lieux}
              missions={missions}
              fraisDivers={fraisDivers}
              acomptes={listeAcomptes}
              deleteAcompte={deleteAcompte}
              fetchAcomptes={fetchAcomptes}
              showConfirm={showConfirm}
              triggerAlert={triggerAlert}
              onPatronEdit={patronModal.handlePatronEdit}
              onPatronDelete={patronModal.handlePatronDelete}
              onPatronAdd={() => patronModal.openPatronModal()}
              onClientEdit={clientModal.handleClientEdit}
              onClientDelete={clientModal.handleClientDelete}
              onClientAdd={() => clientModal.openClientModal()}
              onLieuEdit={lieuModal.handleLieuEdit}
              onLieuDelete={lieuModal.handleLieuDelete}
              onLieuAdd={() => { lieuModal.openLieuModal(); }}
              showMissionRateEditor={showMissionRateEditor}
              onToggleMissionRateEditor={setShowMissionRateEditor}
              kmSettings={kmSettings}
              onRegeocoderLieu={lieuModal.handleRegeocoderLieu}
              domicileLatLng={domicileLatLng}
              missionsThisWeek={missionsThisWeek}
              kmFraisThisWeek={kmFraisThisWeek}
              onRegeocoderBatch={lieuModal.handleRegeocoderBatch}
              onRecalculerKmSemaine={handleRecalculerKmSemaine}
              onRebuildBilans={bilan.rebuildBilans}
              onRepairBilans={repairBilansDB}
              ownerProfile={profile}
              onMissionDelete={missionForm.handleMissionDelete}
            />
          )}

          {activeTab === "health" && <LazySystemHealthPage />}
        </Suspense>
      </main>

      <AppModals {...modalsProps} />

      <AppNavBar activeTab={activeTab} setActiveTab={setActiveTab} proNavItems={proNavItems} />

      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        proNavItems={proNavItems}
        isViewer={isViewer}
      />
    </div>
  );
}

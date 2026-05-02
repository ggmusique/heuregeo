declare const __APP_VERSION__: string;

import React, { useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";

import { ParametresTab } from "./pages/ParametresTab";

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
import { useBilanFilters } from "./hooks/useBilanFilters";

import { CustomAlert } from "./components/common/CustomAlert";
import { UpdatePrompt } from "./components/common/UpdatePrompt";
import { OnboardingForm } from "./components/auth/OnboardingForm";
import { AppHeader } from "./components/layout/AppHeader";
import { AppNavBar } from "./components/layout/AppNavBar";
import { AppModals } from "./components/AppModals";
import { VueAgenda } from "./components/views/VueAgenda";
import { VueSuivi } from "./components/views/VueSuivi";
import { VueDashboard } from "./components/views/VueDashboard";
import { VueSaisie } from "./components/views/VueSaisie";

import { DarkModeProvider } from "./contexts/DarkModeContext";
import { useAppUI } from "./hooks/useAppUI";
import { PermissionsContext } from "./contexts/PermissionsContext";
import { LabelsContext } from "./contexts/LabelsContext";
import { getLabels } from "./utils/labels";

import "./inputs.css";

interface AppProps {
  user: User;
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

  const { profile, loading: profileLoading, saving: profileSaving, saveProfile, isProfileComplete, viewerPatronId, isAdmin, isPro, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canKilometrage, canFacture } = useProfile(user);
  const { activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems } = useNavigation(profile);

  const labels = getLabels(profile);

  const permissions = {
    isViewer, viewerPatronId, isAdmin, isPro,
    canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV,
    canKilometrage, canAgenda, canFacture, canDashboard,
  };

  if (user && !profileLoading && !isViewer && !isProfileComplete) {
    return <OnboardingForm onSave={saveProfile} saving={profileSaving} />;
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
  user: User;
  profile: any;
  profileSaving: any;
  saveProfile: any;
  activeTab: any;
  setActiveTab: any;
  canAgenda: any;
  canDashboard: any;
  isViewer: any;
  proNavItems: any;
  viewerPatronId: any;
  isPro: any;
  darkMode: any;
  liveTime: any;
  isIOS: any;
  loading: any;
  setLoading: any;
  triggerAlert: any;
  customAlert: any;
  dismissAlert: any;
  APP_VERSION: string;
}

function AppInner({
  user, profile, profileSaving, saveProfile,
  activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems, viewerPatronId, isPro,
  darkMode, liveTime, isIOS, loading, setLoading, triggerAlert, customAlert, dismissAlert,
  APP_VERSION,
}: AppInnerProps) {
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

  const bilan = useBilan({ missions, fraisDivers, patrons, getMissionsByWeek, getMissionsByPeriod, getFraisByWeek, getTotalFrais, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua, triggerAlert, kmSettings, domicileLatLng, lieux });
  const { repairBilansDB } = bilan;

  const missionForm = useMissionForm({ createMission, updateMission, deleteMission, missions, setLoading, triggerAlert, showConfirm, setActiveTab });

  const lieuModal = useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated: missionForm.onLieuCreated });

  const historiqueHook = useHistorique({ fetchHistoriqueBilans: bilan.fetchHistoriqueBilans, triggerAlert });

  const { bilanPatronId, setBilanPatronId, bilanClientId, setBilanClientId, showImportModal, setShowImportModal, marquerCommePaye } = useBilanFilters({ showConfirm, bilan });

  const acompteModal = useAcompteModal({ createAcompte, fetchAcomptes, setLoading, triggerAlert, bilanPatronId, chargerHistorique: historiqueHook.chargerHistorique, bilan });

  const fraisModal = useFraisModal({ createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm });
  const patronModal = usePatronModal({ createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm });
  const clientModal = useClientModal({ createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm });

  const agendaHook  = useAgenda({ userId: user?.id, triggerAlert });
  const agendaModal = useAgendaModal({ createEvent: agendaHook.createEvent, updateEvent: agendaHook.updateEvent, deleteEvent: agendaHook.deleteEvent, triggerAlert });

  const agendaWorkedDays = useMemo(() => {
    const s = new Set();
    missions.forEach((m) => { if (m.date_iso) s.add(m.date_iso); });
    return s;
  }, [missions]);

  useEffect(() => {
    document.title = "Heures de Geo";
    fetchMissions();
    fetchFrais();
    fetchAcomptes();
    fetchLieux();
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

  const modalsProps = {
    confirmState, hideConfirm,
    fraisModal, loading, isIOS, patrons, clients, lieux,
    acompteModal,
    patronModal,
    clientModal,
    bilan, bilanPatronId, setBilanPatronId, bilanClientId, setBilanClientId,
    lieuModal,
    agendaModal,
    showImportModal, setShowImportModal, bulkCreateMissions,
  };

  const saisieProps = {
    editingMissionId: missionForm.editingMissionId,
    editingMissionData: missionForm.editingMissionData,
    selectedClientId: missionForm.selectedClientId,
    selectedLieuId: missionForm.selectedLieuId,
    selectedPatronId: missionForm.selectedPatronId,
    onMissionSubmit: missionForm.handleMissionSubmit,
    onMissionCancel: missionForm.resetMissionForm,
    onCopyLast: missionForm.copierDerniereMission,
    lieux,
    patrons,
    clients,
    missions,
    isIOS,
    loading,
    onLieuChange: (lieuId: any) => {
      missionForm.setSelectedLieuId(lieuId);
      if (missionForm.editingMissionId) {
        const selected = lieux.find((l: any) => String(l.id) === String(lieuId));
        missionForm.setEditingMissionData((prev: any) => ({ ...(prev || {}), lieu_id: lieuId, lieu: selected?.nom || prev?.lieu || "" }));
      }
    },
    onPatronChange: (patronId: any) => {
      missionForm.setSelectedPatronId(patronId);
      if (missionForm.editingMissionId) missionForm.setEditingMissionData((prev: any) => ({ ...(prev || {}), patron_id: patronId }));
    },
    onClientChange: (clientId: any) => {
      missionForm.setSelectedClientId(clientId);
      if (missionForm.editingMissionId) {
        const selected = clients.find((c: any) => c.id === clientId);
        missionForm.setEditingMissionData((prev: any) => ({ ...(prev || {}), client_id: clientId, client: selected?.nom || prev?.client || "" }));
      }
    },
    onShowLieuModal: () => { lieuModal.resetLieuForm(); lieuModal.setShowLieuModal(true); },
    onShowClientModal: () => { clientModal.resetClientForm(); clientModal.setShowClientModal(true); },
    onShowPatronModal: () => { patronModal.resetPatronForm(); patronModal.setShowPatronModal(true); },
    onShowFraisModal: () => fraisModal.setShowFraisModal(true),
    onShowAcompteModal: () => acompteModal.setShowAcompteModal(true),
    onShowImportModal: () => setShowImportModal(true),
    showMissionRateEditor,
  };

  const dashboardProps = {
    missions,
    fraisDivers,
    listeAcomptes,
    patrons,
    clients,
    lieux,
    profile,
    kmSettings,
    domicileLatLng,
  };

  const suiviProps = {
    defaultView: isViewer ? "bilan" : historiqueHook.suiviDefaultView,
    historiqueProps: {
      historique: historiqueHook.historique,
      historiquePatronId: historiqueHook.historiquePatronId,
      historiqueTab: historiqueHook.historiqueTab,
      loadingHistorique: historiqueHook.loadingHistorique,
      patrons,
      missions,
      listeAcomptes,
      onPatronFilterChange: (patronId: any) => { historiqueHook.setHistoriquePatronId(patronId); historiqueHook.chargerHistorique(patronId); },
      onTabChange: historiqueHook.setHistoriqueTab,
      onLoadHistorique: historiqueHook.chargerHistorique,
    },
    bilanProps: {
      bilan,
      bilanPatronId,
      currentWeek,
      missionsThisWeek,
      patrons,
      getPatronNom,
      getPatronColor,
      onMarquerCommePaye: marquerCommePaye,
      onFraisEdit: fraisModal.handleFraisEdit,
      onFraisDelete: fraisModal.handleFraisDelete,
      onMissionEdit: missionForm.handleMissionEdit,
      onMissionDelete: missionForm.handleMissionDelete,
      profile,
      saveProfile,
      kmSettings,
      kmFraisThisWeek,
      domicileLatLng,
      onRecalculerFraisKm: () => bilan.recalculerFraisKm(bilanPatronId),
    },
    onNavigateDashboard: () => setActiveTab("dashboard"),
  };

  const agendaProps = {
    events: agendaHook.events,
    loading: agendaHook.loading,
    currentYear: agendaHook.currentYear,
    currentMonth: agendaHook.currentMonth,
    currentWeekStart: agendaHook.currentWeekStart,
    workedDays: agendaWorkedDays,
    onGoToPrev: agendaHook.goToPrevMonth,
    onGoToNext: agendaHook.goToNextMonth,
    onGoToToday: agendaHook.goToToday,
    onGoToPrevWeek: agendaHook.goToPrevWeek,
    onGoToNextWeek: agendaHook.goToNextWeek,
    onOpenForDate: agendaModal.openForDate,
    onEventEdit: agendaModal.handleEventEdit,
  };

  return (
    <div className={"min-h-screen relative overflow-hidden transition-all duration-700 " + (darkMode ? "dark bg-[#020818] text-white" : "light bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900")}>
      <div className="fixed inset-0 pointer-events-none">
        {darkMode && <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-800/10" />}
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={dismissAlert} />
      <UpdatePrompt />

      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      )}

      <AppHeader profile={profile} isViewer={isViewer} isPro={isPro} liveTime={liveTime} APP_VERSION={APP_VERSION} />

      <main className="relative px-5 -mt-10 pb-32 z-10">
        {activeTab === "saisie" && <VueSaisie {...saisieProps} />}

        {activeTab === "dashboard" && canDashboard && <VueDashboard {...dashboardProps} />}

        {activeTab === "suivi" && <VueSuivi {...suiviProps} />}

        {activeTab === "agenda" && <VueAgenda {...agendaProps} />}

        {activeTab === "parametres" && !isViewer && (
          <ParametresTab
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
            onPatronAdd={() => { patronModal.resetPatronForm(); patronModal.setShowPatronModal(true); }}
            onClientEdit={clientModal.handleClientEdit}
            onClientDelete={clientModal.handleClientDelete}
            onClientAdd={() => { clientModal.resetClientForm(); clientModal.setShowClientModal(true); }}
            onLieuEdit={lieuModal.handleLieuEdit}
            onLieuDelete={lieuModal.handleLieuDelete}
            onLieuAdd={() => { lieuModal.resetLieuForm(); lieuModal.setShowLieuModal(true); }}
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
          />
        )}
      </main>

      <AppModals {...modalsProps} />

      <AppNavBar activeTab={activeTab} setActiveTab={setActiveTab} proNavItems={proNavItems} />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { SaisieTab } from "./pages/SaisieTab";
import { SuiviTab } from "./pages/SuiviTab";
import { ParametresTab } from "./pages/ParametresTab";
import { AgendaTab } from "./pages/AgendaTab";
import { DashboardPanel } from "./components/dashboard/DashboardPanel";

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

import { OnboardingForm } from "./components/auth/OnboardingForm";
import { CustomAlert } from "./components/common/CustomAlert";
import { UpdatePrompt } from "./components/common/UpdatePrompt";

import { AppHeader } from "./components/layout/AppHeader";
import { AppNavBar } from "./components/layout/AppNavBar";
import { AppModals } from "./components/layout/AppModals";

import { LabelsContext } from "./contexts/LabelsContext";
import { AppContext } from "./contexts/AppContext";
import { DataContext } from "./contexts/DataContext";
import { getLabels } from "./utils/labels";

import "./time-inputs-fix.css";
import "./fix-time-pickers-emergency.css";
import "./fix-selects.css";

export default function App({ user }) {
  const APP_CHANNEL = import.meta.env.VITE_APP_CHANNEL || "LOCAL";
  const APP_VERSION = __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || "";

  // ─── State local ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("saisie");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("darkMode");
    return saved === null ? true : saved !== "false";
  });
  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, message: "" });
  const [isIOS, setIsIOS] = useState(false);
  const [liveTime, setLiveTime] = useState("");
  const [showMissionRateEditor, setShowMissionRateEditor] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("showMissionRateEditor") !== "false";
  });
  const [bilanPatronId, setBilanPatronId] = useState(null);
  const [bilanClientId, setBilanClientId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const triggerAlert = useCallback((msg) => {
    setCustomAlert({ show: true, message: msg });
  }, []);

  // ─── Hooks de données ──────────────────────────────────────────
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

  const { profile, loading: profileLoading, saving: profileSaving, saveProfile, isProfileComplete, isViewer, viewerPatronId, isAdmin, isPro, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canKilometrage, canAgenda, canFacture, canDashboard } = useProfile(user);

  const labels = getLabels(profile);

  const { kmSettings, domicileLatLng, currentWeek, missionsThisWeek, kmFraisThisWeek, handleRecalculerKmSemaine } = useKmDomicile({ profile, saveProfile, lieux, getMissionsByWeek });

  const bilan = useBilan({ missions, fraisDivers, patrons, getMissionsByWeek, getMissionsByPeriod, getFraisByWeek, getTotalFrais, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua, triggerAlert, kmSettings, domicileLatLng, lieux });
  const { repairBilansDB } = bilan;

  const missionForm = useMissionForm({ createMission, updateMission, deleteMission, missions, setLoading, triggerAlert, showConfirm, setActiveTab });
  const lieuModal = useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated: missionForm.onLieuCreated });
  const historiqueHook = useHistorique({ fetchHistoriqueBilans: bilan.fetchHistoriqueBilans, triggerAlert });
  const acompteModal = useAcompteModal({ createAcompte, fetchAcomptes, setLoading, triggerAlert, bilanPatronId, chargerHistorique: historiqueHook.chargerHistorique, bilan });
  const fraisModal = useFraisModal({ createFrais, updateFrais, deleteFrais, setLoading, triggerAlert, showConfirm });
  const patronModal = usePatronModal({ createPatron, updatePatron, deletePatron, setLoading, triggerAlert, showConfirm });
  const clientModal = useClientModal({ createClient, updateClient, deleteClient, setLoading, triggerAlert, showConfirm });

  const agendaHook = useAgenda({ userId: user?.id, triggerAlert });
  const agendaModal = useAgendaModal({ createEvent: agendaHook.createEvent, updateEvent: agendaHook.updateEvent, deleteEvent: agendaHook.deleteEvent, triggerAlert });

  // ─── Valeurs dérivées ──────────────────────────────────────────
  const agendaWorkedDays = useMemo(() => {
    const s = new Set();
    missions.forEach((m) => { if (m.date_iso) s.add(m.date_iso); });
    return s;
  }, [missions]);

  const isLoading = loading || missionsLoading || fraisLoading || acomptesLoading || patronsLoading || clientsLoading || lieuxLoading || gpsLoading || historiqueHook.loadingHistorique || agendaHook.loading;

  const isProNavigationMode = isPro && !isViewer;

  const proNavItems = [
    { key: "saisie", label: "Saisie", icon: "📝", activeClass: "from-indigo-600 to-indigo-800" },
    ...(canDashboard && !isViewer ? [{ key: "dashboard", label: "Dashboard", icon: "📊", activeClass: "from-violet-600 to-indigo-700" }] : []),
    { key: "suivi", label: "Suivi", icon: "📈", activeClass: "from-cyan-600 to-indigo-700" },
    ...(canAgenda ? [{ key: "agenda", label: "Agenda", icon: "📅", activeClass: "from-emerald-600 to-teal-700" }] : []),
    { key: "parametres", label: "Parametres", icon: "⚙️", activeClass: "from-indigo-600 to-purple-700" },
  ];

  // ─── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    document.title = "Heures de Geo";
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    fetchMissions();
    fetchFrais();
    fetchAcomptes();
    fetchLieux();
  }, [fetchMissions, fetchFrais, fetchAcomptes, fetchLieux]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bilan.showPeriodModal) bilan.calculerPeriodesDisponibles();
  }, [bilan.showPeriodModal, bilan.bilanPeriodType, missions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("showMissionRateEditor", showMissionRateEditor ? "true" : "false");
    }
  }, [showMissionRateEditor]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("darkMode", darkMode ? "true" : "false");
    }
  }, [darkMode]);

  useEffect(() => {
    if (isViewer && !profileLoading) {
      setActiveTab("suivi");
      historiqueHook.setSuiviDefaultView("bilan");
    }
  }, [isViewer, profileLoading]);

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

  useEffect(() => {
    if (!canAgenda && activeTab === "agenda") setActiveTab("saisie");
  }, [canAgenda, activeTab]);

  useEffect(() => {
    if (!canDashboard && activeTab === "dashboard") {
      setActiveTab("suivi");
    }
  }, [canDashboard, activeTab]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleMarquerCommePaye = async () => {
    const confirmed = await showConfirm({ title: "Marquer comme paye", message: "Voulez-vous marquer ce bilan comme paye ?", confirmText: "Confirmer", cancelText: "Annuler", type: "info" });
    if (!confirmed) return;
    await bilan.marquerCommePaye(bilanPatronId);
  };

  // ─── Context values ────────────────────────────────────────────
  const appContextValue = useMemo(() => ({
    darkMode,
    setDarkMode,
    user,
    profile,
    isPro,
    isViewer,
    isAdmin,
    isProfileComplete,
    profileSaving,
    saveProfile,
    canBilanMois,
    canBilanAnnee,
    canExportPDF,
    canExportExcel,
    canExportCSV,
    canKilometrage,
    canAgenda,
    canFacture,
    canDashboard,
    triggerAlert,
    loading: isLoading,
    isIOS,
    showMissionRateEditor,
    setShowMissionRateEditor,
    liveTime,
    APP_VERSION,
    APP_CHANNEL,
  }), [
    darkMode, user, profile, isPro, isViewer, isAdmin, isProfileComplete,
    profileSaving, saveProfile, canBilanMois, canBilanAnnee, canExportPDF,
    canExportExcel, canExportCSV, canKilometrage, canAgenda, canFacture,
    canDashboard, triggerAlert, isLoading, isIOS, showMissionRateEditor,
    liveTime, APP_VERSION, APP_CHANNEL,
  ]);

  const dataContextValue = useMemo(() => ({
    missions,
    lieux,
    fraisDivers,
    listeAcomptes,
    patrons,
    clients,
    kmSettings,
    domicileLatLng,
    currentWeek,
    missionsThisWeek,
    kmFraisThisWeek,
    // CRUD
    createMission,
    updateMission,
    deleteMission,
    bulkCreateMissions,
    createLieu,
    updateLieu,
    deleteLieu,
    createFrais,
    updateFrais,
    deleteFrais,
    createAcompte,
    deleteAcompte,
    createPatron,
    updatePatron,
    deletePatron,
    createClient,
    updateClient,
    deleteClient,
    // Helpers
    getMissionsByWeek,
    getMissionsByPeriod,
    getFraisByWeek,
    getTotalFrais,
    getSoldeAvant,
    getAcomptesDansPeriode,
    getTotalAcomptesJusqua,
    getPatronNom,
    getPatronColor,
    fetchAcomptes,
    handleRecalculerKmSemaine,
  }), [
    missions, lieux, fraisDivers, listeAcomptes, patrons, clients,
    kmSettings, domicileLatLng, currentWeek, missionsThisWeek, kmFraisThisWeek,
    createMission, updateMission, deleteMission, bulkCreateMissions,
    createLieu, updateLieu, deleteLieu,
    createFrais, updateFrais, deleteFrais,
    createAcompte, deleteAcompte,
    createPatron, updatePatron, deletePatron,
    createClient, updateClient, deleteClient,
    getMissionsByWeek, getMissionsByPeriod, getFraisByWeek, getTotalFrais,
    getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua,
    getPatronNom, getPatronColor, fetchAcomptes, handleRecalculerKmSemaine,
  ]);

  // ─── Onboarding ────────────────────────────────────────────────
  if (user && !profileLoading && !isViewer && !isProfileComplete) {
    return <OnboardingForm onSave={saveProfile} saving={profileSaving} />;
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={appContextValue}>
    <DataContext.Provider value={dataContextValue}>
    <LabelsContext.Provider value={labels}>
    <div className={"min-h-screen relative overflow-hidden transition-all duration-700 " + (darkMode ? "dark bg-[#020818] text-white" : "light bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900")}>
      <div className="fixed inset-0 pointer-events-none">
        {darkMode && <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-800/10" />}
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={() => setCustomAlert((prev) => ({ ...prev, show: false }))} />
      <UpdatePrompt />

      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      )}

      <AppHeader />

      <main className="relative px-5 -mt-10 pb-32 z-10">
        {activeTab === "saisie" && (
          <SaisieTab
            editingMissionId={missionForm.editingMissionId}
            editingMissionData={missionForm.editingMissionData}
            selectedClientId={missionForm.selectedClientId}
            selectedLieuId={missionForm.selectedLieuId}
            selectedPatronId={missionForm.selectedPatronId}
            onMissionSubmit={missionForm.handleMissionSubmit}
            onMissionCancel={missionForm.resetMissionForm}
            onCopyLast={missionForm.copierDerniereMission}
            lieux={lieux}
            patrons={patrons}
            clients={clients}
            missions={missions}
            darkMode={darkMode}
            isIOS={isIOS}
            loading={loading}
            onLieuChange={(lieuId) => {
              missionForm.setSelectedLieuId(lieuId);
              if (missionForm.editingMissionId) {
                const selected = lieux.find((l) => String(l.id) === String(lieuId));
                missionForm.setEditingMissionData((prev) => ({ ...(prev || {}), lieu_id: lieuId, lieu: selected?.nom || prev?.lieu || "" }));
              }
            }}
            onPatronChange={(patronId) => {
              missionForm.setSelectedPatronId(patronId);
              if (missionForm.editingMissionId) missionForm.setEditingMissionData((prev) => ({ ...(prev || {}), patron_id: patronId }));
            }}
            onClientChange={(clientId) => {
              missionForm.setSelectedClientId(clientId);
              if (missionForm.editingMissionId) {
                const selected = clients.find((c) => c.id === clientId);
                missionForm.setEditingMissionData((prev) => ({ ...(prev || {}), client_id: clientId, client: selected?.nom || prev?.client || "" }));
              }
            }}
            onShowLieuModal={() => { lieuModal.resetLieuForm(); lieuModal.setShowLieuModal(true); }}
            onShowClientModal={() => { clientModal.resetClientForm(); clientModal.setShowClientModal(true); }}
            onShowPatronModal={() => { patronModal.resetPatronForm(); patronModal.setShowPatronModal(true); }}
            onShowFraisModal={() => fraisModal.setShowFraisModal(true)}
            onShowAcompteModal={() => acompteModal.setShowAcompteModal(true)}
            onShowImportModal={() => setShowImportModal(true)}
            showMissionRateEditor={showMissionRateEditor}
          />
        )}

        {activeTab === "dashboard" && canDashboard && (
          <DashboardPanel
            missions={missions}
            fraisDivers={fraisDivers}
            listeAcomptes={listeAcomptes}
            patrons={patrons}
            clients={clients}
            lieux={lieux}
            profile={profile}
            darkMode={darkMode}
            kmSettings={kmSettings}
            domicileLatLng={domicileLatLng}
          />
        )}

        {activeTab === "suivi" && (
          <SuiviTab
            defaultView={isViewer ? "bilan" : historiqueHook.suiviDefaultView}
            darkMode={darkMode}
            dashboardProps={{
              missions,
              fraisDivers,
              listeAcomptes,
              patrons,
              clients,
              lieux,
              profile,
              darkMode,
              kmSettings,
              domicileLatLng,
            }}
            historiqueProps={{
              historique: historiqueHook.historique,
              historiquePatronId: historiqueHook.historiquePatronId,
              historiqueTab: historiqueHook.historiqueTab,
              loadingHistorique: historiqueHook.loadingHistorique,
              darkMode,
              patrons,
              missions,
              listeAcomptes,
              onPatronFilterChange: (patronId) => { historiqueHook.setHistoriquePatronId(patronId); historiqueHook.chargerHistorique(patronId); },
              onTabChange: historiqueHook.setHistoriqueTab,
              onLoadHistorique: historiqueHook.chargerHistorique,
              isViewer,
              viewerPatronId,
            }}
            bilanProps={{
              bilan,
              bilanPatronId,
              currentWeek,
              missionsThisWeek,
              darkMode,
              patrons,
              getPatronNom,
              getPatronColor,
              onMarquerCommePaye: handleMarquerCommePaye,
              onFraisEdit: fraisModal.handleFraisEdit,
              onFraisDelete: fraisModal.handleFraisDelete,
              onMissionEdit: missionForm.handleMissionEdit,
              onMissionDelete: missionForm.handleMissionDelete,
              profile,
              isViewer,
              canBilanMois,
              canBilanAnnee,
              canExportPDF,
              canExportExcel,
              canExportCSV,
              canFacture,
              saveProfile,
              kmSettings,
              kmFraisThisWeek,
              domicileLatLng,
              onRecalculerFraisKm: () => bilan.recalculerFraisKm(bilanPatronId),
            }}
          />
        )}

        {activeTab === "agenda" && (
          <AgendaTab
            events={agendaHook.events}
            loading={agendaHook.loading}
            currentYear={agendaHook.currentYear}
            currentMonth={agendaHook.currentMonth}
            currentWeekStart={agendaHook.currentWeekStart}
            workedDays={agendaWorkedDays}
            onGoToPrev={agendaHook.goToPrevMonth}
            onGoToNext={agendaHook.goToNextMonth}
            onGoToToday={agendaHook.goToToday}
            onGoToPrevWeek={agendaHook.goToPrevWeek}
            onGoToNextWeek={agendaHook.goToNextWeek}
            onOpenForDate={agendaModal.openForDate}
            onEventEdit={agendaModal.handleEventEdit}
            darkMode={darkMode}
          />
        )}

        {activeTab === "parametres" && !isViewer && (
          <ParametresTab
            profile={profile}
            profileSaving={profileSaving}
            saveProfile={saveProfile}
            userEmail={user?.email}
            darkMode={darkMode}
            isAdmin={isAdmin}
            isPro={isPro}
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
            isViewer={isViewer}
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

      <AppModals
        confirmState={confirmState}
        hideConfirm={hideConfirm}
        fraisModal={fraisModal}
        acompteModal={acompteModal}
        patronModal={patronModal}
        clientModal={clientModal}
        lieuModal={lieuModal}
        agendaModal={agendaModal}
        bilan={bilan}
        bilanPatronId={bilanPatronId}
        bilanClientId={bilanClientId}
        setBilanClientId={setBilanClientId}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        isViewer={isViewer}
        canBilanMois={canBilanMois}
        canBilanAnnee={canBilanAnnee}
      />

      <AppNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        proNavItems={proNavItems}
      />
    </div>
    </LabelsContext.Provider>
    </DataContext.Provider>
    </AppContext.Provider>
  );
}

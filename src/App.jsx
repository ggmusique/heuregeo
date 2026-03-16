import React, { useState, useEffect, useCallback, useMemo } from "react";

import { SaisieTab } from "./pages/SaisieTab";
import { SuiviTab } from "./pages/SuiviTab";
import { ParametresTab } from "./pages/ParametresTab";
import { AgendaTab } from "./pages/AgendaTab";

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
import { useThemeProvider } from "./hooks/useTheme";

import { FraisModal } from "./components/common/frais/FraisModal";
import { AcompteModal } from "./components/common/acompte/AcompteModal";
import { PatronModal } from "./components/patron/PatronModal";
import { ClientModal } from "./components/client/ClientModal";
import { PeriodModal } from "./components/common/bilan/PeriodModal";
import { ConfirmModal } from "./components/common/ConfirmModal";
import { CustomAlert } from "./components/common/CustomAlert";
import { UpdatePrompt } from "./components/common/UpdatePrompt";
import { LieuModal } from "./components/lieu/LieuModal";
import { AgendaModal } from "./components/agenda/AgendaModal";
import { OnboardingForm } from "./components/auth/OnboardingForm";
import { ViewerBadge } from "./components/common/ViewerBadge";
import { ImportMissionsModal } from "./components/mission/ImportMissionsModal";

import { supabase } from "./services/supabase";
import { LabelsContext } from "./contexts/LabelsContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { getLabels } from "./utils/labels";

import "./time-inputs-fix.css";
import "./fix-time-pickers-emergency.css";
import "./fix-selects.css";

export default function App({ user }) {
  const APP_CHANNEL = import.meta.env.VITE_APP_CHANNEL || "LOCAL";
  const APP_VERSION = __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || "";

  // ─── THEME ──────────────────────────────────────────────────────────────────
  const themeProvider = useThemeProvider();
  const { theme, cycleTheme, isDark, themeConfig } = themeProvider;
  // darkMode conservé comme alias booléen pour compatibilité avec les composants
  // qui reçoivent encore darkMode en prop (migration progressive).
  const darkMode = isDark;
  // ────────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState("saisie");
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

  const { profile, loading: profileLoading, saving: profileSaving, saveProfile, isProfileComplete, isViewer, viewerPatronId, isAdmin, isPro, canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV, canKilometrage, canAgenda, canFacture } = useProfile(user);

  const labels = getLabels(profile);

  const { kmSettings, domicileLatLng, currentWeek, missionsThisWeek, kmFraisThisWeek, handleRecalculerKmSemaine } = useKmDomicile({ profile, saveProfile, lieux, getMissionsByWeek });

  const bilan = useBilan({ missions, fraisDivers, patrons, getMissionsByWeek, getMissionsByPeriod, getFraisByWeek, getTotalFrais, getSoldeAvant, getAcomptesDansPeriode, getTotalAcomptesJusqua, triggerAlert, kmSettings, domicileLatLng, lieux });

  const missionForm = useMissionForm({ createMission, updateMission, deleteMission, missions, setLoading, triggerAlert, showConfirm, setActiveTab });

  const lieuModal = useLieuModal({ createLieu, updateLieu, deleteLieu, fetchLieux, setLoading, triggerAlert, showConfirm, onLieuCreated: missionForm.onLieuCreated });

  const historiqueHook = useHistorique({ fetchHistoriqueBilans: bilan.fetchHistoriqueBilans, triggerAlert });

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

  const handleMarquerCommePaye = async () => {
    const confirmed = await showConfirm({ title: "Marquer comme paye", message: "Voulez-vous marquer ce bilan comme paye ?", confirmText: "Confirmer", cancelText: "Annuler", type: "info" });
    if (!confirmed) return;
    await bilan.marquerCommePaye(bilanPatronId);
  };

  const isProNavigationMode = isPro && !isViewer;

  const proNavItems = [
    { key: "saisie",     label: "Saisie",     icon: "📝", activeClass: "from-indigo-600 to-indigo-800" },
    { key: "suivi",      label: "Suivi",      icon: "📊", activeClass: "from-cyan-600 to-indigo-700" },
    ...(canAgenda ? [{ key: "agenda", label: "Agenda", icon: "📅", activeClass: "from-emerald-600 to-teal-700" }] : []),
    { key: "parametres", label: "Parametres", icon: "⚙️", activeClass: "from-indigo-600 to-purple-700" },
  ];

  const isLoading = loading || missionsLoading || fraisLoading || acomptesLoading || patronsLoading || clientsLoading || lieuxLoading || gpsLoading || historiqueHook.loadingHistorique || agendaHook.loading;

  if (user && !profileLoading && !isViewer && !isProfileComplete) {
    return <OnboardingForm onSave={saveProfile} saving={profileSaving} />;
  }

  return (
    <LabelsContext.Provider value={labels}>
    <ThemeContext.Provider value={themeProvider}>
    <div className={"min-h-screen relative overflow-hidden transition-all duration-700 " + (isDark ? "dark bg-[#020818] text-white" : "light " + themeConfig.bg)}>
      <div className="fixed inset-0 pointer-events-none">
        {themeConfig.overlay && <div className={"absolute inset-0 " + themeConfig.overlay} />}
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      <CustomAlert show={customAlert.show} message={customAlert.message || ""} onDismiss={() => setCustomAlert((prev) => ({ ...prev, show: false }))} />
      <UpdatePrompt />

      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      )}

      <header className={"relative p-6 pb-14 rounded-b-[60px] overflow-hidden shadow-2xl border-b " + themeConfig.accentBorder}>
        <div className={"absolute inset-0 backdrop-blur-xl " + themeConfig.headerBg} />
        <div className="relative z-10 text-center">
          {/* Bouton cycle thème : affiche l'icône du thème SUIVANT */}
          <button
            onClick={cycleTheme}
            className={"absolute right-6 top-6 w-12 h-12 backdrop-blur-xl rounded-full flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-all border " + (isDark ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-300")}
            title={"Changer de thème (actuel : " + themeConfig.label + ")"}
          >
            {themeConfig.icon}
          </button>
          <h1 className="relative text-[30px] font-black italic tracking-[0.1em] text-[#D4AF37] mb-2 drop-shadow-2xl font-['Playfair_Display']">
            {("HEURES DE " + (profile?.prenom?.trim()?.toUpperCase() || "GEO"))}
          </h1>
          {isViewer && <ViewerBadge patronNom={profile?.nom || ""} />}
          {isPro && !isViewer && (
            <div className="text-center py-1">
              <span className={"inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border " + (isDark ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400" : "bg-amber-50 border-amber-400/60 text-amber-600")}>
                ✨ Pro
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={"text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-0.5 rounded-full border " + themeConfig.accentBorder + " " + themeConfig.accent.replace("text-", "text-") + "/70"} >
              v{APP_VERSION} ✓ OTA
            </span>
          </div>
          <div className={"flex items-center justify-center gap-2 " + (isDark ? "text-white/90" : "text-slate-700")}>
            <span className="text-[17px] font-black tracking-tight">{liveTime}</span>
            <span className="text-[15px] font-medium opacity-80 lowercase">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
        </div>
      </header>

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

        {activeTab === "suivi" && (
          <SuiviTab
            defaultView={isViewer ? "bilan" : historiqueHook.suiviDefaultView}
            darkMode={darkMode}
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
          />
        )}
      </main>

      <ConfirmModal show={confirmState.show} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} cancelText={confirmState.cancelText} type={confirmState.type} onConfirm={confirmState.onConfirm} onCancel={hideConfirm} darkMode={darkMode} />

      <FraisModal show={fraisModal.showFraisModal} editMode={!!fraisModal.editingFraisId} description={fraisModal.fraisDescription} setDescription={fraisModal.setFraisDescription} montant={fraisModal.fraisMontant} setMontant={fraisModal.setFraisMontant} date={fraisModal.fraisDate} setDate={fraisModal.setFraisDate} onSubmit={fraisModal.handleFraisSubmit} onCancel={() => { fraisModal.setShowFraisModal(false); fraisModal.resetFraisForm(); }} loading={loading} darkMode={darkMode} isIOS={isIOS} patrons={patrons} selectedPatronId={fraisModal.fraisPatronId} onPatronChange={fraisModal.setFraisPatronId} />

      <AcompteModal show={acompteModal.showAcompteModal} montant={acompteModal.acompteMontant} setMontant={acompteModal.setAcompteMontant} date={acompteModal.acompteDate} setDate={acompteModal.setAcompteDate} onSubmit={acompteModal.handleAcompteSubmit} onCancel={() => { acompteModal.setShowAcompteModal(false); acompteModal.resetAcompteForm(); }} loading={loading || acompteModal.isSavingAcompte} darkMode={darkMode} isIOS={isIOS} patrons={patrons} selectedPatronId={acompteModal.acomptePatronId} onPatronChange={acompteModal.setAcomptePatronId} />

      <PatronModal show={patronModal.showPatronModal} editMode={!!patronModal.editingPatronId} initialData={patronModal.editingPatronData} onSubmit={patronModal.handlePatronSubmit} onCancel={() => { patronModal.setShowPatronModal(false); patronModal.resetPatronForm(); }} loading={loading} darkMode={darkMode} />

      <ClientModal show={clientModal.showClientModal} editMode={!!clientModal.editingClientId} initialData={clientModal.editingClientData} onSubmit={clientModal.handleClientSubmit} onCancel={() => { clientModal.setShowClientModal(false); clientModal.resetClientForm(); }} loading={loading} darkMode={darkMode} />

      <PeriodModal
        show={bilan.showPeriodModal} periodType={bilan.bilanPeriodType} setPeriodType={bilan.setBilanPeriodType}
        periodValue={bilan.bilanPeriodValue} setPeriodValue={bilan.setBilanPeriodValue} availablePeriods={bilan.availablePeriods}
        formatPeriodLabel={bilan.formatPeriodLabel} onConfirm={() => bilan.genererBilan(bilanPatronId, bilanClientId)}
        onCancel={() => { bilan.setShowPeriodModal(false); setBilanClientId(null); }}
        darkMode={darkMode} patrons={patrons} selectedPatronId={bilanPatronId} onPatronChange={(id) => !isViewer && setBilanPatronId(id)}
        clients={clients} selectedClientId={bilanClientId} onClientChange={setBilanClientId}
        isViewer={isViewer}
        canBilanMois={canBilanMois} canBilanAnnee={canBilanAnnee}
      />

      <LieuModal show={lieuModal.showLieuModal} editMode={!!lieuModal.editingLieuId} initialData={lieuModal.editingLieuData} onSubmit={lieuModal.handleLieuSubmit} onCancel={() => { lieuModal.setShowLieuModal(false); lieuModal.resetLieuForm(); }} loading={loading} darkMode={darkMode} />

      {agendaModal.showAgendaModal && (
        <AgendaModal
          show={agendaModal.showAgendaModal}
          editMode={!!agendaModal.editingEventId}
          initialData={agendaModal.editingEventData}
          selectedDate={agendaModal.selectedDate}
          onSubmit={agendaModal.handleEventSubmit}
          onCancel={() => { agendaModal.setShowAgendaModal(false); agendaModal.resetEventForm(); }}
          onDelete={() => agendaModal.handleEventDelete(agendaModal.editingEventId)}
          loading={loading}
          darkMode={darkMode}
        />
      )}

      <ImportMissionsModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={bulkCreateMissions}
        patrons={patrons}
        clients={clients}
        lieux={lieux}
        darkMode={darkMode}
      />

      <nav className="fixed bottom-6 left-6 right-6 z-[100]">
        {isProNavigationMode ? (
          <div className={"backdrop-blur-3xl border p-2 rounded-[35px] shadow-2xl flex gap-1 " + themeConfig.navBg + " " + themeConfig.navBorder}>
            {proNavItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    if (typeof item.onClick === "function") item.onClick();
                  }}
                  className={
                    "flex-1 rounded-[28px] font-black uppercase tracking-widest flex flex-col items-center justify-center py-2 text-[9px] gap-0.5 transition-all duration-200 " +
                    (isActive ? `bg-gradient-to-br ${item.activeClass} text-white shadow-lg` : themeConfig.navInactiveText)
                  }
                >
                  <span className="text-[14px] leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={"backdrop-blur-3xl border p-2 rounded-[35px] shadow-2xl flex gap-1 " + themeConfig.navBg + " " + themeConfig.navBorder}>
            {!isViewer && (
              <button onClick={() => setActiveTab("saisie")} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "saisie" ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white" : themeConfig.navInactiveText)}>Saisie</button>
            )}
            <button onClick={() => setActiveTab("suivi")} className={"flex-1 py-4 rounded-[28px] font-black uppercase text-[10px] tracking-widest " + (activeTab === "suivi" ? "bg-gradient-to-br from-cyan-600 to-indigo-700 text-white" : themeConfig.navInactiveText)}>Suivi</button>
            {!isViewer ? (
              <button onClick={() => setActiveTab("parametres")} className={"flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 " + (activeTab === "parametres" ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white" : themeConfig.navInactiveText)}>
                <span>Parametres</span>
              </button>
            ) : (
              <button onClick={() => supabase.auth.signOut()} className={"flex-1 py-3 rounded-[28px] font-black uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-0.5 " + themeConfig.navInactiveText}>
                <span>🚪</span>
              </button>
            )}
          </div>
        )}
      </nav>
    </div>
    </ThemeContext.Provider>
    </LabelsContext.Provider>
  );
}

import { useMemo } from "react";

import type { UseMissionFormReturn } from "./useMissionForm";
import type { UseLieuModalReturn } from "./useLieuModal";
import type { UseFraisModalReturn } from "./useFraisModal";
import type { UseAcompteModalReturn } from "./useAcompteModal";
import type { UsePatronModalReturn } from "./usePatronModal";
import type { UseClientModalReturn } from "./useClientModal";
import type { UseBilanReturn } from "./useBilanTypes";
import type { UseHistoriqueReturn } from "./useHistorique";
import type { UseAgendaReturn } from "./useAgenda";
import type { UseAgendaModalReturn } from "./useAgendaModal";
import type { ConfirmState } from "./useConfirm";
import type { KmSettings, KmFraisResult } from "./useKmDomicile";
import type { Mission, Patron, Client, Lieu, FraisDivers, Acompte } from "../types/entities";
import type { UserProfile } from "../types/profile";
import type { TabId } from "../types/ui";

// ─── Paramètres ──────────────────────────────────────────────────────────────

interface UseAppPropsParams {
  missionForm: UseMissionFormReturn;
  lieuModal: UseLieuModalReturn;
  fraisModal: UseFraisModalReturn;
  acompteModal: UseAcompteModalReturn;
  patronModal: UsePatronModalReturn;
  clientModal: UseClientModalReturn;
  bilan: UseBilanReturn;
  bilanPatronId: string | null;
  setBilanPatronId: (id: string | null) => void;
  bilanClientId: string | null;
  setBilanClientId: (id: string | null) => void;
  historiqueHook: UseHistoriqueReturn;
  agendaHook: UseAgendaReturn;
  agendaModal: UseAgendaModalReturn;
  kmSettings: KmSettings | null;
  domicileLatLng: { lat: number; lng: number } | null;
  currentWeek: number;
  missionsThisWeek: Mission[];
  kmFraisThisWeek: KmFraisResult;
  marquerCommePaye: () => Promise<void>;
  getPatronNom: (patronId: string | null | undefined) => string;
  getPatronColor: (patronId: string | null | undefined) => string;
  setActiveTab: (tab: TabId) => void;
  setShowImportModal: (show: boolean) => void;
  showImportModal: boolean;
  bulkCreateMissions: (validMissions: Partial<Mission>[]) => Promise<void>;
  confirmState: ConfirmState;
  hideConfirm: () => void;
  isViewer: boolean;
  viewerPatronId: string | null;
  lieux: Lieu[];
  patrons: Patron[];
  clients: Client[];
  missions: Mission[];
  fraisDivers: FraisDivers[];
  listeAcomptes: Acompte[];
  profile: UserProfile | null;
  saveProfile: (data: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>;
  loading: boolean;
  isIOS: boolean;
  showMissionRateEditor: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAppProps({
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
}: UseAppPropsParams) {
  const agendaWorkedDays = useMemo(() => {
    const s = new Set<string>();
    missions.forEach((m) => { if (m.date_iso) s.add(m.date_iso); });
    return s;
  }, [missions]);

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
    onLieuChange: (lieuId: string | null) => {
      missionForm.setSelectedLieuId(lieuId);
      if (missionForm.editingMissionId) {
        const selected = lieux.find((l: Lieu) => String(l.id) === String(lieuId));
        missionForm.setEditingMissionData((prev: Partial<Mission> | null) => ({ ...(prev || {}), lieu_id: lieuId, lieu: selected?.nom || prev?.lieu || "" }));
      }
    },
    onPatronChange: (patronId: string | null) => {
      missionForm.setSelectedPatronId(patronId);
      if (missionForm.editingMissionId) missionForm.setEditingMissionData((prev: Partial<Mission> | null) => ({ ...(prev || {}), patron_id: patronId }));
    },
    onClientChange: (clientId: string | null) => {
      missionForm.setSelectedClientId(clientId);
      if (missionForm.editingMissionId) {
        const selected = clients.find((c: Client) => c.id === clientId);
        missionForm.setEditingMissionData((prev: Partial<Mission> | null) => ({ ...(prev || {}), client_id: clientId, client: selected?.nom || prev?.client || "" }));
      }
    },
    onShowLieuModal: () => { lieuModal.openLieuModal(); },
    onShowClientModal: () => clientModal.openClientModal(),
    onShowPatronModal: () => patronModal.openPatronModal(),
    onShowFraisModal: () => fraisModal.openFraisModal(),
    onShowAcompteModal: () => acompteModal.openAcompteModal(),
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
      onPatronFilterChange: (patronId: string | null) => { historiqueHook.setHistoriquePatronId(patronId); historiqueHook.chargerHistorique(patronId); },
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

  return { saisieProps, dashboardProps, suiviProps, agendaProps, modalsProps };
}

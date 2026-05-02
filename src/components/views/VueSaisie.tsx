import React from "react";
import { SaisieTab } from "../../pages/SaisieTab";

interface Props {
  editingMissionId?: any;
  editingMissionData?: any;
  selectedClientId?: string | null;
  selectedLieuId?: string | null;
  selectedPatronId?: string | null;
  onMissionSubmit?: (data: any) => void;
  onMissionCancel?: () => void;
  onCopyLast?: () => void;
  lieux?: any[];
  patrons?: any[];
  clients?: any[];
  missions?: any[];
  isIOS?: boolean;
  loading?: boolean;
  onLieuChange?: (id: string | null) => void;
  onPatronChange?: (id: string | null) => void;
  onClientChange?: (id: string | null) => void;
  onShowLieuModal?: () => void;
  onShowClientModal?: () => void;
  onShowPatronModal?: () => void;
  onShowFraisModal?: () => void;
  onShowAcompteModal?: () => void;
  onShowImportModal?: () => void;
  showMissionRateEditor?: boolean;
}

export function VueSaisie({
  editingMissionId,
  editingMissionData,
  selectedClientId,
  selectedLieuId,
  selectedPatronId,
  onMissionSubmit,
  onMissionCancel,
  onCopyLast,
  lieux,
  patrons,
  clients,
  missions,
  isIOS,
  loading,
  onLieuChange,
  onPatronChange,
  onClientChange,
  onShowLieuModal,
  onShowClientModal,
  onShowPatronModal,
  onShowFraisModal,
  onShowAcompteModal,
  onShowImportModal,
  showMissionRateEditor,
}: Props) {
  return (
    <SaisieTab
      editingMissionId={editingMissionId}
      editingMissionData={editingMissionData}
      selectedClientId={selectedClientId}
      selectedLieuId={selectedLieuId}
      selectedPatronId={selectedPatronId}
      onMissionSubmit={onMissionSubmit}
      onMissionCancel={onMissionCancel}
      onCopyLast={onCopyLast}
      lieux={lieux}
      patrons={patrons}
      clients={clients}
      missions={missions}
      isIOS={isIOS}
      loading={loading}
      onLieuChange={onLieuChange}
      onPatronChange={onPatronChange}
      onClientChange={onClientChange}
      onShowLieuModal={onShowLieuModal}
      onShowClientModal={onShowClientModal}
      onShowPatronModal={onShowPatronModal}
      onShowFraisModal={onShowFraisModal}
      onShowAcompteModal={onShowAcompteModal}
      onShowImportModal={onShowImportModal}
      showMissionRateEditor={showMissionRateEditor}
    />
  );
}

import React from "react";
import { SaisieTab } from "../../pages/SaisieTab";

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
}) {
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

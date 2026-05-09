import React from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { usePermissions } from "../contexts/PermissionsContext";

import { FraisModal } from "./common/frais/FraisModal";
import { AcompteModal } from "./common/acompte/AcompteModal";
import { PatronModal } from "./patron/PatronModal";
import { ClientModal } from "./client/ClientModal";
import { PeriodModal } from "./common/bilan/PeriodModal";
import { ConfirmModal } from "./common/ConfirmModal";
import { LieuModal } from "./lieu/LieuModal";
import { AgendaModal } from "./agenda/AgendaModal";
import { ImportMissionsModal } from "./mission/ImportMissionsModal";

interface Props {
  confirmState: any;
  hideConfirm: any;
  fraisModal: any;
  loading: any;
  isIOS: any;
  patrons: any;
  clients: any;
  lieux: any;
  acompteModal: any;
  patronModal: any;
  clientModal: any;
  bilan: any;
  bilanPatronId: any;
  setBilanPatronId: any;
  bilanClientId: any;
  setBilanClientId: any;
  lieuModal: any;
  agendaModal: any;
  showImportModal: any;
  setShowImportModal: any;
  bulkCreateMissions: any;
}

export function AppModals({
  confirmState,
  hideConfirm,
  fraisModal,
  loading,
  isIOS,
  patrons,
  clients,
  lieux,
  acompteModal,
  patronModal,
  clientModal,
  bilan,
  bilanPatronId,
  setBilanPatronId,
  bilanClientId,
  setBilanClientId,
  lieuModal,
  agendaModal,
  showImportModal,
  setShowImportModal,
  bulkCreateMissions,
}: Props) {
  const { darkMode } = useDarkMode();
  const { isViewer, canBilanMois, canBilanAnnee } = usePermissions();

  return (
    <>
      <ConfirmModal
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirm}
        darkMode={darkMode}
      />

      <FraisModal
        show={fraisModal.showFraisModal}
        editMode={!!fraisModal.editingFraisId}
        description={fraisModal.fraisDescription}
        setDescription={fraisModal.setFraisDescription}
        montant={fraisModal.fraisMontant}
        setMontant={fraisModal.setFraisMontant}
        date={fraisModal.fraisDate}
        setDate={fraisModal.setFraisDate}
        onSubmit={fraisModal.handleFraisSubmit}
        onCancel={() => fraisModal.closeFraisModal()}
        loading={loading}
        darkMode={darkMode}
        isIOS={isIOS}
        patrons={patrons}
        selectedPatronId={fraisModal.fraisPatronId}
        onPatronChange={fraisModal.setFraisPatronId}
      />

      <AcompteModal
        show={acompteModal.showAcompteModal}
        montant={acompteModal.acompteMontant}
        setMontant={acompteModal.setAcompteMontant}
        date={acompteModal.acompteDate}
        setDate={acompteModal.setAcompteDate}
        onSubmit={acompteModal.handleAcompteSubmit}
        onCancel={() => acompteModal.closeAcompteModal()}
        loading={loading || acompteModal.isSavingAcompte}
        darkMode={darkMode}
        isIOS={isIOS}
        patrons={patrons}
        selectedPatronId={acompteModal.acomptePatronId}
        onPatronChange={acompteModal.setAcomptePatronId}
      />

      <PatronModal
        show={patronModal.showPatronModal}
        editMode={!!patronModal.editingPatronId}
        initialData={patronModal.editingPatronData}
        onSubmit={patronModal.handlePatronSubmit}
        onCancel={() => patronModal.closePatronModal()}
        loading={loading}
        darkMode={darkMode}
      />

      <ClientModal
        show={clientModal.showClientModal}
        editMode={!!clientModal.editingClientId}
        initialData={clientModal.editingClientData}
        onSubmit={clientModal.handleClientSubmit}
        onCancel={() => clientModal.closeClientModal()}
        loading={loading}
        darkMode={darkMode}
      />

      <PeriodModal
        show={bilan.showPeriodModal}
        periodType={bilan.bilanPeriodType}
        setPeriodType={bilan.setBilanPeriodType}
        periodValue={bilan.bilanPeriodValue}
        setPeriodValue={bilan.setBilanPeriodValue}
        availablePeriods={bilan.availablePeriods}
        formatPeriodLabel={bilan.formatPeriodLabel}
        onConfirm={() => bilan.genererBilan(bilanPatronId, bilanClientId)}
        onCancel={() => { bilan.setShowPeriodModal(false); setBilanClientId(null); }}
        darkMode={darkMode}
        patrons={patrons}
        selectedPatronId={bilanPatronId}
        onPatronChange={(id: any) => !isViewer && setBilanPatronId(id)}
        clients={clients}
        selectedClientId={bilanClientId}
        onClientChange={setBilanClientId}
        isViewer={isViewer}
        canBilanMois={canBilanMois}
        canBilanAnnee={canBilanAnnee}
      />

      <LieuModal
        show={lieuModal.showLieuModal}
        editMode={!!lieuModal.editingLieuId}
        initialData={lieuModal.editingLieuData}
        onSubmit={lieuModal.handleLieuSubmit}
        onCancel={() => { lieuModal.closeLieuModal(); }}
        loading={loading}
        darkMode={darkMode}
      />

      {agendaModal.showAgendaModal && (
        <AgendaModal
          show={agendaModal.showAgendaModal}
          editMode={!!agendaModal.editingEventId}
          initialData={agendaModal.editingEventData}
          selectedDate={agendaModal.selectedDate}
          onSubmit={agendaModal.handleEventSubmit}
          onCancel={() => agendaModal.closeAgendaModal()}
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
    </>
  );
}

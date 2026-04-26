import React from "react";
import { useApp } from "../../contexts/AppContext";
import { useData } from "../../contexts/DataContext";

import { FraisModal } from "../common/frais/FraisModal";
import { AcompteModal } from "../common/acompte/AcompteModal";
import { PatronModal } from "../patron/PatronModal";
import { ClientModal } from "../client/ClientModal";
import { PeriodModal } from "../common/bilan/PeriodModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { LieuModal } from "../lieu/LieuModal";
import { AgendaModal } from "../agenda/AgendaModal";
import { ImportMissionsModal } from "../mission/ImportMissionsModal";

/**
 * AppModals — Regroupe tous les modals de l'application.
 *
 * Extrait d'App.jsx pour alléger le composant racine.
 * Lit les données depuis les contexts AppContext et DataContext.
 */
export function AppModals({
  confirmState,
  hideConfirm,
  fraisModal,
  acompteModal,
  patronModal,
  clientModal,
  lieuModal,
  agendaModal,
  bilan,
  bilanPatronId,
  bilanClientId,
  setBilanClientId,
  showImportModal,
  setShowImportModal,
  isViewer,
  canBilanMois,
  canBilanAnnee,
}) {
  const { darkMode, isIOS, loading: appLoading } = useApp();
  const { patrons, clients, lieux, bulkCreateMissions } = useData();

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
        onCancel={() => {
          fraisModal.setShowFraisModal(false);
          fraisModal.resetFraisForm();
        }}
        loading={appLoading}
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
        onCancel={() => {
          acompteModal.setShowAcompteModal(false);
          acompteModal.resetAcompteForm();
        }}
        loading={appLoading || acompteModal.isSavingAcompte}
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
        onCancel={() => {
          patronModal.setShowPatronModal(false);
          patronModal.resetPatronForm();
        }}
        loading={appLoading}
        darkMode={darkMode}
      />

      <ClientModal
        show={clientModal.showClientModal}
        editMode={!!clientModal.editingClientId}
        initialData={clientModal.editingClientData}
        onSubmit={clientModal.handleClientSubmit}
        onCancel={() => {
          clientModal.setShowClientModal(false);
          clientModal.resetClientForm();
        }}
        loading={appLoading}
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
        onCancel={() => {
          bilan.setShowPeriodModal(false);
          setBilanClientId(null);
        }}
        darkMode={darkMode}
        patrons={patrons}
        selectedPatronId={bilanPatronId}
        onPatronChange={(id) => !isViewer && setBilanPatronId(id)}
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
        onCancel={() => {
          lieuModal.setShowLieuModal(false);
          lieuModal.resetLieuForm();
        }}
        loading={appLoading}
        darkMode={darkMode}
      />

      {agendaModal.showAgendaModal && (
        <AgendaModal
          show={agendaModal.showAgendaModal}
          editMode={!!agendaModal.editingEventId}
          initialData={agendaModal.editingEventData}
          selectedDate={agendaModal.selectedDate}
          onSubmit={agendaModal.handleEventSubmit}
          onCancel={() => {
            agendaModal.setShowAgendaModal(false);
            agendaModal.resetEventForm();
          }}
          onDelete={() =>
            agendaModal.handleEventDelete(agendaModal.editingEventId)
          }
          loading={appLoading}
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

import React from "react";
import { MissionForm } from "../components/mission/MissionForm";

/**
 * ✅ SaisieTab
 * Onglet pour saisir les missions et ajouter frais/acomptes
 */
export const SaisieTab = ({
  // État
  editingMissionId,
  editingMissionData,
  selectedClientId,
  selectedLieuId,
  selectedPatronId,
  loading,
  darkMode,
  isIOS,
  
  // Données
  lieux,
  patrons,
  clients,
  missions,
  
  // Handlers
  onMissionSubmit,
  onMissionCancel,
  onCopyLast,
  onLieuChange,
  onPatronChange,
  onClientChange,
  onShowPatronModal,
  onShowLieuModal,
  onShowClientModal,
  onShowFraisModal,
  onShowFraisKmModal,
  onShowAcompteModal,
  showMissionRateEditor = true,
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      <MissionForm
        editMode={!!editingMissionId}
        initialData={editingMissionData}
        lieux={lieux}
        selectedLieuId={selectedLieuId}
        onLieuChange={onLieuChange}
        onAddNewLieu={() => onShowLieuModal()}
        onSubmit={onMissionSubmit}
        onCancel={onMissionCancel}
        onCopyLast={onCopyLast}
        darkMode={darkMode}
        isIOS={isIOS}
        loading={loading}
        patrons={patrons}
        missions={missions}
        selectedPatronId={selectedPatronId}
        onPatronChange={onPatronChange}
        onAddNewPatron={() => onShowPatronModal()}
        clients={clients}
        selectedClientId={selectedClientId}
        onClientChange={onClientChange}
        onAddNewClient={() => onShowClientModal()}
        showRateEditorControl={showMissionRateEditor}
      />

      {/* Boutons rapides */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <button
          onClick={() => onShowFraisModal()}
          className="py-4 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all"
        >
          + Frais divers
        </button>
        <button
          onClick={() => onShowAcompteModal()}
          className="py-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all"
        >
          + Acompte
        </button>
        <button
          onClick={() => onShowFraisKmModal()}
          className="col-span-2 py-4 bg-teal-600/20 text-teal-300 border border-teal-500/30 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all"
        >
          🚗 + Frais kilométriques
        </button>
      </div>
    </div>
  );
};
import React from "react";
import { MissionForm } from "../components/mission/MissionForm";
import { useTheme } from "../contexts/ThemeContext";

export const SaisieTab = ({
  editingMissionId,
  editingMissionData,
  selectedClientId,
  selectedLieuId,
  selectedPatronId,
  loading,
  isIOS,
  lieux,
  patrons,
  clients,
  missions,
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
  onShowAcompteModal,
  onShowImportModal,
  showMissionRateEditor = true,
}) => {
  const { isDark } = useTheme();

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
      </div>

      {onShowImportModal && (
        <button
          onClick={onShowImportModal}
          className={`mt-3 w-full py-3 rounded-[25px] text-[11px] font-black uppercase active:scale-95 transition-all border ${
            isDark
              ? "bg-violet-600/15 text-violet-400 border-violet-500/30"
              : "bg-violet-50 text-violet-600 border-violet-200"
          }`}
        >
          📥 Importer CSV / Excel
        </button>
      )}
    </div>
  );
};

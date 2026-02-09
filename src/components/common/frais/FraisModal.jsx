import React from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";

/**
 * Modale de gestion des frais divers - Multi-Patrons
 */
export const FraisModal = ({
  show,
  editMode = false,
  description,
  setDescription,
  montant,
  setMontant,
  date,
  setDate,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
  isIOS = false,
  patrons = [], // NOUVEAU
  selectedPatronId = null, // NOUVEAU
  onPatronChange = () => {}, // NOUVEAU
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      <div
        className={`w-full max-w-sm p-8 rounded-[40px] border-2 ${
          darkMode
            ? "bg-[#121420] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        <h3 className="text-xl font-black uppercase mb-6 text-center italic">
          {editMode ? "Modifier le frais" : "Nouveau Frais"}
        </h3>

        {/* NOUVEAU : Sélecteur de patron */}
        <div className="mb-6">
          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={darkMode}
          />
        </div>

        <input
          placeholder="Description"
          className="w-full p-5 bg-black/20 rounded-2xl mb-4 text-white font-bold outline-none border border-white/5 backdrop-blur-md"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          type="number"
          placeholder="Montant (€)"
          className="w-full p-5 bg-black/20 rounded-2xl mb-8 text-white font-bold outline-none border border-white/5 backdrop-blur-md"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />

        <p className="text-[11px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
          Date du frais
        </p>
        <DateSelector
          dateMission={date}
          setDateMission={setDate}
          isIOS={isIOS}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black backdrop-blur-md"
          >
            ANNULER
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 py-4 bg-amber-600 rounded-2xl text-[10px] font-black text-white backdrop-blur-md disabled:opacity-50"
          >
            {editMode ? "MODIFIER" : "VALIDER"}
          </button>
        </div>
      </div>
    </div>
  );
};

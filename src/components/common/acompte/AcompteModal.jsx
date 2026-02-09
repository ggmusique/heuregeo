import React from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";

/**
 * Modale de gestion des acomptes - Multi-Patrons
 */
export const AcompteModal = ({
  show,
  montant,
  setMontant,
  date,
  setDate,
  onSubmit,
  onCancel,
  loading = false,
  isIOS = false,
  patrons = [], // NOUVEAU
  selectedPatronId = null, // NOUVEAU
  onPatronChange = () => {}, // NOUVEAU
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      <div className="w-full max-w-sm p-8 bg-[#121420] rounded-[40px] border-2 border-cyan-500/30 backdrop-blur-xl shadow-2xl">
        <h3 className="text-xl font-black uppercase mb-6 text-center italic text-cyan-400">
          Nouvel Acompte
        </h3>

        <div className="space-y-6">
          {/* NOUVEAU : Sélecteur de patron */}
          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={true}
          />

          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Montant reçu
            </p>
            <input
              type="number"
              placeholder="0.00 €"
              className="w-full p-6 bg-black/40 rounded-2xl text-white font-black outline-none border border-cyan-500/30 text-center text-3xl focus:border-cyan-400 transition-colors"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Date de réception
            </p>
            <DateSelector
              dateMission={date}
              setDateMission={setDate}
              isIOS={isIOS}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-white/60 hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl text-[10px] font-black text-white shadow-lg uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Valider"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

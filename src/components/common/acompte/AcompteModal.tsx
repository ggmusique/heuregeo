import React from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";
import { Patron } from "../../../types/entities";

interface AcompteModalProps {
  show: boolean;
  montant: string | number;
  setMontant: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  darkMode?: boolean;
  isIOS?: boolean;
  patrons?: Patron[];
  selectedPatronId?: string | null;
  onPatronChange?: (id: string | null) => void;
}

/**
 * ✅ AcompteModal = fenêtre "Nouvel Acompte"
 * Elle s'affiche quand show = true
 * Elle contient :
 * - un sélecteur de patron (obligatoire)
 * - un champ montant
 * - un sélecteur de date
 * - boutons Annuler / Valider
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
  darkMode = true,
  isIOS = false,
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
}: AcompteModalProps) => {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[500] flex items-center justify-center p-6 ${darkMode ? "bg-[#050510]/90" : "bg-black/40"} backdrop-blur-md`}>
      
      <div className={`w-full max-w-sm p-8 rounded-[40px] border-2 ${darkMode ? "bg-[#121420] border-cyan-500/30" : "bg-white border-cyan-400/50"} backdrop-blur-xl shadow-2xl`}>
        
        <h3 className="text-xl font-black uppercase mb-6 text-center italic text-cyan-400">
          Nouvel Acompte
        </h3>

        <div className="space-y-6">

          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={darkMode}
          />

          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Montant reçu
            </p>

            <input
              type="number"
              placeholder="0.00 €"
              className={`w-full p-6 rounded-2xl font-black outline-none border text-center text-3xl focus:border-cyan-400 transition-colors ${darkMode ? "bg-black/40 text-white border-cyan-500/30" : "bg-white text-slate-900 border-slate-200"}`}
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
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-colors ${darkMode ? "bg-white/5 text-white/60 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
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

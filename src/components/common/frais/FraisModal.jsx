import React, { useMemo } from "react";
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
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
}) => {
  if (!show) return null;

  // ✅ Normalisation / validation UI
  const descOk = (description || "").trim().length > 0;

  // Autorise "12,5" en plus de "12.5"
  const montantNum = useMemo(() => {
    const m = (montant ?? "").toString().replace(",", ".");
    const n = parseFloat(m);
    return Number.isFinite(n) ? n : NaN;
  }, [montant]);

  const montantOk = Number.isFinite(montantNum) && montantNum > 0;
  const patronOk = !!selectedPatronId;

  const canSubmit = descOk && montantOk && patronOk && !loading;

  // ✅ Message d'aide (optionnel mais super utile)
  const helper = !patronOk
    ? "Choisis un patron"
    : !descOk
    ? "Ajoute une description"
    : !montantOk
    ? "Montant invalide"
    : "";

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

        {/* ✅ Sélecteur de patron */}
        <div className="mb-6">
          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={darkMode}
          />
        </div>

        {/* ✅ Description */}
        <input
          placeholder="Description"
          className={`w-full p-5 rounded-2xl mb-2 font-bold outline-none border backdrop-blur-md transition-all ${
            darkMode
              ? "bg-black/20 text-white border-white/5"
              : "bg-slate-50 text-slate-900 border-slate-200"
          } ${!descOk ? "border-red-500/40" : ""}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {!descOk && (
          <p className="text-[10px] text-red-300 mb-3">Description obligatoire</p>
        )}

        {/* ✅ Montant */}
        <input
          type="text"
          inputMode="decimal"
          placeholder="Montant (€)"
          className={`w-full p-5 rounded-2xl mb-2 font-bold outline-none border backdrop-blur-md transition-all ${
            darkMode
              ? "bg-black/20 text-white border-white/5"
              : "bg-slate-50 text-slate-900 border-slate-200"
          } ${!montantOk ? "border-red-500/40" : ""}`}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
        {!montantOk && (
          <p className="text-[10px] text-red-300 mb-3">
            Montant obligatoire (doit être &gt; 0)
          </p>
        )}

        {/* ✅ Date */}
        <p className="text-[11px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
          Date du frais
        </p>
        <DateSelector
          dateMission={date}
          setDateMission={setDate}
          isIOS={isIOS}
        />

        {/* ✅ Mini hint global (facultatif) */}
        {helper && (
          <p className="mt-4 text-[10px] text-white/50">
            ⚠️ {helper}
          </p>
        )}

        {/* ✅ Boutons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black backdrop-blur-md"
          >
            ANNULER
          </button>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black text-white backdrop-blur-md transition-all ${
              canSubmit
                ? "bg-amber-600 active:scale-95"
                : "bg-gray-600/40 opacity-60 cursor-not-allowed"
            }`}
            title={!canSubmit ? "Complète les champs requis" : ""}
          >
            {loading ? "..." : editMode ? "MODIFIER" : "VALIDER"}
          </button>
        </div>
      </div>
    </div>
  );
};

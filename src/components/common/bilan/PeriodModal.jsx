import React from "react";

/**
 * Modale de sélection de période pour le bilan - Multi-Patrons
 */
export const PeriodModal = ({
  show,
  periodType,
  setPeriodType,
  periodValue,
  setPeriodValue,
  availablePeriods,
  formatPeriodLabel,
  onConfirm,
  onCancel,
  darkMode = true,
  patrons = [], // NOUVEAU
  selectedPatronId = null, // NOUVEAU
  onPatronChange = () => {}, // NOUVEAU
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-[#050510]/95 backdrop-blur-xl">
      <div
        className={`w-full max-w-sm p-8 rounded-[45px] border-2 ${
          darkMode
            ? "bg-[#0f111a] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        <h3 className="text-xl font-black uppercase mb-4 text-center tracking-tighter italic">
          Choisir la période
        </h3>

        {/* Sélecteur de type de période */}
        <div className="flex bg-black/20 rounded-2xl p-1 mb-6 backdrop-blur-md">
          <button
            onClick={() => setPeriodType("semaine")}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              periodType === "semaine"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-white/50 hover:bg-white/10"
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setPeriodType("mois")}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              periodType === "mois"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-white/50 hover:bg-white/10"
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setPeriodType("annee")}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              periodType === "annee"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-white/50 hover:bg-white/10"
            }`}
          >
            Année
          </button>
        </div>

        {/* Sélecteur de période */}
        <div className="mb-6">
          <label className="block text-[11px] font-black uppercase mb-3 text-indigo-300 tracking-[0.25em] opacity-80">
            {periodType === "semaine"
              ? "Choisir la semaine"
              : periodType === "mois"
              ? "Choisir le mois"
              : "Choisir l'année"}
          </label>
          <div className="relative">
            <select
              value={periodValue || ""}
              onChange={(e) => setPeriodValue(e.target.value)}
              className="w-full p-4 pl-5 pr-12 rounded-2xl font-black text-[13px] uppercase bg-[#1a1f2e] border-2 border-indigo-500/40 text-white appearance-none cursor-pointer focus:outline-none focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md"
            >
              <option value="" disabled>
                Sélectionner une période...
              </option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* NOUVEAU : Sélecteur de patron (optionnel) */}
        <div className="mb-8">
          <label className="block text-[11px] font-black uppercase mb-3 text-green-300 tracking-[0.25em] opacity-80">
            Filtrer par patron (optionnel)
          </label>
          <div className="relative">
            <select
              value={selectedPatronId || ""}
              onChange={(e) => {
                const value = e.target.value;
                // CORRECTION : Convertir chaîne vide en null
                onPatronChange(value === "" ? null : value);
              }}
              className="w-full p-4 pl-5 pr-12 rounded-2xl font-black text-[13px] uppercase bg-[#1a1f2e] border-2 border-green-500/40 text-white appearance-none cursor-pointer focus:outline-none focus:border-green-400 transition-all shadow-inner backdrop-blur-md"
            >
              <option value="">📊 Tous les patrons (Global)</option>
              {patrons.map((patron) => (
                <option key={patron.id} value={patron.id}>
                  {patron.nom}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-green-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <p className="text-[9px] opacity-50 mt-2 px-1">
            Laisser sur "Tous les patrons" pour un bilan consolidé
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 font-black uppercase text-[10px] opacity-60 hover:opacity-100 transition-opacity backdrop-blur-md"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!periodValue}
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${
              periodValue
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg active:scale-95"
                : "bg-gray-600/30 text-white/40 cursor-not-allowed"
            } backdrop-blur-md`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

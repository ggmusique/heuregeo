// components/common/bilan/BilanHeader.js
import React from "react";
import { formatEuro, formatHeures } from "../../../utils/formatters";

export const BilanHeader = ({
  bilanContent,
  bilanPeriodType,
  bilanPaye,
  onMarquerPaye,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  onExportCSVWithFrais,
  darkMode = true,
}) => {
  const hasFrais = bilanContent.fraisDivers?.length > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-6 md:p-8 rounded-[40px] shadow-2xl mb-8 border border-indigo-500/30 backdrop-blur-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-[11px] md:text-sm font-black uppercase text-white/60 tracking-widest mb-1">
            {bilanContent.titre || "Bilan"}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
            BILAN
          </h2>
          {bilanContent.selectedPatronNom !== "Tous les patrons (Global)" && (
            <p className="text-sm md:text-base text-indigo-300 mt-1">
              {bilanContent.selectedPatronNom}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center border border-white/10">
            <p className="text-[11px] md:text-sm font-black uppercase text-white/70 mb-1">
              Heures
            </p>
            <p className="text-2xl md:text-3xl font-black text-white">
              {formatHeures(bilanContent.totalH)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center border border-white/10">
            <p className="text-[11px] md:text-sm font-black uppercase text-white/70 mb-1">
              Total Net
            </p>
            <p className="text-2xl md:text-3xl font-black text-green-400">
              {formatEuro(bilanContent.totalE)}
            </p>
          </div>
        </div>
      </div>

      {/* Statut payé + bouton */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        {bilanPaye ? (
          <div className="bg-green-600/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-green-500/40 text-green-300 font-black uppercase text-sm">
            PAYÉ ✓
          </div>
        ) : (
          <button
            onClick={onMarquerPaye}
            className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 rounded-2xl font-black uppercase text-sm text-white shadow-lg active:scale-95 transition-all border border-green-400/50"
          >
            MARQUER COMME PAYÉ
          </button>
        )}

        {/* Boutons export */}
        <div className="flex flex-wrap gap-3 justify-center md:justify-end">
          <button
            onClick={onExportExcel}
            className="px-5 py-2.5 bg-green-600/30 hover:bg-green-600/50 rounded-xl text-sm font-black text-green-300 border border-green-500/40 transition-all active:scale-95"
          >
            Excel
          </button>
          <button
            onClick={onExportPDF}
            className="px-5 py-2.5 bg-red-600/30 hover:bg-red-600/50 rounded-xl text-sm font-black text-red-300 border border-red-500/40 transition-all active:scale-95"
          >
            PDF
          </button>
          <button
            onClick={onExportCSV}
            className="px-5 py-2.5 bg-blue-600/30 hover:bg-blue-600/50 rounded-xl text-sm font-black text-blue-300 border border-blue-500/40 transition-all active:scale-95"
          >
            CSV Missions
          </button>
          {hasFrais && bilanPeriodType === "semaine" && (
            <button
              onClick={onExportCSVWithFrais}
              className="px-5 py-2.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-xl text-sm font-black text-cyan-300 border border-cyan-500/40 transition-all active:scale-95"
            >
              CSV + Frais
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

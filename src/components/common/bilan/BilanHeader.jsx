// components/common/bilan/BilanHeader.js
import React from "react";

// Utilitaires pour afficher les nombres joliment
import { formatEuro, formatHeures } from "../../../utils/formatters";

/**
 * ============================
 * BilanHeader
 * ============================
 * 👉 Ce composant affiche l'EN-TÊTE du bilan :
 * - Titre (Semaine X / Mois / Année)
 * - Patron sélectionné (si pas global)
 * - 2 grosses cartes : Heures + Total Net
 * - Statut PAYÉ + bouton "Marquer comme payé"
 * - Boutons d'export (Excel / PDF / CSV...)
 *
 * ❌ Il ne fait aucun calcul métier
 * ✅ Il ne fait qu'AFFICHER et APPELER des callbacks
 */
export const BilanHeader = ({
  bilanContent,          // Objet résultat du bilan (calculé dans useBilan)
  bilanPeriodType,       // "semaine" | "mois" | "annee" (utile pour montrer CSV + Frais)
  bilanPaye,             // true/false : est-ce que ce bilan est déjà marqué payé ?
  onMarquerPaye,         // fonction à appeler quand on clique "MARQUER COMME PAYÉ"
  onExportExcel,         // export Excel
  onExportPDF,           // export PDF
  onExportCSV,           // export CSV des missions
  onExportCSVWithFrais,  // export CSV missions + frais (uniquement si semaine + frais)
  darkMode = true,       // pas utilisé ici (mais tu le gardes pour cohérence globale)
}) => {
  /**
   * hasFrais = booléen simple
   * 👉 Sert à décider si on doit afficher le bouton "CSV + Frais"
   */
  const hasFrais = bilanContent.fraisDivers?.length > 0;

  return (
    /**
     * Grand bloc "carte" du header (fond dégradé)
     */
    <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-6 md:p-8 rounded-[40px] shadow-2xl mb-8 border border-indigo-500/30 backdrop-blur-md">

      {/* ======================================================
          Ligne du haut :
          - à gauche : titre + label + patron
          - à droite : 2 cartes Heures + Total Net
         ====================================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

        {/* ----------- Bloc gauche : titre / sous-titre ----------- */}
        <div>
          {/* Titre de période (ex: "Semaine 6") */}
          <p className="text-[11px] md:text-sm font-black uppercase text-white/60 tracking-widest mb-1">
            {bilanContent.titre || "Bilan"}
          </p>

          {/* Gros titre fixe */}
          <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
            BILAN
          </h2>

          {/* Si un patron précis est choisi (pas Global), on l'affiche */}
          {bilanContent.selectedPatronNom !== "Tous les patrons (Global)" && (
            <p className="text-sm md:text-base text-indigo-300 mt-1">
              {bilanContent.selectedPatronNom}
            </p>
          )}
        </div>

        {/* ----------- Bloc droite : 2 cartes de stats ----------- */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">

          {/* Carte "Heures" */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center border border-white/10">
            <p className="text-[11px] md:text-sm font-black uppercase text-white/70 mb-1">
              Heures
            </p>
            <p className="text-2xl md:text-3xl font-black text-white">
              {/* formatHeures = transforme 8.5 en "8,50 h" */}
              {formatHeures(bilanContent.totalH)}
            </p>
          </div>

          {/* Carte "Total Net" */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl text-center border border-white/10">
            <p className="text-[11px] md:text-sm font-black uppercase text-white/70 mb-1">
              Total Net
            </p>
            <p className="text-2xl md:text-3xl font-black text-green-400">
              {/* formatEuro = transforme 1234.5 en "1 234,50 €" */}
              {formatEuro(bilanContent.totalE)}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          Ligne du bas :
          - à gauche : PAYÉ ✓ ou bouton "Marquer comme payé"
          - à droite : boutons d'export
         ====================================================== */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">

        {/* ----------- Bloc statut payé ----------- */}
        {bilanPaye ? (
          /**
           * Si bilanPaye === true
           * 👉 On montre un badge vert "PAYÉ ✓"
           */
          <div className="bg-green-600/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-green-500/40 text-green-300 font-black uppercase text-sm">
            PAYÉ ✓
          </div>
        ) : (
          /**
           * Sinon (bilan pas payé)
           * 👉 On montre un bouton qui appelle onMarquerPaye()
           */
          <button
            onClick={onMarquerPaye}
            className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 rounded-2xl font-black uppercase text-sm text-white shadow-lg active:scale-95 transition-all border border-green-400/50"
          >
            MARQUER COMME PAYÉ
          </button>
        )}

        {/* ----------- Bloc boutons export ----------- */}
        <div className="flex flex-wrap gap-3 justify-center md:justify-end">

          {/* Export Excel */}
          <button
            onClick={onExportExcel}
            className="px-5 py-2.5 bg-green-600/30 hover:bg-green-600/50 rounded-xl text-sm font-black text-green-300 border border-green-500/40 transition-all active:scale-95"
          >
            Excel
          </button>

          {/* Export PDF */}
          <button
            onClick={onExportPDF}
            className="px-5 py-2.5 bg-red-600/30 hover:bg-red-600/50 rounded-xl text-sm font-black text-red-300 border border-red-500/40 transition-all active:scale-95"
          >
            PDF
          </button>

          {/* Export CSV (missions uniquement) */}
          <button
            onClick={onExportCSV}
            className="px-5 py-2.5 bg-blue-600/30 hover:bg-blue-600/50 rounded-xl text-sm font-black text-blue-300 border border-blue-500/40 transition-all active:scale-95"
          >
            CSV Missions
          </button>

          {/* Export CSV + Frais
              👉 uniquement si :
              - il y a des frais
              - la période = semaine
           */}
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

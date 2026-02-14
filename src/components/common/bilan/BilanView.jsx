// components/common/bilan/BilanView.js
import React from "react";

// ✅ Sous-composants : on découpe l’écran Bilan en 2 morceaux
import { BilanHeader } from "./BilanHeader"; // En-tête : totals + paye + exports
import { BilanDetail } from "./BilanDetail"; // Détail : missions / regroupements / frais & acomptes

/**
 * ============================
 * BilanView
 * ============================
 * 👉 C’est la “vue” complète du bilan (l’écran).
 *
 * Elle ne calcule rien.
 * Elle ne fait qu’ASSEMBLER :
 *  - <BilanHeader /> (le haut)
 *  - <BilanDetail /> (le contenu)
 *
 * Donc c’est un composant “chef d’orchestre” 🎛️
 */
export const BilanView = ({
  bilanContent,          // Résultat du bilan (useBilan) : titre, totaux, listes...
  bilanPeriodType,       // "semaine" | "mois" | "annee"
  bilanPaye,             // true/false : déjà payé ?
  onMarquerPaye,         // callback bouton "marquer payé"
  onExportExcel,         // callback export Excel
  onExportPDF,           // callback export PDF
  onExportCSV,           // callback export CSV missions
  onExportCSVWithFrais,  // callback export CSV missions + frais
  darkMode = true,       // transmis aux enfants (style)
}) => {
  /**
   * Garde-fou : si le bilan n’est pas prêt (pas de titre),
   * on n’affiche rien (évite écran vide cassé).
   */
  if (!bilanContent || !bilanContent.titre) return null;

  return (
    /**
     * Container vertical : header puis détail
     */
    <div className="space-y-8">
      {/* ======================================================
          1) HEADER
          - titre (semaine/mois/année)
          - totaux (heures + €)
          - statut payé + bouton
          - exports
         ====================================================== */}
      <BilanHeader
        bilanContent={bilanContent}
        bilanPeriodType={bilanPeriodType}
        bilanPaye={bilanPaye}
        onMarquerPaye={onMarquerPaye}
        onExportExcel={onExportExcel}
        onExportPDF={onExportPDF}
        onExportCSV={onExportCSV}
        onExportCSVWithFrais={onExportCSVWithFrais}
        darkMode={darkMode}
      />

      {/* ======================================================
          2) DÉTAIL
          - si semaine : liste des missions
          - si mois : regroupement par semaine
          - si année : regroupement par mois
          - frais/acompte/impayés (si présents)
         ====================================================== */}
      <BilanDetail
        bilanPeriodType={bilanPeriodType}
        bilanContent={bilanContent}
        darkMode={darkMode}
      />
    </div>
  );
};

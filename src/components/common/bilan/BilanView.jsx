// components/common/bilan/BilanView.js
import React from "react";
import { BilanHeader } from "./BilanHeader";
import { BilanDetail } from "./BilanDetail";
export const BilanView = ({
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
  if (!bilanContent || !bilanContent.titre) return null;

  return (
    <div className="space-y-8">
      {/* Header avec totaux + boutons export */}
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

      {/* Contenu principal : détail ou résumé */}
      <BilanDetail
        bilanPeriodType={bilanPeriodType}
        bilanContent={bilanContent}
        darkMode={darkMode}
      />
    </div>
  );
};

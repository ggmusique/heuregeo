// components/common/bilan/BilanView.js
import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { BilanHeader } from "./BilanHeader";
import { BilanDetail } from "./BilanDetails";

export const BilanView = ({
  bilanContent,
  bilanPeriodType,
  bilanPaye,
  onMarquerPaye,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  onExportCSVWithFrais,
}) => {
  const { isDark } = useTheme();

  if (!bilanContent || !bilanContent.titre) return null;

  return (
    <div className="space-y-8">
      <BilanHeader
        bilanContent={bilanContent}
        bilanPeriodType={bilanPeriodType}
        bilanPaye={bilanPaye}
        onMarquerPaye={onMarquerPaye}
        onExportExcel={onExportExcel}
        onExportPDF={onExportPDF}
        onExportCSV={onExportCSV}
        onExportCSVWithFrais={onExportCSVWithFrais}
      />
      <BilanDetail
        bilanPeriodType={bilanPeriodType}
        bilanContent={bilanContent}
      />
    </div>
  );
};

import React from "react";
import { formatEuro, formatHeures } from "../../../utils/formatters";
import { BilanContent } from "../../../hooks/useBilan";
import { Button } from "../../ui/Button";

interface BilanHeaderProps {
  bilanContent: BilanContent;
  bilanPeriodType: string;
  bilanPaye: boolean;
  onMarquerPaye: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportCSVWithFrais: () => void;
  darkMode?: boolean;
}

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
  bilanContent,
  bilanPeriodType,
  bilanPaye,
  onMarquerPaye,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  onExportCSVWithFrais,
  darkMode = true,
}: BilanHeaderProps) => {
  const hasFrais = bilanContent.fraisDivers?.length > 0;

  return (
    <div className="bg-[var(--color-surface)] p-6 md:p-8 rounded-[40px] shadow-modal mb-8 border border-[var(--color-border)] backdrop-blur-card">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

        <div>
          <p className="text-[11px] md:text-sm font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-1">
            {bilanContent.titre || "Bilan"}
          </p>

          <h2 className="text-3xl md:text-4xl font-black text-[var(--color-text)] tracking-tight">
            BILAN
          </h2>

          {bilanContent.selectedPatronNom !== "Tous les patrons (Global)" && (
            <p className="text-sm md:text-base text-[var(--color-accent-violet)] mt-1 font-semibold">
              {bilanContent.selectedPatronNom}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">

          <div className="bg-[var(--color-surface-offset)] backdrop-blur-card p-4 rounded-2xl text-center border border-[var(--color-border)]">
            <p className="text-[11px] md:text-sm font-black uppercase text-[var(--color-text-muted)] mb-1">
              Heures
            </p>
            <p className="text-2xl md:text-3xl font-black text-[var(--color-text)] tabular-nums">
              {formatHeures(bilanContent.totalH)}
            </p>
          </div>

          <div className="bg-[var(--color-surface-offset)] backdrop-blur-card p-4 rounded-2xl text-center border border-[var(--color-border)]">
            <p className="text-[11px] md:text-sm font-black uppercase text-[var(--color-text-muted)] mb-1">
              Total Net
            </p>
            <p className="text-2xl md:text-3xl font-black text-[var(--color-accent-green)] amount-safe tabular-nums">
              {formatEuro(bilanContent.totalE)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">

        {bilanPaye ? (
          <div className="bg-[var(--color-accent-green)]/15 backdrop-blur-card px-6 py-3 rounded-2xl border border-[var(--color-accent-green)]/30 text-[var(--color-accent-green)] font-black uppercase text-sm">
            PAYÉ ✓
          </div>
        ) : (
          <Button variant="success" size="md" onClick={onMarquerPaye}>
            MARQUER COMME PAYÉ
          </Button>
        )}

        <div className="flex flex-wrap gap-3 justify-center md:justify-end">

          <Button variant="success" size="sm" onClick={onExportExcel}>
            Excel
          </Button>

          <Button variant="danger" size="sm" onClick={onExportPDF}>
            PDF
          </Button>

          <Button variant="ghost" size="sm" onClick={onExportCSV}>
            CSV Missions
          </Button>

          {hasFrais && bilanPeriodType === "semaine" && (
            <Button variant="secondary" size="sm" onClick={onExportCSVWithFrais}>
              CSV + Frais
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

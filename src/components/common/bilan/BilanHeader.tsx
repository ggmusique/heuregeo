import React from "react";
import { formatEuro, formatHeures } from "../../../utils/formatters";
import { BilanContent } from "../../../hooks/useBilan";

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
          <button
            onClick={onMarquerPaye}
            className="bg-[var(--color-accent-green)]/15 hover:bg-[var(--color-accent-green)]/25 px-6 py-3 rounded-2xl font-black uppercase text-sm text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/30 active:scale-95 transition-[background,transform] duration-150"
          >
            MARQUER COMME PAYÉ
          </button>
        )}

        <div className="flex flex-wrap gap-3 justify-center md:justify-end">

          <button
            onClick={onExportExcel}
            className="px-5 py-2.5 bg-[var(--color-accent-green)]/15 hover:bg-[var(--color-accent-green)]/25 rounded-xl text-sm font-black text-[var(--color-accent-green)] amount-safe border border-[var(--color-accent-green)]/30 transition-[background] duration-150 active:scale-95"
          >
            Excel
          </button>

          <button
            onClick={onExportPDF}
            className="px-5 py-2.5 bg-[var(--color-accent-red)]/15 hover:bg-[var(--color-accent-red)]/25 rounded-xl text-sm font-black text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30 transition-[background] duration-150 active:scale-95"
          >
            PDF
          </button>

          <button
            onClick={onExportCSV}
            className="px-5 py-2.5 bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-hover)] rounded-xl text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] transition-[background,color] duration-150 active:scale-95"
          >
            CSV Missions
          </button>

          {hasFrais && bilanPeriodType === "semaine" && (
            <button
              onClick={onExportCSVWithFrais}
              className="px-5 py-2.5 bg-[var(--color-accent-cyan)]/15 hover:bg-[var(--color-accent-cyan)]/25 rounded-xl text-sm font-black text-[var(--color-accent-cyan)] amount-safe border border-[var(--color-accent-cyan)]/30 transition-[background] duration-150 active:scale-95"
            >
              CSV + Frais
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

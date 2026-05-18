import React from "react";
import { useLabels } from "../../../contexts/LabelsContext";
import { Patron, Client } from "../../../types/entities";

interface PeriodModalProps {
  show: boolean;
  periodType: "semaine" | "mois" | "annee";
  setPeriodType: (v: string) => void;
  periodValue: string;
  setPeriodValue: (v: string) => void;
  availablePeriods: (number | string)[];
  formatPeriodLabel: (v: string | number) => string;
  onConfirm: () => void;
  onCancel: () => void;
  darkMode?: boolean;
  patrons?: Patron[];
  selectedPatronId?: string | null;
  onPatronChange?: (id: string | null) => void;
  clients?: Client[];
  selectedClientId?: string | null;
  onClientChange?: (id: string | null) => void;
  isViewer?: boolean;
  canBilanMois?: boolean;
  canBilanAnnee?: boolean;
}

/**
 * ============================
 * PeriodModal
 * ============================
 * 👉 Petite fenêtre (modale) qui sert à CHOISIR :
 *   1) le type de période : semaine / mois / année
 *   2) la période exacte : ex "Semaine 12" ou "2025-02"
 *   3) (optionnel) un patron : Global ou un patron précis
 *
 * ✅ Elle ne calcule rien.
 * ✅ Elle ne fait qu'afficher des choix et appeler des callbacks.
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
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
  clients = [],
  selectedClientId = null,
  onClientChange = () => {},
  isViewer = false,
  canBilanMois = true,
  canBilanAnnee = true,
}: PeriodModalProps) => {
  const L = useLabels();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center sm:p-6 bg-[var(--color-overlay)] backdrop-blur-[var(--blur-overlay)]">
      <div
        className="w-full max-w-full sm:max-w-sm p-5 sm:p-8 rounded-t-[32px] sm:rounded-[45px] max-h-[90dvh] overflow-y-auto border-2 bg-[var(--color-surface)] border-[var(--color-border)] backdrop-blur-modal"
      >
        <h3 className="text-xl font-black uppercase mb-4 text-center tracking-tighter italic">
          Choisir la période
        </h3>

        {/* ======================================================
            1) Choix du TYPE de période
           ====================================================== */}
        <div className="flex bg-[var(--color-surface-offset)] rounded-2xl p-1 mb-6">
          <button
            onClick={() => setPeriodType("semaine")}
            className={`flex-1 py-3 min-h-[44px] text-[11px] font-black rounded-xl transition-[background,color] duration-150 ${
              periodType === "semaine"
                ? "bg-[var(--color-accent-violet)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            Semaine
          </button>

          <button
            onClick={() => canBilanMois && setPeriodType("mois")}
            disabled={!canBilanMois}
            title={!canBilanMois ? "Fonctionnalité Pro" : undefined}
            className={`flex-1 py-3 min-h-[44px] text-[11px] font-black rounded-xl transition-[background,color] duration-150 ${
              !canBilanMois
                ? "text-[var(--color-text-muted)] opacity-30 cursor-not-allowed"
                : periodType === "mois"
                ? "bg-[var(--color-accent-violet)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            {canBilanMois ? "Mois" : "🔒 Mois"}
          </button>

          <button
            onClick={() => canBilanAnnee && setPeriodType("annee")}
            disabled={!canBilanAnnee}
            title={!canBilanAnnee ? "Fonctionnalité Pro" : undefined}
            className={`flex-1 py-3 min-h-[44px] text-[11px] font-black rounded-xl transition-[background,color] duration-150 ${
              !canBilanAnnee
                ? "text-[var(--color-text-muted)] opacity-30 cursor-not-allowed"
                : periodType === "annee"
                ? "bg-[var(--color-accent-violet)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            {canBilanAnnee ? "Année" : "🔒 Année"}
          </button>
        </div>

        {/* ======================================================
            2) Choix de la PÉRIODE
           ====================================================== */}
        <div className="mb-6">
          <label className="block text-[11px] font-black uppercase mb-3 text-[var(--color-text-muted)] tracking-[0.25em]">
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
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-base uppercase border-2 border-[var(--color-border)] appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent-violet)] transition-[border-color] duration-150 shadow-inner backdrop-blur-card bg-[var(--color-field)] text-[var(--color-text)]`}
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

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-accent-violet)]">
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

        {/* ======================================================
            3) Filtre PATRON (optionnel)
           ====================================================== */}
        {!isViewer && (
        <div className="mb-8">
          <label className="block text-[11px] font-black uppercase mb-3 text-green-300 tracking-[0.25em] opacity-80">
          Filtrer par {L.patron} (optionnel)
          </label>

          <div className="relative">
            <select
              value={selectedPatronId || ""}
              onChange={(e) => {
                const value = e.target.value;
                onPatronChange(value === "" ? null : value);
              }}
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-base uppercase border-2 border-[var(--color-accent-green)]/40 appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent-green)] transition-[border-color] duration-150 shadow-inner bg-[var(--color-field)] text-[var(--color-text)]`}
            >
              <option value="">📊 Tous les {L.patrons} (Global)</option>

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
            Laisser sur "Tous les {L.patrons}" pour un bilan consolidé
          </p>
        </div>
        )}

        {/* ======================================================
            4) Filtre CLIENT (optionnel)
           ====================================================== */}
        {!isViewer && (
        <div className="mb-8">
          <label className="block text-[11px] font-black uppercase mb-3 text-amber-300 tracking-[0.25em] opacity-80">
          Filtrer par {L.client} (optionnel)
          </label>

          <div className="relative">
            <select
              value={selectedClientId || ""}
              onChange={(e) => {
                const value = e.target.value;
                onClientChange(value === "" ? null : value);
              }}
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-base uppercase border-2 border-[var(--color-accent-amber)]/40 appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent-amber)] transition-[border-color] duration-150 shadow-inner bg-[var(--color-field)] text-[var(--color-text)]`}
            >
              <option value="">👥 Tous les {L.clients}</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-amber-400">
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
            Laisser sur "Tous les {L.clients}" pour un bilan consolidé
          </p>
        </div>
        )}

        {/* ======================================================
            5) Boutons bas
           ====================================================== */}
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
                ? "bg-[var(--color-accent-violet)] text-white active:scale-95"
                : "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] opacity-40 cursor-not-allowed"
            } backdrop-blur-md`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";
import { Patron } from "../../../types/entities";
import { Button } from "../../ui/Button";

interface AcompteModalProps {
  show: boolean;
  montant: string | number;
  setMontant: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** @deprecated — ignoré, le thème vient de DarkModeContext */
  darkMode?: boolean;
  isIOS?: boolean;
  patrons?: Patron[];
  selectedPatronId?: string | null;
  onPatronChange?: (id: string | null) => void;
}

/**
 * ✅ AcompteModal = fenêtre "Nouvel Acompte"
 * Elle s'affiche quand show = true
 * Elle contient :
 * - un sélecteur de patron (obligatoire)
 * - un champ montant
 * - un sélecteur de date
 * - boutons Annuler / Valider
 */
export const AcompteModal = ({
  show,
  montant,
  setMontant,
  date,
  setDate,
  onSubmit,
  onCancel,
  loading = false,
  isIOS = false,
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
}: AcompteModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[var(--color-overlay)] backdrop-blur-[var(--blur-overlay)]">
      
      <div className="w-full max-w-sm p-8 rounded-[40px] border-2 bg-[var(--color-surface)] border-[var(--color-border-cyan)] backdrop-blur-card shadow-modal">
        
        <h3 className="text-xl font-black uppercase mb-6 text-center italic text-cyan-400">
          Nouvel Acompte
        </h3>

        <div className="space-y-6">

          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
          />

          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Montant reçu
            </p>

            <input
              type="number"
              placeholder="0.00 €"
              className="w-full p-6 rounded-2xl font-black outline-none border text-center text-3xl focus:border-[var(--color-accent-cyan)] transition-colors bg-[var(--color-bg-input)] text-[var(--color-text)] border-[var(--color-border-cyan)] placeholder:text-[var(--color-text-dim)]"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Date de réception
            </p>

            <DateSelector
              dateMission={date}
              setDateMission={setDate}
              isIOS={isIOS}
            />
          </div>

          <div className="flex gap-3 pt-2">

            <Button variant="ghost" fullWidth onClick={onCancel}>Annuler</Button>

            <Button variant="primary" fullWidth loading={loading} disabled={loading} onClick={onSubmit}>
              Valider
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

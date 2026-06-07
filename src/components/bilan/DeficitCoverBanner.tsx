import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  computeDeficit,
  computeDeficitCoverWithdrawal,
} from "../../features/contracts/reserve/reserveWithdrawal";

interface DeficitCoverBannerProps {
  /** Libellé de la période, ex: "Semaine 21". */
  periodLabel: string;
  workedHours: number;
  quotaHours: number;
  /** Solde disponible dans la banque d'heures. */
  balanceHours: number;
  /** Heures déjà piochées pour cette semaine (mouvements deficit_cover). */
  alreadyWithdrawnHours?: number;
  /** Cadenas : si la semaine est payée, la bannière ne s'affiche pas. */
  isPaid?: boolean;
  isViewer?: boolean;
  onCover?: (hours: number) => Promise<void>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Bannière de proposition de comblement du déficit contrat depuis la banque.
 *
 * Règles :
 * - tout-ou-rien : on comble la totalité du déficit restant, ou rien si le
 *   solde de la banque est insuffisant ;
 * - cadenas : aucune proposition sur une semaine payée (gelée) ;
 * - masquable par l'utilisateur ("Ignorer") pour la session courante.
 */
export function DeficitCoverBanner({
  periodLabel,
  workedHours,
  quotaHours,
  balanceHours,
  alreadyWithdrawnHours = 0,
  isPaid = false,
  isViewer = false,
  onCover,
}: DeficitCoverBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [covering, setCovering] = useState(false);

  const deficit = computeDeficit(workedHours, quotaHours);
  const remaining = Math.max(0, deficit - Math.max(0, alreadyWithdrawnHours));
  const coverable = computeDeficitCoverWithdrawal(remaining, balanceHours);

  // Cadenas : semaine payée = gelée, aucune proposition.
  if (isPaid) return null;
  // Pas (ou plus) de déficit à combler.
  if (remaining <= 0) return null;
  // Masquée par l'utilisateur pour cette session.
  if (dismissed) return null;

  const canCover = coverable > 0 && Boolean(onCover) && !isViewer;

  return (
    <div
      data-testid="deficit-cover-banner"
      className="rounded-[var(--radius-lg)] border border-[var(--color-accent-amber)]/40 bg-[var(--color-accent-amber)]/8 p-3"
    >
      <div className="flex items-start gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-amber)]/20 text-[var(--color-accent-amber)]">
          <AlertTriangle size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
            Déficit contrat
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--color-text)]">
            {periodLabel} : {round1(workedHours)}h / {round1(quotaHours)}h — il manque{" "}
            <span className="font-black text-[var(--color-accent-amber)]">{round1(remaining)}h</span>.
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
            Solde banque :{" "}
            <span className="font-black text-[var(--color-accent-green)]">{round1(balanceHours)}h</span>
          </p>

          {coverable <= 0 && (
            <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              Solde insuffisant pour combler ce déficit.
            </p>
          )}

          {!isViewer && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canCover || covering}
                onClick={async () => {
                  if (!canCover || covering || !onCover) return;
                  setCovering(true);
                  try {
                    await onCover(remaining);
                  } finally {
                    setCovering(false);
                  }
                }}
                className="rounded-[var(--radius-pill)] border border-[var(--color-accent-amber)]/50 bg-[var(--color-accent-amber)]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent-amber)] transition-opacity disabled:opacity-40"
              >
                {covering ? "En cours..." : `Combler ${round1(remaining)}h`}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                Ignorer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

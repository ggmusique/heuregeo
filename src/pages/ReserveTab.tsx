import { useMemo, useState } from "react";
import { PiggyBank, Plus, Minus, RotateCcw } from "lucide-react";
import { useReserve } from "../features/contracts/reserve";
import type { ReserveMovementType } from "../features/contracts/reserve";
import { formatHeures } from "../utils/formatters";

interface ReserveTabProps {
  patronId: string | null;
  patronName?: string;
}

type ReserveAction = "add" | "consume" | "carry";

function actionToMovementType(action: ReserveAction): ReserveMovementType {
  if (action === "add") return "manual_add";
  if (action === "consume") return "manual_consume";
  if (action === "carry") return "carry_over";
  return "manual_add";
}

export function ReserveTab({ patronId, patronName }: ReserveTabProps) {
  const { loading, saving, error, movements, balanceHours, addMovement, removeMovement } = useReserve(patronId);

  const [action, setAction] = useState<ReserveAction>("add");
  const [hours, setHours] = useState("1");
  const [comment, setComment] = useState("");

  const signedHours = useMemo(() => {
    const value = Number(hours || 0);
    if (!Number.isFinite(value)) return 0;
    if (action === "consume") return -Math.abs(value);
    return Math.abs(value);
  }, [action, hours]);

  const submitMovement = async () => {
    if (!Number.isFinite(signedHours) || signedHours === 0) return;
    await addMovement({
      movementType: actionToMovementType(action),
      source: "user",
      deltaHours: signedHours,
      comment,
    });
    setComment("");
  };

  return (
    <section className="space-y-4">
      <article className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4 shadow-modal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Banque d'heures</p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-text)]">Réserve {patronName ? `- ${patronName}` : "globale"}</h2>
          </div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]">
            <PiggyBank size={20} />
          </div>
        </div>

        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-accent-green)]/35 bg-[var(--color-accent-green)]/10 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Solde actuel</p>
          <p className="mt-0.5 text-2xl font-black text-[var(--color-accent-green)]">{formatHeures(balanceHours)}</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setAction("add")}
            className={"rounded-[var(--radius-lg)] border px-3 py-2 text-[10px] font-black uppercase tracking-wider " + (action === "add" ? "border-[var(--color-accent-green)]/45 bg-[var(--color-accent-green)]/12 text-[var(--color-accent-green)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}
          >
            <Plus size={13} className="mx-auto mb-1" />
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => setAction("consume")}
            className={"rounded-[var(--radius-lg)] border px-3 py-2 text-[10px] font-black uppercase tracking-wider " + (action === "consume" ? "border-[var(--color-accent-amber)]/45 bg-[var(--color-accent-amber)]/12 text-[var(--color-accent-amber)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}
          >
            <Minus size={13} className="mx-auto mb-1" />
            Consommer
          </button>
          <button
            type="button"
            onClick={() => setAction("carry")}
            className={"rounded-[var(--radius-lg)] border px-3 py-2 text-[10px] font-black uppercase tracking-wider " + (action === "carry" ? "border-[var(--color-accent-cyan)]/45 bg-[var(--color-accent-cyan)]/12 text-[var(--color-accent-cyan)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}
          >
            <RotateCcw size={13} className="mx-auto mb-1" />
            Report
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text)]"
            aria-label="Heures"
          />
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire optionnel"
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]"
            aria-label="Commentaire"
          />
          <button
            type="button"
            disabled={saving || signedHours === 0}
            onClick={submitMovement}
            className="rounded-[var(--radius-lg)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] disabled:opacity-40"
          >
            Enregistrer
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-[var(--color-accent-red)]">{error}</p>}
      </article>

      <article className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-modal">
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Historique des mouvements</p>
        {loading ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Chargement...</p>
        ) : movements.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Aucun mouvement enregistré.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[780px] space-y-2">
              <div className="grid grid-cols-[140px_140px_1fr_120px_120px_120px] gap-2 px-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                <span>Date</span>
                <span>Type</span>
                <span>Commentaire</span>
                <span>Delta</span>
                <span>Avant</span>
                <span>Après</span>
              </div>
              {movements.map((movement) => {
                const isPositive = Number(movement.delta_hours) >= 0;
                const before = movement.balance_before_hours;
                const after = movement.balance_after_hours;
                return (
                  <div key={movement.id} className="grid grid-cols-[140px_140px_1fr_120px_120px_120px] items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2 py-2">
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {new Date(movement.movement_date).toLocaleString("fr-BE")}
                    </p>
                    <p className="text-xs font-black text-[var(--color-text)]">{movement.movement_type}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{movement.comment || "-"}</p>
                    <p className={"text-sm font-black " + (isPositive ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-amber)")}>
                      {isPositive ? "+" : ""}{formatHeures(Number(movement.delta_hours))}
                    </p>
                    <p className="text-xs font-black text-[var(--color-text)]">{before === null ? "-" : formatHeures(Number(before))}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[var(--color-text)]">{after === null ? "-" : formatHeures(Number(after))}</p>
                      {movement.movement_source === "user" && (
                        <button
                          type="button"
                          onClick={() => removeMovement(movement.id)}
                          className="rounded-[var(--radius-pill)] border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent-red)]"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

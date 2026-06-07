import { useMemo, useState } from "react";
import { Calendar, PiggyBank, Plus, Minus, RotateCcw } from "lucide-react";
import { useReserve } from "../features/contracts/reserve";
import { Button } from "../components/ui/Button";
import type { ReserveMovementType } from "../features/contracts/reserve";
import {
  computePlannedWeekAllocation,
  computeWithdrawalAmount,
  isWeekInPast,
} from "../features/contracts/reserve/reserveWithdrawal";
import { formatHeures } from "../utils/formatters";
import { getWeekNumber } from "../utils/dateUtils";

interface ReserveTabProps {
  patronId: string | null;
  patronName?: string;
  /** Quota contractuel hebdomadaire (heures/semaine) */
  quotaHours?: number;
  /** Taux horaire moyen (€/h) pour estimer la valeur d'une allocation */
  hourlyRate?: number;
}

type ReserveAction = "add" | "consume" | "carry";

function actionToMovementType(action: ReserveAction): ReserveMovementType {
  if (action === "add") return "manual_add";
  if (action === "consume") return "manual_consume";
  if (action === "carry") return "carry_over";
  return "manual_add";
}

export function ReserveTab({ patronId, patronName, quotaHours = 0, hourlyRate = 0 }: ReserveTabProps) {
  const { loading, saving, error, movements, balanceHours, addMovement, removeMovement } = useReserve(patronId);

  const [action, setAction] = useState<ReserveAction>("add");
  const [hours, setHours] = useState("1");
  const [comment, setComment] = useState("");

  // ── Semaine planifiée ──────────────────────────────────────────────────────
  const [planningOpen, setPlanningOpen] = useState(false);
  const [plannedWeekStart, setPlannedWeekStart] = useState("");
  const [plannedHours, setPlannedHours] = useState("0");
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);

  /** Semaines futures disponibles (8 prochaines semaines à partir de la semaine prochaine) */
  const futureWeeks = useMemo(() => {
    const today = new Date();
    // Lundi de la semaine en cours
    const dayOfWeek = today.getDay() || 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dayOfWeek + 1);
    thisMonday.setHours(0, 0, 0, 0);

    const weeks: Array<{ startIso: string; label: string }> = [];
    for (let i = 1; i <= 8; i++) {
      const weekMonday = new Date(thisMonday);
      weekMonday.setDate(thisMonday.getDate() + i * 7);
      const startIso = weekMonday.toISOString().split("T")[0];
      const wn = getWeekNumber(weekMonday);
      const yr = weekMonday.getFullYear();
      weeks.push({ startIso, label: `S${wn} ${yr} (dès ${startIso})` });
    }
    return weeks;
  }, []);

  const plannedHoursNum = Math.max(0, Number(plannedHours) || 0);
  const plannedMaxHours = computePlannedWeekAllocation(quotaHours, balanceHours, quotaHours);
  const plannedAmount = computeWithdrawalAmount(
    computePlannedWeekAllocation(quotaHours, balanceHours, plannedHoursNum),
    hourlyRate,
  );

  const handlePlanWeek = async () => {
    setPlanningError(null);

    if (!plannedWeekStart) {
      setPlanningError("Sélectionnez une semaine.");
      return;
    }
    if (isWeekInPast(plannedWeekStart)) {
      setPlanningError("Impossible de planifier une semaine passée ou en cours.");
      return;
    }
    if (balanceHours <= 0) {
      setPlanningError("Solde banque vide — aucune heure disponible.");
      return;
    }
    if (plannedHoursNum <= 0) {
      setPlanningError("Indiquez un nombre d'heures à allouer.");
      return;
    }

    const allocated = computePlannedWeekAllocation(quotaHours, balanceHours, plannedHoursNum);
    if (allocated <= 0) {
      setPlanningError("Allocation impossible : solde ou quota insuffisant.");
      return;
    }

    // Calcul du numéro de semaine ISO pour le period_value
    const weekMonday = new Date(`${plannedWeekStart}T00:00:00`);
    const wn = getWeekNumber(weekMonday);
    const yr = weekMonday.getFullYear();
    const periodValue = `${yr}-W${String(wn).padStart(2, "0")}`;

    setPlanningLoading(true);
    try {
      await addMovement({
        movementType: "planned_week",
        source: "user",
        deltaHours: -allocated,
        periodType: "semaine",
        periodValue,
        comment: `Semaine réserve planifiée — S${wn} ${yr} (${plannedWeekStart})`,
      });
      setPlannedHours("0");
      setPlannedWeekStart("");
      setPlanningOpen(false);
    } catch {
      setPlanningError("Erreur lors de l'enregistrement.");
    } finally {
      setPlanningLoading(false);
    }
  };

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
          <Button
            variant={action === "add" ? "success" : "ghost"}
            size="sm"
            className="flex flex-col items-center gap-1"
            onClick={() => setAction("add")}
          >
            <Plus size={13} />
            Ajouter
          </Button>
          <Button
            variant={action === "consume" ? "danger" : "ghost"}
            size="sm"
            className="flex flex-col items-center gap-1"
            onClick={() => setAction("consume")}
          >
            <Minus size={13} />
            Consommer
          </Button>
          <Button
            variant={action === "carry" ? "secondary" : "ghost"}
            size="sm"
            className="flex flex-col items-center gap-1"
            onClick={() => setAction("carry")}
          >
            <RotateCcw size={13} />
            Report
          </Button>
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
          <Button
            variant="primary"
            size="sm"
            disabled={saving || signedHours === 0}
            onClick={submitMovement}
          >
            Enregistrer
          </Button>
        </div>

        {error && <p className="mt-2 text-xs text-[var(--color-accent-red)]">{error}</p>}
      </article>

      {/* ── Planifier une semaine réserve ───────────────────────────────────── */}
      {quotaHours > 0 && (
        <article className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4 shadow-modal">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-cyan)]/12 text-[var(--color-accent-cyan)]">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Semaine réserve</p>
                <p className="text-sm font-black text-[var(--color-text)]">Planifier une semaine vide</p>
              </div>
            </div>
            <Button
              variant={planningOpen ? "ghost" : "secondary"}
              size="sm"
              onClick={() => {
                setPlanningOpen((v) => !v);
                setPlanningError(null);
              }}
            >
              {planningOpen ? "Annuler" : "Planifier"}
            </Button>
          </div>

          {planningOpen && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Allouez des heures de banque pour couvrir une semaine où vous ne travaillerez pas.
                L'allocation est plafonnée au minimum de votre quota ({quotaHours}h) et de votre solde actuel ({Math.round(balanceHours * 10) / 10}h).
              </p>

              {/* Sélecteur semaine */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Semaine à planifier
                </label>
                <select
                  value={plannedWeekStart}
                  onChange={(e) => { setPlannedWeekStart(e.target.value); setPlanningError(null); }}
                  className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text)]"
                  aria-label="Semaine à planifier"
                >
                  <option value="">— Choisir une semaine —</option>
                  {futureWeeks.map((w) => (
                    <option key={w.startIso} value={w.startIso}>{w.label}</option>
                  ))}
                </select>
              </div>

              {/* Input heures + preview € */}
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    Heures à allouer (max {Math.round(plannedMaxHours * 10) / 10}h)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={plannedMaxHours}
                    value={plannedHours}
                    onChange={(e) => { setPlannedHours(e.target.value); setPlanningError(null); }}
                    className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-sm text-[var(--color-text)]"
                    aria-label="Heures à allouer"
                  />
                </div>
                {hourlyRate > 0 && plannedHoursNum > 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-cyan)]/35 bg-[var(--color-accent-cyan)]/10 px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Équivalent</p>
                    <p className="text-sm font-black text-[var(--color-accent-cyan)]">
                      {plannedAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </p>
                  </div>
                )}
              </div>

              {planningError && (
                <p className="text-xs font-bold text-[var(--color-accent-red)]">{planningError}</p>
              )}

              <Button
                variant="secondary"
                fullWidth
                size="sm"
                loading={planningLoading}
                disabled={balanceHours <= 0 || plannedHoursNum <= 0 || !plannedWeekStart}
                onClick={handlePlanWeek}
              >
                {plannedHoursNum > 0 ? `Confirmer l'allocation — ${Math.round(computePlannedWeekAllocation(quotaHours, balanceHours, plannedHoursNum) * 10) / 10}h` : "Confirmer l'allocation"}
              </Button>
            </div>
          )}
        </article>
      )}

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
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeMovement(movement.id)}
                          className="px-2 py-1"
                        >
                          Supprimer
                        </Button>
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

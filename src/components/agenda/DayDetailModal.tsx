import React, { useState } from "react";
import { X, Clock, User, MapPin, FileText, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgendaEvent } from "../../types/entities";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape extracted from a FullCalendar event click for display purposes. */
export interface ClickedEvent {
  id: string;        // 'mission-{uuid}' or 'agenda-{uuid}'
  title: string;
  startStr: string;  // ISO datetime or date
  type: string;      // 'travail' | 'rdv' | 'conge' | 'note'
  debut: string | null;
  fin: string | null;
  client: string | null;
  lieu: string | null;
  description: string | null;
  originalAgendaEvent: AgendaEvent | undefined;
}

interface DayDetailModalProps {
  event: ClickedEvent;
  onClose: () => void;
  onEdit: (agendaEvent: AgendaEvent) => void;
  onDelete: (fcId: string) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  travail: "Mission",
  rdv: "Rendez-vous",
  conge: "Congé",
  note: "Note",
};

const TYPE_ACCENT: Record<string, string> = {
  travail: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  rdv: "text-violet-300 border-violet-400/40 bg-violet-400/10",
  conge: "text-orange-300 border-orange-400/40 bg-orange-400/10",
  note: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
};

function formatDate(iso: string): string {
  const date = iso.slice(0, 10);
  const d = new Date(date + "T12:00:00");
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DayDetailModal({ event, onClose, onEdit, onDelete }: DayDetailModalProps) {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const isTravail = event.type === "travail";
  const accentClass = TYPE_ACCENT[event.type] ?? TYPE_ACCENT.rdv;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(event.id);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center sm:p-6"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full sm:max-w-lg bg-gray-900/95 backdrop-blur border border-cyan-400/20 rounded-t-3xl sm:rounded-2xl max-h-[85dvh] sm:max-h-[80dvh] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-cyan-400/10 flex-shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* Type badge */}
            <span
              className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-semibold border ${accentClass}`}
            >
              {TYPE_LABELS[event.type] ?? event.type}
            </span>

            {/* Title */}
            {!isTravail && (
              <h2 className="text-base font-bold text-white leading-snug truncate">
                {event.title}
              </h2>
            )}

            {/* Date */}
            <p className="text-xs text-white/50">{formatDate(event.startStr)}</p>
          </div>

          <button
            onClick={onClose}
            className="flex-none flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {isTravail ? (
            /* ── Mission view ──────────────────────────────────────────── */
            <>
              {event.debut && event.fin && (
                <Row icon={Clock} label="Horaire">
                  {event.debut} → {event.fin}
                </Row>
              )}
              {event.client && (
                <Row icon={User} label="Client">
                  {event.client}
                </Row>
              )}
              {event.lieu && (
                <Row icon={MapPin} label="Lieu">
                  {event.lieu}
                </Row>
              )}
            </>
          ) : (
            /* ── Agenda event view ─────────────────────────────────────── */
            <>
              {event.debut && event.fin && (
                <Row icon={Clock} label="Horaire">
                  {event.debut} → {event.fin}
                </Row>
              )}
              {event.description && (
                <Row icon={FileText} label="Description">
                  {event.description}
                </Row>
              )}
            </>
          )}
        </div>

        {/* Footer — only for editable agenda events */}
        {!isTravail && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-cyan-400/10">
            {confirmingDelete ? (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-orange-300">
                  <AlertTriangle size={15} />
                  <span className="text-xs font-semibold">Supprimer cet événement ?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 py-3 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-3 text-xs font-semibold rounded-lg bg-orange-500/30 border border-orange-400/50 text-orange-200 hover:bg-orange-500/50 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Suppression…" : "Confirmer"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (event.originalAgendaEvent) onEdit(event.originalAgendaEvent);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[44px] text-xs font-semibold rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-300 hover:bg-violet-500/35 hover:border-violet-400/70 transition-all"
                >
                  <Pencil size={13} />
                  Modifier
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[44px] text-xs font-semibold rounded-xl bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/30 hover:border-red-400/60 transition-all"
                >
                  <Trash2 size={13} />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="mt-0.5 flex-none text-white/40" />
      <div className="min-w-0">
        <p className="text-xs text-white/40 mb-0.5">{label}</p>
        <p className="text-sm text-white/85 leading-snug">{children}</p>
      </div>
    </div>
  );
}

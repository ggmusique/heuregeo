import React, { useState, useEffect } from "react";
import { AGENDA_EVENT_TYPES } from "../../constants/enums";
import type { AgendaEventType } from "../../constants/enums";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const TYPE_OPTIONS: { key: AgendaEventType; label: string; emoji: string; color: string; border: string; bg: string }[] = [
  { key: AGENDA_EVENT_TYPES.RDV,   label: "RDV",    emoji: "📅", color: "from-[var(--color-event-rdv)] to-[color-mix(in_srgb,var(--color-event-rdv)_80%,black)]",     border: "border-[var(--color-event-rdv)]/50",   bg: "bg-[var(--color-event-rdv)]/10"   },
  { key: AGENDA_EVENT_TYPES.CONGE, label: "Congé",  emoji: "🌴", color: "from-[var(--color-event-conge)] to-[color-mix(in_srgb,var(--color-event-conge)_80%,black)]", border: "border-[var(--color-event-conge)]/50", bg: "bg-[var(--color-event-conge)]/10" },
  { key: AGENDA_EVENT_TYPES.NOTE,  label: "Note",   emoji: "📝", color: "from-[var(--color-event-note)] to-[color-mix(in_srgb,var(--color-event-note)_80%,black)]",   border: "border-[var(--color-event-note)]/50",  bg: "bg-[var(--color-event-note)]/10"  },
];

const RAPPEL_OPTIONS = [
  { value: null, label: "Aucun rappel" },
  { value: 5,    label: "5 min avant" },
  { value: 10,   label: "10 min avant" },
  { value: 15,   label: "15 min avant" },
  { value: 30,   label: "30 min avant" },
  { value: 60,   label: "1h avant" },
  { value: 120,  label: "2h avant" },
];

interface Props {
  show: boolean;
  editMode?: boolean;
  initialData?: any;
  selectedDate?: string | null;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  /** @deprecated — ignoré, le thème vient de DarkModeContext */
  darkMode?: boolean;
}

export function AgendaModal({
  show,
  editMode      = false,
  initialData   = null,
  selectedDate  = null,
  onSubmit,
  onCancel,
  onDelete,
  loading       = false,
}: Props) {
  const [type,        setType]       = useState<AgendaEventType>(AGENDA_EVENT_TYPES.RDV);
  const [titre,       setTitre]      = useState("");
  const [dateIso,     setDateIso]    = useState("");
  const [dateFin,     setDateFin]    = useState("");
  const [heureDebut,  setHeureDebut] = useState("");
  const [heureFin,    setHeureFin]   = useState("");
  const [rappel,      setRappel]     = useState<number | null>(null);
  const [description, setDescription]= useState("");

  useEffect(() => {
    if (!show) return;
    if (editMode && initialData) {
      setType(initialData.type || AGENDA_EVENT_TYPES.RDV);
      setTitre(initialData.titre || "");
      setDateIso(initialData.date_iso || selectedDate || "");
      setDateFin(initialData.date_fin || "");
      setHeureDebut(initialData.heure_debut || "");
      setHeureFin(initialData.heure_fin || "");
      setRappel(initialData.rappel_minutes ?? null);
      setDescription(initialData.description || "");
    } else {
      setType(AGENDA_EVENT_TYPES.RDV);
      setTitre("");
      setDateIso(selectedDate || "");
      setDateFin("");
      setHeureDebut("");
      setHeureFin("");
      setRappel(null);
      setDescription("");
    }
  }, [show, editMode, initialData, selectedDate]);

  const canSubmit = !loading && titre.trim().length > 0 && dateIso.length > 0 &&
    (type !== AGENDA_EVENT_TYPES.CONGE || dateFin.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      type,
      titre: titre.trim(),
      date_iso: dateIso,
      date_fin: type === AGENDA_EVENT_TYPES.CONGE ? dateFin : null,
      heure_debut: type === AGENDA_EVENT_TYPES.RDV && heureDebut ? heureDebut : null,
      heure_fin:   type === AGENDA_EVENT_TYPES.RDV && heureFin   ? heureFin   : null,
      rappel_minutes: type === AGENDA_EVENT_TYPES.RDV ? rappel : null,
      description: description.trim() || null,
    });
  };

  if (!show) return null;

  const inputCls =
    "w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-[border-color,background-color] duration-150 outline-none " +
    "bg-[var(--color-bg-input)] border-2 border-[var(--color-border)] " +
    "focus:border-[var(--color-accent-green)] text-[var(--color-text)] " +
    "placeholder:text-[var(--color-text-dim)]";

  const labelCls = "block text-[10px] font-black uppercase tracking-wider mb-2 text-[var(--color-text-muted)]";

  const selectedType = TYPE_OPTIONS.find((t) => t.key === type);
  const trapRef = useFocusTrap(show);

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[200] flex items-end justify-center p-4 animate-in fade-in duration-200 sm:items-center">
      <div
        className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-overlay"
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-md rounded-[35px] p-7 shadow-modal animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">
            {editMode ? "Modifier" : "Nouvel événement"}
          </h2>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-[background-color,color] duration-150 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          {/* Type */}
          <div>
            <p className={labelCls}>Type</p>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase transition-[background-color,border-color,color,box-shadow] duration-150 ${
                    type === t.key
                      ? `bg-gradient-to-br ${t.color} text-white shadow-lg`
                      : "bg-[var(--color-surface-offset)] text-[var(--color-text-dim)] border border-[var(--color-border)]"
                  }`}
                >
                  <span className="block text-base leading-none mb-0.5">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className={labelCls}>Titre <span className="text-[var(--color-accent-red)]">*</span></label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder={type === AGENDA_EVENT_TYPES.RDV ? "Ex : Réunion client" : type === AGENDA_EVENT_TYPES.CONGE ? "Ex : Vacances été" : "Ex : Pense à..."}
              className={inputCls}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Dates */}
          {type === AGENDA_EVENT_TYPES.CONGE ? (
            <div>
              <p className={labelCls}>Période <span className="text-[var(--color-accent-red)]">*</span></p>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 text-[var(--color-text-dim)]`}>Du</p>
                  <input
                    type="date"
                    value={dateIso}
                    onChange={(e) => {
                      setDateIso(e.target.value);
                      if (dateFin && e.target.value > dateFin) setDateFin(e.target.value);
                    }}
                    className={inputCls}
                    disabled={loading}
                  />
                </div>
                <span className="text-lg font-black mt-5 text-[var(--color-text-dim)]">→</span>
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 text-[var(--color-text-dim)]`}>Au</p>
                  <input
                    type="date"
                    value={dateFin}
                    min={dateIso || undefined}
                    onChange={(e) => setDateFin(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Date <span className="text-[var(--color-accent-red)]">*</span></label>
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className={inputCls}
                disabled={loading}
              />
            </div>
          )}

          {/* Horaires (rdv seulement) */}
          {type === AGENDA_EVENT_TYPES.RDV && (
            <div>
              <p className={labelCls}>Horaires</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 text-[var(--color-text-dim)]`}>Début</p>
                  <input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 text-[var(--color-text-dim)]`}>Fin</p>
                  <input
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rappel (rdv seulement) */}
          {type === AGENDA_EVENT_TYPES.RDV && (
            <div>
              <label className={labelCls}>Rappel</label>
              <select
                value={rappel ?? ""}
                onChange={(e) => setRappel(e.target.value === "" ? null : Number(e.target.value))}
                className={inputCls}
                disabled={loading}
              >
                {RAPPEL_OPTIONS.map((r) => (
                  <option key={r.value ?? "none"} value={r.value ?? ""}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Notes (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
              className={`${inputCls} resize-none`}
              disabled={loading}
            />
          </div>
        </div>

        {/* Boutons */}
        <div className={`flex gap-3 mt-7 ${editMode ? "flex-col" : ""}`}>
          <div className="flex gap-3 flex-1">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] transition-[opacity,transform,background-color,color] duration-150 active:scale-95 bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] active:scale-95 transition-[opacity,transform,background-color,color,box-shadow] duration-150 shadow-lg ${
                canSubmit
                  ? `bg-gradient-to-r ${selectedType?.color || "from-emerald-600 to-teal-600"} text-white`
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)] cursor-not-allowed"
              }`}
            >
              {loading ? "⏳" : editMode ? "Modifier" : "Créer"}
            </button>
          </div>

          {editMode && (
            <button
              onClick={() => onDelete?.()}
              disabled={loading}
              className="w-full py-3 rounded-[20px] font-black uppercase text-[11px] border-2 border-red-500/40 text-red-400 hover:bg-red-500/10 transition-[background-color,border-color,color] duration-150 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


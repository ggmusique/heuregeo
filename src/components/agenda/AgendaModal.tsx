import React, { useState, useEffect } from "react";

const TYPE_OPTIONS = [
  { key: "rdv",   label: "RDV",    emoji: "📅", color: "from-blue-600 to-blue-700",   border: "border-blue-500/50",   bg: "bg-blue-500/10"   },
  { key: "conge", label: "Congé",  emoji: "🌴", color: "from-orange-500 to-orange-600", border: "border-orange-500/50", bg: "bg-orange-500/10" },
  { key: "note",  label: "Note",   emoji: "📝", color: "from-emerald-600 to-teal-600", border: "border-emerald-500/50", bg: "bg-emerald-500/10" },
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
  darkMode      = true,
}: Props) {
  const [type,        setType]       = useState("rdv");
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
      setType(initialData.type || "rdv");
      setTitre(initialData.titre || "");
      setDateIso(initialData.date_iso || selectedDate || "");
      setDateFin(initialData.date_fin || "");
      setHeureDebut(initialData.heure_debut || "");
      setHeureFin(initialData.heure_fin || "");
      setRappel(initialData.rappel_minutes ?? null);
      setDescription(initialData.description || "");
    } else {
      setType("rdv");
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
    (type !== "conge" || dateFin.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      type,
      titre: titre.trim(),
      date_iso: dateIso,
      date_fin: type === "conge" ? dateFin : null,
      heure_debut: type === "rdv" && heureDebut ? heureDebut : null,
      heure_fin:   type === "rdv" && heureFin   ? heureFin   : null,
      rappel_minutes: type === "rdv" ? rappel : null,
      description: description.trim() || null,
    });
  };

  if (!show) return null;

  const inputCls = `w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-all outline-none ${
    darkMode
      ? "bg-white/10 border-2 border-white/20 focus:border-emerald-400 focus:bg-white/15 text-white"
      : "bg-slate-100 border-2 border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900"
  }`;

  const labelCls = `block text-[10px] font-black uppercase tracking-wider mb-2 ${darkMode ? "text-white/60" : "text-slate-500"}`;

  const selectedType = TYPE_OPTIONS.find((t) => t.key === type);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 animate-in fade-in duration-200 sm:items-center">
      <div
        className={`absolute inset-0 ${darkMode ? "bg-black/60" : "bg-black/30"} backdrop-blur-sm`}
        onClick={onCancel}
      />

      <div
        className={`relative w-full max-w-md rounded-[35px] p-7 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto ${
          darkMode
            ? "bg-gradient-to-br from-[#0a1628]/98 to-[#0f1f3d]/98 text-white border border-white/10"
            : "bg-white text-slate-900 border border-slate-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">
            {editMode ? "Modifier" : "Nouvel événement"}
          </h2>
          <button
            onClick={onCancel}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${darkMode ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}
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
                  className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase transition-all ${
                    type === t.key
                      ? `bg-gradient-to-br ${t.color} text-white shadow-lg`
                      : darkMode ? "bg-white/5 text-white/40 border border-white/10" : "bg-slate-100 text-slate-400 border border-slate-200"
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
            <label className={labelCls}>Titre <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder={type === "rdv" ? "Ex : Réunion client" : type === "conge" ? "Ex : Vacances été" : "Ex : Pense à..."}
              className={inputCls}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Dates */}
          {type === "conge" ? (
            <div>
              <p className={labelCls}>Période <span className="text-red-400">*</span></p>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 ${darkMode ? "text-white/40" : "text-slate-400"}`}>Du</p>
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
                <span className={`text-lg font-black mt-5 ${darkMode ? "text-white/30" : "text-slate-300"}`}>→</span>
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 ${darkMode ? "text-white/40" : "text-slate-400"}`}>Au</p>
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
              <label className={labelCls}>Date <span className="text-red-400">*</span></label>
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
          {type === "rdv" && (
            <div>
              <p className={labelCls}>Horaires</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 ${darkMode ? "text-white/40" : "text-slate-400"}`}>Début</p>
                  <input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-[9px] font-bold uppercase mb-1 ${darkMode ? "text-white/40" : "text-slate-400"}`}>Fin</p>
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
          {type === "rdv" && (
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
              className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] transition-all active:scale-95 ${
                darkMode ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"
              } disabled:opacity-50`}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] active:scale-95 transition-all shadow-lg ${
                canSubmit
                  ? `bg-gradient-to-r ${selectedType?.color || "from-emerald-600 to-teal-600"} text-white`
                  : "bg-gray-600/30 text-white/40 cursor-not-allowed"
              }`}
            >
              {loading ? "⏳" : editMode ? "Modifier" : "Créer"}
            </button>
          </div>

          {editMode && (
            <button
              onClick={() => onDelete?.()}
              disabled={loading}
              className="w-full py-3 rounded-[20px] font-black uppercase text-[11px] border-2 border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
            >
              🗑 Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

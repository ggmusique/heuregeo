import React, { useState, useMemo } from "react";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

const TYPE_DOT = {
  rdv:   "bg-blue-500",
  conge: "bg-orange-400",
  note:  "bg-emerald-500",
};

const TYPE_BADGE = {
  rdv:   { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   emoji: "📅" },
  conge: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", emoji: "🌴" },
  note:  { bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/30",emoji: "📝" },
};

function buildCalendarGrid(year, month) {
  const firstDay  = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday = 0
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toIso(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AgendaTab({
  events       = [],
  loading      = false,
  currentYear,
  currentMonth,
  workedDays   = new Set(),
  onGoToPrev,
  onGoToNext,
  onGoToToday,
  onOpenForDate,
  onEventEdit,
  darkMode     = true,
}) {
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [selectedDay, setSelectedDay] = useState(null);

  const cells = useMemo(() => buildCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!map[e.date_iso]) map[e.date_iso] = [];
      map[e.date_iso].push(e);
    });
    return map;
  }, [events]);

  const selectedIso = selectedDay ? toIso(currentYear, currentMonth, selectedDay) : null;
  const selectedEvents = selectedIso ? (eventsByDate[selectedIso] || []) : [];

  const bg    = darkMode ? "bg-[#050510]"  : "bg-slate-50";
  const card  = darkMode ? "bg-[#0f111a] border-white/10"  : "bg-white border-slate-200";
  const text  = darkMode ? "text-white"    : "text-slate-900";
  const muted = darkMode ? "text-white/40" : "text-slate-400";

  return (
    <div className={`flex flex-col min-h-screen ${bg} pb-32`}>
      <div className="p-4 space-y-4 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="text-center pt-4 pb-1">
          <div className="text-4xl mb-2">📅</div>
          <h2 className={`text-xl font-black uppercase tracking-tighter italic ${text}`}>Agenda</h2>
        </div>

        {/* Navigation mois */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-[24px] border-2 ${card}`}>
          <button
            onClick={onGoToPrev}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-black transition-all ${darkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            ‹
          </button>

          <div className="text-center">
            <p className={`text-[15px] font-black uppercase tracking-wider ${text}`}>
              {MONTHS_FR[currentMonth - 1]} {currentYear}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGoToToday}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${darkMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"}`}
            >
              Auj.
            </button>
            <button
              onClick={onGoToNext}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-black transition-all ${darkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              ›
            </button>
          </div>
        </div>

        {/* Calendrier */}
        <div className={`rounded-[28px] border-2 overflow-hidden ${card}`}>
          {/* Jours de semaine */}
          <div className="grid grid-cols-7 border-b border-white/5">
            {DAYS_FR.map((d, i) => (
              <div key={i} className={`py-2 text-center text-[10px] font-black uppercase ${i >= 5 ? (darkMode ? "text-white/30" : "text-slate-300") : (darkMode ? "text-white/50" : "text-slate-400")}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Cellules */}
          <div className="grid grid-cols-7 p-2 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;

              const iso        = toIso(currentYear, currentMonth, day);
              const isToday    = iso === todayIso;
              const isSelected = selectedDay === day;
              const isWeekend  = (idx % 7) >= 5;
              const dayEvents  = eventsByDate[iso] || [];
              const isWorked   = workedDays.has(iso);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center pt-1 pb-1.5 rounded-2xl transition-all active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg"
                      : isToday
                      ? (darkMode ? "bg-emerald-500/20 ring-1 ring-emerald-500/50" : "bg-emerald-50 ring-1 ring-emerald-400/50")
                      : (darkMode ? "hover:bg-white/5" : "hover:bg-slate-50")
                  }`}
                >
                  <span className={`text-[13px] font-black leading-none ${
                    isSelected ? "text-white"
                    : isToday  ? (darkMode ? "text-emerald-400" : "text-emerald-600")
                    : isWeekend ? (darkMode ? "text-white/30" : "text-slate-300")
                    : (darkMode ? "text-white/80" : "text-slate-700")
                  }`}>
                    {day}
                  </span>

                  {/* Dots événements + worked */}
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[28px]">
                    {isWorked && <span className="w-1 h-1 rounded-full bg-yellow-400 opacity-80" />}
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : TYPE_DOT[e.type] || "bg-white/40"}`} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className={`text-[7px] font-black leading-none ${isSelected ? "text-white/70" : muted}`}>…</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Légende */}
          <div className={`px-4 py-3 border-t ${darkMode ? "border-white/5" : "border-slate-100"} flex flex-wrap gap-3`}>
            {[
              { dot: "bg-yellow-400",   label: "Travaillé" },
              { dot: "bg-blue-500",     label: "RDV" },
              { dot: "bg-orange-400",   label: "Congé" },
              { dot: "bg-emerald-500",  label: "Note" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                <span className={`text-[9px] font-bold uppercase ${muted}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel jour sélectionné */}
        {selectedDay && (
          <div className={`rounded-[28px] border-2 p-5 space-y-3 ${card}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-black uppercase tracking-wider ${text}`}>
                {new Date(selectedIso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <button
                onClick={() => onOpenForDate?.(selectedIso)}
                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-lg flex items-center justify-center hover:bg-emerald-500/30 transition-all font-black"
              >
                +
              </button>
            </div>

            {loading && (
              <p className={`text-[12px] ${muted}`}>Chargement…</p>
            )}

            {!loading && selectedEvents.length === 0 && (
              <p className={`text-[12px] italic ${muted}`}>Aucun événement — appuyez sur + pour en créer un.</p>
            )}

            {selectedEvents.map((evt) => {
              const badge = TYPE_BADGE[evt.type] || TYPE_BADGE.note;
              return (
                <button
                  key={evt.id}
                  onClick={() => onEventEdit?.(evt)}
                  className={`w-full text-left p-4 rounded-2xl border-2 ${badge.bg} ${badge.border} transition-all hover:opacity-80 active:scale-95`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-black truncate ${badge.text}`}>
                        {badge.emoji} {evt.titre}
                      </p>
                      {evt.heure_debut && (
                        <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? "text-white/40" : "text-slate-400"}`}>
                          {evt.heure_debut.slice(0, 5)}{evt.heure_fin ? ` → ${evt.heure_fin.slice(0, 5)}` : ""}
                          {evt.rappel_minutes ? ` · 🔔 ${evt.rappel_minutes < 60 ? evt.rappel_minutes + " min" : (evt.rappel_minutes / 60) + "h"}` : ""}
                        </p>
                      )}
                      {evt.description && (
                        <p className={`text-[10px] mt-1 truncate ${darkMode ? "text-white/30" : "text-slate-400"}`}>{evt.description}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase ${muted} shrink-0`}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Bouton créer événement si aucun jour sélectionné */}
        {!selectedDay && (
          <button
            onClick={() => onOpenForDate?.(todayIso)}
            className="w-full py-4 rounded-2xl font-black uppercase text-[12px] tracking-wider bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg active:scale-95 transition-all"
          >
            + Nouvel événement
          </button>
        )}
      </div>
    </div>
  );
}

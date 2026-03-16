import React, { useState, useMemo } from "react";
import { getWeekNumber } from "../utils/dateUtils";
import { AgendaWeekView } from "../components/agenda/AgendaWeekView";
import { useTheme } from "../contexts/ThemeContext";

// ─── Constantes ────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const MONTHS_SHORT = [
  "Jan","Fév","Mar","Avr","Mai","Jun",
  "Jul","Aoû","Sep","Oct","Nov","Déc",
];
const DAYS_FR = ["L","M","M","J","V","S","D"];

const TYPE_BAR = {
  conge: { bg: "rgba(249,115,22,0.80)", text: "#fff" },
};

const TYPE_PILL = {
  rdv:   "bg-blue-500/25   text-blue-300",
  conge: "bg-orange-500/25 text-orange-300",
  note:  "bg-emerald-500/25 text-emerald-300",
};

// ─── Helpers ─────────────────────────────────────────────

function toIso(year, month, day) {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function buildCalendarGrid(year, month) {
  const firstDay    = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function computeWeekBars(weekDays, year, month, rawEvents) {
  const multiMap = new Map();

  rawEvents.forEach((e) => {
    if (e.type !== "conge" || !e.date_fin || e.date_fin === e.date_iso) return;
    weekDays.forEach((day) => {
      if (!day) return;
      const iso = toIso(year, month, day);
      if (iso >= e.date_iso && iso <= e.date_fin) multiMap.set(e.id, e);
    });
  });

  const bars = [];
  multiMap.forEach((e) => {
    let startCol = -1, endCol = -1;
    weekDays.forEach((day, col) => {
      if (!day) return;
      const iso = toIso(year, month, day);
      if (iso >= e.date_iso && iso <= e.date_fin) {
        if (startCol === -1) startCol = col;
        endCol = col;
      }
    });
    if (startCol === -1) return;
    bars.push({ id: e.id, titre: e.titre, startCol, spanCols: endCol - startCol + 1, lane: 0 });
  });

  bars.sort((a, b) => a.startCol - b.startCol || b.spanCols - a.spanCols);
  const occ = [];
  bars.forEach((bar) => {
    let l = 0;
    while (true) {
      if (!occ[l]) occ[l] = Array(7).fill(false);
      let free = true;
      for (let c = bar.startCol; c < bar.startCol + bar.spanCols; c++) {
        if (occ[l][c]) { free = false; break; }
      }
      if (free) {
        bar.lane = l;
        for (let c = bar.startCol; c < bar.startCol + bar.spanCols; c++) occ[l][c] = true;
        break;
      }
      l++;
    }
  });

  return bars;
}

// ─── Composant ─────────────────────────────────────────────

export function AgendaTab({
  events           = [],
  loading          = false,
  currentYear,
  currentMonth,
  currentWeekStart,
  workedDays       = new Set(),
  onGoToPrev,
  onGoToNext,
  onGoToToday,
  onGoToPrevWeek,
  onGoToNextWeek,
  onOpenForDate,
  onEventEdit,
}) {
  const { isDark } = useTheme();
  const today    = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [view,         setView]         = useState("month");
  const [selectedDay,  setSelectedDay]  = useState(null);

  const cells = useMemo(() => buildCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (e.type === "conge" && e.date_fin) {
        let cur = new Date(e.date_iso + "T12:00:00");
        const end = new Date(e.date_fin + "T12:00:00");
        while (cur <= end) {
          const iso = cur.toISOString().slice(0, 10);
          if (!map[iso]) map[iso] = [];
          if (!map[iso].find((x) => x.id === e.id)) map[iso].push(e);
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        if (!map[e.date_iso]) map[e.date_iso] = [];
        map[e.date_iso].push(e);
      }
    });
    return map;
  }, [events]);

  const selectedIso    = selectedDay ? toIso(currentYear, currentMonth, selectedDay) : null;
  const selectedEvents = selectedIso ? (eventsByDate[selectedIso] || []) : [];

  const bg    = isDark ? "bg-[#050510]"                 : "bg-slate-50";
  const card  = isDark ? "bg-[#0f111a] border-white/10"  : "bg-white border-slate-200";
  const text  = isDark ? "text-white"                   : "text-slate-900";
  const muted = isDark ? "text-white/40"                : "text-slate-400";

  const handlePrev = () => (view === "week" ? onGoToPrevWeek?.() : onGoToPrev?.());
  const handleNext = () => (view === "week" ? onGoToNextWeek?.() : onGoToNext?.());

  const weekTitle = useMemo(() => {
    if (!currentWeekStart) return "";
    const mon = new Date(currentWeekStart + "T12:00:00");
    const sun = new Date(currentWeekStart + "T12:00:00");
    sun.setDate(mon.getDate() + 6);
    const wn = getWeekNumber(mon);
    const d1 = mon.getDate();
    const d2 = sun.getDate();
    const m1 = MONTHS_SHORT[mon.getMonth()];
    const m2 = MONTHS_SHORT[sun.getMonth()];
    return mon.getMonth() === sun.getMonth()
      ? `S${wn} · ${d1}-${d2} ${m1}`
      : `S${wn} · ${d1} ${m1} – ${d2} ${m2}`;
  }, [currentWeekStart]);

  const navTitle = view === "week"
    ? weekTitle
    : `${MONTHS_FR[currentMonth - 1]} ${currentYear}`;

  return (
    <div className={`flex flex-col min-h-screen ${bg} pb-32`}>
      <div className="p-4 space-y-4 max-w-sm mx-auto w-full">

        <div className="text-center pt-4 pb-1">
          <div className="text-4xl mb-2">📅</div>
          <h2 className={`text-xl font-black uppercase tracking-tighter italic ${text}`}>Agenda</h2>
        </div>

        <div className={`flex items-center justify-between px-3 py-2.5 rounded-[24px] border-2 ${card}`}>
          <button
            onClick={handlePrev}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xl font-black transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            ‹
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <p className={`text-[14px] font-black uppercase tracking-wider ${text}`}>{navTitle}</p>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${
                  view === "month"
                    ? "bg-indigo-600 text-white"
                    : isDark ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${
                  view === "week"
                    ? "bg-indigo-600 text-white"
                    : isDark ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Semaine
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onGoToToday}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-all ${isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"}`}
            >
              Auj.
            </button>
            <button
              onClick={handleNext}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xl font-black transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              ›
            </button>
          </div>
        </div>

        {view === "month" && (
          <div className={`rounded-[28px] border-2 overflow-hidden ${card}`}>
            <div className={`grid grid-cols-7 border-b ${isDark ? "border-white/5" : "border-slate-100"}`}>
              {DAYS_FR.map((d, i) => (
                <div
                  key={i}
                  className={`py-2 text-center text-[9px] font-black uppercase ${
                    i >= 5
                      ? (isDark ? "text-white/25" : "text-slate-300")
                      : (isDark ? "text-white/45" : "text-slate-400")
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {weeks.map((weekDays, wIdx) => {
              const bars        = computeWeekBars(weekDays, currentYear, currentMonth, events);
              const nbLanes     = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;
              const barsHeight  = nbLanes * 22;
              const barIdsInWeek = new Set(bars.map((b) => b.id));

              return (
                <div
                  key={wIdx}
                  className={`border-b last:border-b-0 ${isDark ? "border-white/5" : "border-slate-100"}`}
                >
                  {nbLanes > 0 && (
                    <div className="relative mx-0.5" style={{ height: barsHeight + "px" }}>
                      {bars.map((bar) => (
                        <button
                          key={bar.id}
                          onClick={() => {
                            const ev = events.find((e) => e.id === bar.id);
                            if (ev) onEventEdit?.(ev);
                          }}
                          className="absolute rounded-[5px] px-1.5 text-[9px] font-black truncate flex items-center active:opacity-70 transition-opacity"
                          style={{
                            left:       `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                            width:      `calc(${(bar.spanCols  / 7) * 100}% - 4px)`,
                            top:        `${bar.lane * 22 + 2}px`,
                            height:     "18px",
                            background: TYPE_BAR.conge.bg,
                            color:      TYPE_BAR.conge.text,
                          }}
                        >
                          🌴 {bar.titre}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-7">
                    {weekDays.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="min-h-[60px]" />;

                      const iso        = toIso(currentYear, currentMonth, day);
                      const isToday    = iso === todayIso;
                      const isSelected = selectedDay === day;
                      const isWeekend  = dIdx % 7 >= 5;
                      const isWorked   = workedDays.has(iso);
                      const allEvts    = eventsByDate[iso] || [];
                      const pillEvts   = allEvts.filter((e) => !barIdsInWeek.has(e.id));

                      return (
                        <button
                          key={dIdx}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`flex flex-col items-start p-0.5 min-h-[60px] rounded-xl transition-all active:scale-95 ${
                            isSelected
                              ? (isDark ? "bg-emerald-600/25 ring-1 ring-emerald-500/40" : "bg-emerald-50 ring-1 ring-emerald-400/40")
                              : isToday
                              ? (isDark ? "bg-emerald-500/10" : "bg-emerald-50/60")
                              : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                          }`}
                        >
                          <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                            isSelected
                              ? "bg-emerald-500 text-white"
                              : isToday
                              ? (isDark ? "bg-emerald-500/30 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                              : isWeekend
                              ? (isDark ? "text-white/25" : "text-slate-300")
                              : (isDark ? "text-white/80" : "text-slate-700")
                          }`}>
                            {day}
                          </span>

                          {isWorked && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 self-center flex-shrink-0 mt-0.5" />
                          )}

                          <div className="w-full flex flex-col gap-[2px] mt-0.5">
                            {pillEvts.slice(0, 2).map((e, ei) => (
                              <div
                                key={ei}
                                className={`w-full rounded-[3px] px-1 text-[8px] font-bold truncate leading-tight py-[1px] ${TYPE_PILL[e.type] || TYPE_PILL.note}`}
                              >
                                {e.type === "rdv" && e.heure_debut
                                  ? e.heure_debut.slice(0, 5) + " "
                                  : ""}
                                {e.titre}
                              </div>
                            ))}
                            {pillEvts.length > 2 && (
                              <span className={`text-[7px] pl-1 ${muted}`}>
                                +{pillEvts.length - 2}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className={`px-4 py-3 border-t ${isDark ? "border-white/5" : "border-slate-100"} flex flex-wrap gap-3`}>
              {[
                { dot: "bg-yellow-400",  label: "Travaillé" },
                { dot: "bg-blue-500",    label: "RDV"       },
                { dot: "bg-orange-400",  label: "Congé"     },
                { dot: "bg-emerald-500", label: "Note"      },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                  <span className={`text-[9px] font-bold uppercase ${muted}`}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "week" && currentWeekStart && (
          <AgendaWeekView
            events={events}
            weekStart={currentWeekStart}
            workedDays={workedDays}
            onOpenForDate={onOpenForDate}
            onEventEdit={onEventEdit}
          />
        )}

        {view === "month" && selectedDay && (
          <div className={`rounded-[28px] border-2 p-5 space-y-3 ${card}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-black uppercase tracking-wider ${text}`}>
                {new Date(selectedIso + "T12:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </p>
              <button
                onClick={() => onOpenForDate?.(selectedIso)}
                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-xl flex items-center justify-center hover:bg-emerald-500/30 transition-all font-black"
              >
                +
              </button>
            </div>

            {loading && <p className={`text-[12px] ${muted}`}>Chargement…</p>}

            {!loading && selectedEvents.length === 0 && (
              <p className={`text-[12px] italic ${muted}`}>
                Aucun événement — appuyez sur + pour en créer un.
              </p>
            )}

            {selectedEvents.map((evt) => {
              const badges = {
                rdv:   { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30",    emoji: "📅" },
                conge: { bg: "bg-orange-500/15",   text: "text-orange-400",  border: "border-orange-500/30",  emoji: "🌴" },
                note:  { bg: "bg-emerald-500/15",  text: "text-emerald-400", border: "border-emerald-500/30", emoji: "📝" },
              };
              const badge = badges[evt.type] || { bg: "bg-white/5", text, border: "border-white/10", emoji: "📌" };
              const fmtD  = (iso) =>
                new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

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
                      {evt.type === "conge" && evt.date_fin ? (
                        <p className={`text-[10px] font-bold mt-0.5 ${muted}`}>
                          {fmtD(evt.date_iso)} → {fmtD(evt.date_fin)}
                        </p>
                      ) : evt.heure_debut ? (
                        <p className={`text-[10px] font-bold mt-0.5 ${muted}`}>
                          {evt.heure_debut.slice(0, 5)}
                          {evt.heure_fin ? ` → ${evt.heure_fin.slice(0, 5)}` : ""}
                          {evt.rappel_minutes
                            ? ` · 🔔 ${evt.rappel_minutes < 60 ? evt.rappel_minutes + " min" : evt.rappel_minutes / 60 + "h"}`
                            : ""}
                        </p>
                      ) : null}
                      {evt.description && (
                        <p className={`text-[10px] mt-1 truncate ${muted} opacity-70`}>{evt.description}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-black ${muted} shrink-0`}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {view === "month" && !selectedDay && (
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

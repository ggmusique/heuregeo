import React, { useState, useEffect, useMemo } from "react";

const HOUR_START   = 7;
const HOUR_END     = 22;
const PX_PER_HOUR  = 64;
const HOURS        = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;

const DAYS_ABBR  = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  rdv:   { bg: "bg-blue-500/80",    text: "text-white",       border: "border-blue-400/50"   },
  conge: { bg: "bg-orange-500/80",  text: "text-white",       border: "border-orange-400/50" },
  note:  { bg: "bg-emerald-500/80", text: "text-white",       border: "border-emerald-400/50"},
};

const ALLDAY_COLORS: Record<string, { bg: string; text: string }> = {
  conge: { bg: "rgba(249,115,22,0.75)",  text: "#fff" },
  note:  { bg: "rgba(16,185,129,0.75)",  text: "#fff" },
  rdv:   { bg: "rgba(59,130,246,0.75)",  text: "#fff" },
};

function addDaysToIso(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function eventTopPx(heure_debut: string): number {
  const mins = timeToMinutes(heure_debut);
  return ((mins - HOUR_START * 60) / 60) * PX_PER_HOUR;
}

function eventHeightPx(heure_debut: string, heure_fin: string | null): number {
  if (!heure_fin) return 32;
  const start = timeToMinutes(heure_debut);
  const end   = timeToMinutes(heure_fin);
  const durationH = (end - start) / 60;
  return Math.max(28, durationH * PX_PER_HOUR);
}

function computeAllDayBars(allDayEvents: any[], weekDays: any[]): any[] {
  const bars: any[] = [];

  allDayEvents.forEach((e) => {
    const startIso = e.date_iso;
    const endIso   = e.date_fin || e.date_iso;

    let startCol = -1, endCol = -1;
    weekDays.forEach((d: any, col: number) => {
      if (d.iso >= startIso && d.iso <= endIso) {
        if (startCol === -1) startCol = col;
        endCol = col;
      }
    });
    if (startCol === -1) return;
    bars.push({ id: e.id, titre: e.titre, type: e.type, startCol, spanCols: endCol - startCol + 1, lane: 0 });
  });

  bars.sort((a, b) => a.startCol - b.startCol || b.spanCols - a.spanCols);
  const occ: boolean[][] = [];
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

interface Props {
  events?: any[];
  weekStart: string;
  workedDays?: Set<string>;
  onOpenForDate?: (iso: string) => void;
  onEventEdit?: (event: any) => void;
  darkMode?: boolean;
}

export function AgendaWeekView({
  events        = [],
  weekStart,
  workedDays    = new Set(),
  onOpenForDate,
  onEventEdit,
  darkMode      = true,
}: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + "T12:00:00");
      d.setDate(d.getDate() + i);
      return { iso: d.toISOString().slice(0, 10), date: d };
    });
  }, [weekStart]);

  const todayIso     = now.toISOString().slice(0, 10);
  const todayColIdx  = weekDays.findIndex((d) => d.iso === todayIso);
  const todayInWeek  = todayColIdx !== -1;

  const currentTimePx = todayInWeek
    ? ((now.getHours() - HOUR_START) + now.getMinutes() / 60) * PX_PER_HOUR
    : -1;

  const weekIsoSet = useMemo(() => new Set(weekDays.map((d) => d.iso)), [weekDays]);

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: any[] = [];
    const timed: any[]  = [];

    events.forEach((e) => {
      const startIso = e.date_iso;
      const endIso   = e.date_fin || e.date_iso;

      if (e.type === "rdv" && e.heure_debut && weekIsoSet.has(startIso)) {
        timed.push(e);
      } else {
        const overlaps = weekDays.some((d) => d.iso >= startIso && d.iso <= endIso);
        if (overlaps) allDay.push(e);
      }
    });

    return { allDayEvents: allDay, timedEvents: timed };
  }, [events, weekDays, weekIsoSet]);

  const allDayBars = useMemo(
    () => computeAllDayBars(allDayEvents, weekDays),
    [allDayEvents, weekDays]
  );
  const nbAllDayLanes = allDayBars.length > 0 ? Math.max(...allDayBars.map((b) => b.lane)) + 1 : 0;
  const allDayHeight  = nbAllDayLanes * 22 + (nbAllDayLanes > 0 ? 8 : 0);

  const card   = darkMode ? "bg-[#0f111a] border-white/10" : "bg-white border-slate-200";
  const sep    = darkMode ? "border-white/5"               : "border-slate-100";
  const muted  = darkMode ? "text-white/35"                : "text-slate-400";
  const colSep = darkMode ? "border-white/5"               : "border-slate-100";
  const hourLn = darkMode ? "border-white/5"               : "border-slate-100";

  return (
    <div className={`rounded-[28px] border-2 overflow-hidden ${card}`}>

      <div className={`flex border-b ${sep}`}>
        <div className="w-10 flex-shrink-0" />
        {weekDays.map((d, i) => {
          const isToday   = d.iso === todayIso;
          const isWorked  = workedDays.has(d.iso);
          const isWeekend = i >= 5;
          return (
            <button
              key={i}
              onClick={() => onOpenForDate?.(d.iso)}
              className={`flex-1 flex flex-col items-center py-2 px-0.5 gap-0.5 transition-colors ${
                isWeekend
                  ? (darkMode ? "text-white/30" : "text-slate-300")
                  : (darkMode ? "text-white/70" : "text-slate-600")
              } ${darkMode ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
            >
              <span className="text-[8px] font-black uppercase">{DAYS_ABBR[i].charAt(0)}</span>
              <span className={`text-[13px] font-black w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? "bg-emerald-500 text-white" : ""
              }`}>
                {d.date.getDate()}
              </span>
              {isWorked && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />}
            </button>
          );
        })}
      </div>

      {nbAllDayLanes > 0 && (
        <div className={`relative border-b ${sep} mx-0.5`} style={{ height: allDayHeight + "px" }}>
          <div style={{ marginLeft: "40px", position: "relative", height: "100%" }}>
            {allDayBars.map((bar) => (
              <button
                key={bar.id}
                onClick={() => {
                  const ev = events.find((e) => e.id === bar.id);
                  if (ev) onEventEdit?.(ev);
                }}
                className="absolute rounded-[5px] px-1.5 text-[9px] font-black truncate flex items-center active:opacity-70 transition-opacity"
                style={{
                  left:       `calc(${(bar.startCol / 7) * 100}% + 1px)`,
                  width:      `calc(${(bar.spanCols  / 7) * 100}% - 2px)`,
                  top:        `${bar.lane * 22 + 4}px`,
                  height:     "18px",
                  background: ALLDAY_COLORS[bar.type]?.bg || ALLDAY_COLORS.note.bg,
                  color:      ALLDAY_COLORS[bar.type]?.text || "#fff",
                }}
              >
                {bar.type === "conge" ? "🌴 " : bar.type === "note" ? "📝 " : "📅 "}
                {bar.titre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
        <div className="flex" style={{ height: `${TOTAL_HEIGHT}px` }}>

          <div className="w-10 flex-shrink-0 relative">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className={`absolute w-full flex items-center justify-end pr-1.5 select-none ${muted}`}
                style={{ top: `${i * PX_PER_HOUR - 7}px`, fontSize: "8px", fontWeight: 900 }}
              >
                {i > 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {HOURS.map((_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 border-t ${hourLn}`}
                style={{ top: `${i * PX_PER_HOUR}px` }}
              />
            ))}

            <div className="absolute inset-0 grid grid-cols-7 h-full">
              {weekDays.map((d, colIdx) => {
                const isToday  = d.iso === todayIso;
                const rdvEvts  = timedEvents.filter((e) => e.date_iso === d.iso);

                return (
                  <div
                    key={colIdx}
                    className={`relative h-full border-l ${colSep} first:border-l-0 ${
                      isToday ? (darkMode ? "bg-emerald-500/5" : "bg-emerald-50/40") : ""
                    }`}
                  >
                    {rdvEvts.map((e) => {
                      const top  = eventTopPx(e.heure_debut);
                      const h    = eventHeightPx(e.heure_debut, e.heure_fin);
                      const clr  = EVENT_COLORS[e.type] || EVENT_COLORS.rdv;
                      const tall = h >= 48;

                      return (
                        <button
                          key={e.id}
                          onClick={() => onEventEdit?.(e)}
                          className={`absolute left-[2px] right-[2px] rounded-[6px] overflow-hidden border ${clr.bg} ${clr.border} ${clr.text} text-left px-1.5 transition-opacity active:opacity-70`}
                          style={{ top: `${top}px`, height: `${h}px` }}
                        >
                          <p className="text-[8px] font-black leading-tight truncate">
                            {e.heure_debut.slice(0, 5)}
                          </p>
                          <p className="text-[9px] font-bold leading-tight truncate mt-[1px]">
                            {e.titre}
                          </p>
                          {tall && e.heure_fin && (
                            <p className="text-[7px] opacity-80 leading-tight mt-[1px]">
                              → {e.heure_fin.slice(0, 5)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {currentTimePx >= 0 && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: `${currentTimePx}px` }}
              >
                <div className="relative flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-[5px]" />
                  <div className="flex-1 h-[2px] bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`p-3 border-t ${sep}`}>
        <button
          onClick={() => {
            const target = weekDays.find((d) => d.iso === todayIso) || weekDays[0];
            onOpenForDate?.(target.iso);
          }}
          className="w-full py-3 rounded-2xl font-black uppercase text-[11px] tracking-wider bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg active:scale-95 transition-all"
        >
          + Nouvel événement
        </button>
      </div>
    </div>
  );
}

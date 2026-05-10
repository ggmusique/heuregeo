import React, { useRef, useState, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarApi } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { Clock, CalendarDays, Umbrella, ChevronLeft, ChevronRight } from "lucide-react";

import { KPICard } from "./KPICard";
import { DayDetailModal } from "./DayDetailModal";
import type { ClickedEvent } from "./DayDetailModal";
import { useAgendaEvents } from "../../hooks/useAgendaEvents";
import type { AgendaEvent } from "../../types/entities";
import "../../styles/fullcalendar-neon.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type FCView = "timeGridDay" | "timeGridWeek" | "dayGridMonth";

interface AgendaPageProps {
  userId: string | null;
  triggerAlert: (msg: string) => void;
  onOpenForDate: (dateIso: string) => void;
  onEventEdit: (event: AgendaEvent) => void;
  onEventDelete: (id: string) => Promise<void>;
  /** Increment to trigger a data refetch (e.g. after modal CRUD). */
  refreshKey?: number;
}

// ─── Breakpoint hook ──────────────────────────────────────────────────────────

function useBreakpoint() {
  const getWidth = () =>
    typeof window !== "undefined" ? window.innerWidth : 1280;
  const [width, setWidth] = useState<number>(getWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
}

// ─── View configs ─────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<FCView, { full: string; short: string }> = {
  timeGridDay: { full: "Jour", short: "J" },
  timeGridWeek: { full: "Semaine", short: "S" },
  dayGridMonth: { full: "Mois", short: "M" },
};

const VIEWS_DESKTOP: FCView[] = ["timeGridDay", "timeGridWeek", "dayGridMonth"];
const VIEWS_MOBILE: FCView[] = ["timeGridDay", "dayGridMonth"];

// ─── Locale helpers ───────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatCalendarTitle(api: CalendarApi, view: FCView): string {
  const d = api.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const year = d.getFullYear();

  if (view === "dayGridMonth") {
    return `${month} ${year}`;
  }
  if (view === "timeGridDay") {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return `${days[d.getDay()]} ${d.getDate()} ${month} ${year}`;
  }
  // timeGridWeek — show "Sem. N · Month Year"
  const weekNum = getISOWeek(d);
  return `Sem. ${weekNum} · ${month} ${year}`;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgendaPage({
  userId,
  triggerAlert,
  onOpenForDate,
  onEventEdit,
  onEventDelete,
  refreshKey = 0,
}: AgendaPageProps) {
  const { isMobile } = useBreakpoint();
  const visibleViews = isMobile ? VIEWS_MOBILE : VIEWS_DESKTOP;

  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentView, setCurrentView] = useState<FCView>(
    isMobile ? "dayGridMonth" : "timeGridWeek"
  );
  const [calendarTitle, setCalendarTitle] = useState<string>("");
  const [detailEvent, setDetailEvent] = useState<ClickedEvent | null>(null);

  const { fcEvents, kpis, loading, refetch } = useAgendaEvents({ userId, triggerAlert });

  // Refetch when refreshKey changes (e.g. after modal save/delete)
  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey]); // intentionally omit `refetch` to avoid loop on first render

  // Fallback: force dark background on FullCalendar header cells after render
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".fc-col-header-cell").forEach((el) => {
        el.style.setProperty("background", "#0d1117", "important");
        el.style.setProperty("border-color", "rgba(34,211,238,0.15)", "important");
      });
      document.querySelectorAll<HTMLElement>(".fc-scrollgrid-sync-inner").forEach((el) => {
        el.style.setProperty("background", "#0d1117", "important");
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Calendar API helpers ────────────────────────────────────────────────────

  const getApi = useCallback((): CalendarApi | null => {
    return calendarRef.current?.getApi() ?? null;
  }, []);

  const handleViewChange = useCallback((view: FCView) => {
    const api = getApi();
    if (!api) return;
    api.changeView(view);
    setCurrentView(view);
    // title updated in datesSet callback
  }, [getApi]);

  const handlePrev = useCallback(() => {
    getApi()?.prev();
  }, [getApi]);

  const handleNext = useCallback(() => {
    getApi()?.next();
  }, [getApi]);

  const handleToday = useCallback(() => {
    getApi()?.today();
  }, [getApi]);

  // ── FullCalendar event handlers ─────────────────────────────────────────────

  const handleDateClick = useCallback((info: DateClickArg) => {
    const iso = info.dateStr.slice(0, 10);
    onOpenForDate(iso);
  }, [onOpenForDate]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const ep = info.event.extendedProps;
    setDetailEvent({
      id: info.event.id,
      title: info.event.title,
      startStr: info.event.startStr,
      type: typeof ep.type === "string" ? ep.type : "rdv",
      debut: typeof ep.debut === "string" ? ep.debut : null,
      fin: typeof ep.fin === "string" ? ep.fin : null,
      client: typeof ep.client === "string" ? ep.client : null,
      lieu: typeof ep.lieu === "string" ? ep.lieu : null,
      description: typeof ep.description === "string" ? ep.description : null,
      originalAgendaEvent: ep.originalAgendaEvent as AgendaEvent | undefined,
    });
  }, []);

  const handleDetailEdit = useCallback((agendaEvent: AgendaEvent) => {
    setDetailEvent(null);
    onEventEdit(agendaEvent);
  }, [onEventEdit]);

  const handleDetailDelete = useCallback(async (fcId: string) => {
    // Strip 'agenda-' prefix to get the DB uuid
    const dbId = fcId.replace(/^agenda-/, "");
    await onEventDelete(dbId);
    await refetch();
    setDetailEvent(null);
  }, [onEventDelete, refetch]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-8">
      {detailEvent && (
        <DayDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={handleDetailEdit}
          onDelete={handleDetailDelete}
        />
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
        <KPICard
          title="Heures / semaine"
          value={kpis.hoursThisWeek}
          icon={Clock}
          glowColor="cyan"
        />
        <KPICard
          title="Prochain shift"
          value={kpis.nextShiftLabel}
          icon={CalendarDays}
          glowColor="violet"
        />
        <KPICard
          title="Congés restants"
          value={String(kpis.remainingLeaves)}
          icon={Umbrella}
          glowColor="green"
          subtitle={kpis.remainingLeaves === 1 ? "période" : "périodes"}
        />
      </div>

      {/* ── Calendar Container ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-gray-900/60 backdrop-blur overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.07)]">

        {/* ── Custom Toolbar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-white/6">

          {/* Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrev}
              aria-label="Précédent"
              className="flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 transition-all duration-200"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={handleToday}
              className="px-3 h-11 sm:h-8 text-xs font-semibold rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all duration-200"
            >
              Aujourd&apos;hui
            </button>

            <button
              onClick={handleNext}
              aria-label="Suivant"
              className="flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 transition-all duration-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Title */}
          <span className="text-sm font-bold text-white/80 tracking-wide min-w-0 truncate flex-1 text-center sm:flex-none">
            {calendarTitle}
          </span>

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/8 p-1">
            {visibleViews.map((view) => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className={[
                  "px-2 sm:px-3 h-9 sm:h-auto sm:py-1 text-xs font-semibold rounded-lg transition-all duration-200",
                  currentView === view
                    ? "bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/8",
                ].join(" ")}
              >
                <span className="hidden sm:inline">{VIEW_LABELS[view].full}</span>
                <span className="sm:hidden">{VIEW_LABELS[view].short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading overlay ──────────────────────────────────────────────── */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        )}

        {/* ── FullCalendar ─────────────────────────────────────────────────── */}
        <div className="p-3 relative">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "dayGridMonth" : "timeGridWeek"}
            headerToolbar={false}
            locale="fr"
            firstDay={1}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            height="auto"
            events={fcEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            datesSet={(info) => {
              const api = getApi();
              if (!api) return;
              const view = api.view.type as FCView;
              setCurrentView(view);
              setCalendarTitle(formatCalendarTitle(api, view));
            }}
            nowIndicator
            selectable={false}
            allDaySlot
            dayMaxEvents={3}
            displayEventTime={false}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}

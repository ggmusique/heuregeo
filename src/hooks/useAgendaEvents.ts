import { useState, useEffect, useCallback } from "react";
import type { EventInput } from "@fullcalendar/core";
import { supabase } from "../services/supabase";
import type { AgendaEvent } from "../types/entities";
import type { Mission } from "../types/entities";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO string of monday of the week containing `date`. */
function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Add `days` to an ISO date string. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Convert "HH:MM" to decimal hours. */
function hmToHours(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h + m / 60;
}

/** Format decimal hours as "Xh YYmin" or "Xh". */
function formatHours(h: number): string {
  const wholeH = Math.floor(h);
  const mins = Math.round((h - wholeH) * 60);
  if (mins === 0) return `${wholeH}h`;
  return `${wholeH}h ${String(mins).padStart(2, "0")}min`;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/** Map a Mission row to a FullCalendar EventInput. */
function missionToFCEvent(m: Mission & { notes?: string | null }): EventInput {
  const dateKey = m.date_iso ?? "";
  const label = (m.client ?? "Mission") + " · " + m.debut + " → " + m.fin;
  return {
    id: `mission-${m.id}`,
    title: label,
    start: `${dateKey}T${m.debut}:00`,
    end: `${dateKey}T${m.fin}:00`,
    className: "event-travail",
    editable: false,
    extendedProps: {
      type: "travail",
      debut: m.debut,
      fin: m.fin,
      client: m.client,
      lieu: m.lieu,
      notes: m.notes ?? null,
    },
  };
}

/** Map an AgendaEvent row to a FullCalendar EventInput. */
function agendaEventToFCEvent(e: AgendaEvent): EventInput {
  const hasTime = Boolean(e.heure_debut);
  const start = hasTime ? `${e.date_iso}T${e.heure_debut}` : e.date_iso;

  let end: string | undefined;
  if (hasTime && e.heure_fin) {
    end = `${e.date_iso}T${e.heure_fin}`;
  } else if (!hasTime && e.date_fin) {
    end = addDays(e.date_fin, 1);
  }

  const type = e.type ?? "rdv";

  return {
    id: `agenda-${e.id}`,
    title: e.titre,
    start,
    end,
    allDay: !hasTime,
    className: `event-${type}`,
    editable: true,
    extendedProps: {
      type,
      debut: e.heure_debut ?? null,
      fin: e.heure_fin ?? null,
      description: e.description ?? null,
      originalAgendaEvent: e,
    },
  };
}

// ─── KPI helpers ──────────────────────────────────────────────────────────────

export interface AgendaKPIs {
  hoursThisWeek: string;
  nextShiftLabel: string;
  remainingLeaves: number;
}

function computeKPIs(
  missions: Mission[],
  agendaEvents: AgendaEvent[],
  today: Date
): AgendaKPIs {
  const todayIso = today.toISOString().slice(0, 10);
  const weekStart = getMondayOf(today);
  const weekEnd = addDays(weekStart, 6);

  // Hours this week: sum (fin - debut - pause) for missions in current week
  let totalHours = 0;
  missions.forEach((m) => {
    const dateKey = m.date_iso ?? "";
    if (!dateKey || dateKey < weekStart || dateKey > weekEnd) return;
    if (!m.debut || !m.fin) return;
    const start = hmToHours(m.debut);
    const end = hmToHours(m.fin);
    const pauseHours = (m.pause ?? 0) / 60;
    if (end > start) totalHours += end - start - pauseHours;
  });

  // Next shift: first mission with date >= today
  const futureMissions = missions
    .filter((m) => {
      const dateKey = m.date_iso ?? "";
      return Boolean(dateKey) && dateKey >= todayIso && m.debut;
    })
    .sort((a, b) => {
      const aKey = `${a.date_iso}T${a.debut}`;
      const bKey = `${b.date_iso}T${b.debut}`;
      return aKey.localeCompare(bKey);
    });

  const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const MONTHS_SHORT = [
    "jan", "fév", "mar", "avr", "mai", "jun",
    "jul", "aoû", "sep", "oct", "nov", "déc",
  ];

  let nextShiftLabel = "Aucun";
  if (futureMissions.length > 0) {
    const next = futureMissions[0];
    const dateKey = next.date_iso ?? "";
    if (dateKey === todayIso) {
      nextShiftLabel = `Aujourd'hui ${next.debut}`;
    } else {
      const d = new Date(dateKey + "T12:00:00");
      nextShiftLabel = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${next.debut}`;
    }
  }

  // Remaining leaves: conge events from today onwards
  const remainingLeaves = agendaEvents.filter(
    (e) => e.type === "conge" && (e.date_fin ?? e.date_iso) >= todayIso
  ).length;

  return {
    hoursThisWeek: formatHours(totalHours),
    nextShiftLabel,
    remainingLeaves,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseAgendaEventsReturn {
  fcEvents: EventInput[];
  kpis: AgendaKPIs;
  loading: boolean;
  refetch: () => Promise<void>;
}

interface UseAgendaEventsParams {
  userId: string | null;
  triggerAlert: (msg: string) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAgendaEvents({
  userId,
  triggerAlert,
}: UseAgendaEventsParams): UseAgendaEventsReturn {
  const [fcEvents, setFcEvents] = useState<EventInput[]>([]);
  const [kpis, setKpis] = useState<AgendaKPIs>({
    hoursThisWeek: "0h",
    nextShiftLabel: "Aucun",
    remainingLeaves: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refetch = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch the full current year so all months are available in memory;
      // FullCalendar filters what it displays based on the navigated view.
      const today = new Date();
      const currentYear = today.getFullYear();
      const fromIso = `${currentYear}-01-01`;
      const toIso = `${currentYear}-12-31`;

      // Fetch missions and agenda_events in parallel
      const [missionsResult, agendaResult] = await Promise.all([
        supabase
          .from("missions")
          .select("id, date_iso, debut, fin, client, lieu, pause")
          .eq("user_id", userId)
          .gte("date_iso", fromIso)
          .lte("date_iso", toIso)
          .order("date_iso", { ascending: true })
          .order("debut", { ascending: true }),
        supabase
          .from("agenda_events")
          .select("*")
          .eq("user_id", userId)
          .lte("date_iso", toIso)
          .or(`date_iso.gte.${fromIso},date_fin.gte.${fromIso}`)
          .order("date_iso", { ascending: true })
          .order("heure_debut", { ascending: true, nullsFirst: false }),
      ]);

      if (missionsResult.error) throw missionsResult.error;
      if (agendaResult.error) throw agendaResult.error;

      const missions = ((missionsResult.data ?? []) as unknown as (Mission & { notes?: string | null })[]);
      const agendaEvents = (agendaResult.data as AgendaEvent[]) ?? [];

      // Debug: log raw mission data to diagnose wrong-date issues
      console.log("missions raw:", missions.map((m) => ({
        id: m.id,
        date_iso: m.date_iso,
        debut: m.debut,
        fin: m.fin,
      })));

      // Filter out missions with invalid/missing date or time.
      // date_iso may be a full timestamp ("YYYY-MM-DDT...") — normalise to YYYY-MM-DD.
      const validMissions = missions
        .filter((m) => {
          if (!m.date_iso || !m.debut || !m.fin) return false;
          const dateStr = m.date_iso.substring(0, 10);
          return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
        })
        .map((m) => ({
          ...m,
          date_iso: m.date_iso!.substring(0, 10), // normalise to YYYY-MM-DD
        }));

      setFcEvents([
        ...validMissions.map(missionToFCEvent),
        ...agendaEvents.map(agendaEventToFCEvent),
      ]);
      setKpis(computeKPIs(validMissions, agendaEvents, today));
    } catch {
      triggerAlert("Erreur chargement agenda");
    } finally {
      setLoading(false);
    }
  }, [userId, triggerAlert]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { fcEvents, kpis, loading, refetch };
}

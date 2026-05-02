import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import type { AgendaEvent } from "../types/entities";

// ─── Helpers date ─────────────────────────────────────────────────────────────

/** Retourne l'ISO du lundi de la semaine contenant `date` */
export function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Ajoute `days` jours à un ISO string */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAgendaParams {
  userId: string | null;
  triggerAlert: (msg: string) => void;
}

export interface UseAgendaReturn {
  events: AgendaEvent[];
  loading: boolean;
  currentYear: number;
  currentMonth: number;
  currentWeekStart: string;
  fetchEvents: () => Promise<void>;
  createEvent: (data: Partial<AgendaEvent>) => Promise<void>;
  updateEvent: (id: string, data: Partial<AgendaEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgenda({ userId, triggerAlert }: UseAgendaParams): UseAgendaReturn {
  const today = new Date();

  // ── Vue Mois ──────────────────────────────────────────────────────────────
  const [currentYear,  setCurrentYear]  = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12

  // ── Vue Semaine ───────────────────────────────────────────────────────────
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => getMondayOf(today));

  // ── Données ───────────────────────────────────────────────────────────────
  const [events,  setEvents]  = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const firedRef = useRef<Set<string>>(new Set());

  // ────────────────────────────────────────────────────────────────────────
  // Fetch — basé sur le mois affiché
  // ────────────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setLoading(true);
    try {
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const lastDayDate = new Date(currentYear, currentMonth, 0);
      const lastDay = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("agenda_events")
        .select("*")
        .eq("user_id", userId)
        .lte("date_iso", lastDay)
        .or(`date_iso.gte.${firstDay},date_fin.gte.${firstDay}`)
        .order("date_iso", { ascending: true })
        .order("heure_debut", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setEvents((data as AgendaEvent[]) || []);
    } catch {
      triggerAlert("Erreur chargement agenda");
    } finally {
      setLoading(false);
    }
  }, [userId, currentYear, currentMonth, triggerAlert]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ────────────────────────────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────────────────────────────
  const createEvent = useCallback(async (data: Partial<AgendaEvent>): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase
      .from("agenda_events")
      .insert({ ...data, user_id: userId });
    if (error) throw error;
    await fetchEvents();
  }, [userId, fetchEvents]);

  const updateEvent = useCallback(async (id: string, data: Partial<AgendaEvent>): Promise<void> => {
    const { error } = await supabase
      .from("agenda_events")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await fetchEvents();
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("agenda_events")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await fetchEvents();
  }, [fetchEvents]);

  // ────────────────────────────────────────────────────────────────────────
  // Navigation Mois
  // ────────────────────────────────────────────────────────────────────────
  const goToPrevMonth = useCallback((): void => {
    setCurrentMonth((m) => {
      if (m === 1) { setCurrentYear((y) => y - 1); return 12; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback((): void => {
    setCurrentMonth((m) => {
      if (m === 12) { setCurrentYear((y) => y + 1); return 1; }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback((): void => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setCurrentWeekStart(getMondayOf(now));
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Navigation Semaine
  // ────────────────────────────────────────────────────────────────────────
  const goToPrevWeek = useCallback((): void => {
    setCurrentWeekStart((ws) => {
      const newMonday = addDays(ws, -7);
      const d = new Date(newMonday + "T12:00:00");
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth() + 1);
      return newMonday;
    });
  }, []);

  const goToNextWeek = useCallback((): void => {
    setCurrentWeekStart((ws) => {
      const newMonday = addDays(ws, 7);
      const d = new Date(newMonday + "T12:00:00");
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth() + 1);
      return newMonday;
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Rappels — toutes les 60 secondes
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const checkReminders = async () => {
      try {
        const now = new Date();
        const todayIso = now.toISOString().slice(0, 10);

        const { data } = await supabase
          .from("agenda_events")
          .select("id, titre, heure_debut, rappel_minutes, date_iso")
          .eq("user_id", userId)
          .eq("type", "rdv")
          .not("rappel_minutes", "is", null)
          .not("heure_debut", "is", null)
          .gte("date_iso", todayIso);

        if (!data) return;

        data.forEach((evt: AgendaEvent) => {
          if (firedRef.current.has(evt.id)) return;
          const heureDebut = evt.heure_debut as string;
          const [h, m] = heureDebut.split(":").map(Number);
          const eventTime = new Date(`${evt.date_iso}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
          const alertTime = new Date(eventTime.getTime() - (evt.rappel_minutes as number) * 60 * 1000);
          if (now >= alertTime && now < eventTime) {
            firedRef.current.add(evt.id);
            const msg = `📅 Rappel : ${evt.titre} dans ${evt.rappel_minutes} min`;
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Agenda", { body: msg });
            } else {
              triggerAlert(msg);
            }
          }
        });
      } catch { /* ignore */ }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [userId, triggerAlert]);

  return {
    events,
    loading,
    currentYear,
    currentMonth,
    currentWeekStart,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    goToPrevWeek,
    goToNextWeek,
  };
}

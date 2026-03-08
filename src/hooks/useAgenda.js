import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

export function useAgenda({ userId, triggerAlert }) {
  const today = new Date();
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const firedRef = useRef(new Set());

  const fetchEvents = useCallback(async () => {
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
        .gte("date_iso", firstDay)
        .lte("date_iso", lastDay)
        .order("date_iso", { ascending: true })
        .order("heure_debut", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setEvents(data || []);
    } catch {
      triggerAlert("Erreur chargement agenda");
    } finally {
      setLoading(false);
    }
  }, [userId, currentYear, currentMonth, triggerAlert]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (data) => {
    if (!userId) return;
    const { error } = await supabase
      .from("agenda_events")
      .insert({ ...data, user_id: userId });
    if (error) throw error;
    await fetchEvents();
  }, [userId, fetchEvents]);

  const updateEvent = useCallback(async (id, data) => {
    const { error } = await supabase
      .from("agenda_events")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await fetchEvents();
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase
      .from("agenda_events")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await fetchEvents();
  }, [fetchEvents]);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 1) { setCurrentYear((y) => y - 1); return 12; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 12) { setCurrentYear((y) => y + 1); return 1; }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  }, []);

  // Rappels toutes les 60 secondes
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

        data.forEach((evt) => {
          if (firedRef.current.has(evt.id)) return;
          const [h, m] = evt.heure_debut.split(":").map(Number);
          const eventTime = new Date(`${evt.date_iso}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
          const alertTime = new Date(eventTime.getTime() - evt.rappel_minutes * 60 * 1000);
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
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  };
}

import { supabase } from "../supabase";
import type { AgendaEvent } from "../../types/entities";

export const fetchAgendaEvents = async (
  userId: string,
  year: number,
  month: number
): Promise<AgendaEvent[]> => {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("agenda_events")
    .select("*")
    .eq("user_id", userId)
    .lte("date_iso", lastDay)
    .or(`date_iso.gte.${firstDay},date_fin.gte.${firstDay}`)
    .order("date_iso", { ascending: true })
    .order("heure_debut", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data as AgendaEvent[]) || [];
};

export const fetchAgendaReminders = async (
  userId: string,
  dateFrom: string
): Promise<AgendaEvent[]> => {
  const { data } = await supabase
    .from("agenda_events")
    .select("id, titre, heure_debut, rappel_minutes, date_iso")
    .eq("user_id", userId)
    .eq("type", "rdv")
    .not("rappel_minutes", "is", null)
    .not("heure_debut", "is", null)
    .gte("date_iso", dateFrom);

  return (data as AgendaEvent[]) || [];
};

export const createAgendaEvent = async (
  userId: string,
  data: Partial<AgendaEvent>
): Promise<void> => {
  const { error } = await supabase
    .from("agenda_events")
    .insert({ ...data, user_id: userId });
  if (error) throw error;
};

export const updateAgendaEvent = async (
  id: string,
  data: Partial<AgendaEvent>
): Promise<void> => {
  const { error } = await supabase
    .from("agenda_events")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteAgendaEvent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("agenda_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
};

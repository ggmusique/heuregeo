import { useState, useCallback } from "react";

// ─── Types locaux ─────────────────────────────────────────────────────────────

/** Shape minimale d'un événement agenda manipulé par ce hook. */
export interface AgendaEvent {
  id: string;
  date_iso: string;
  [key: string]: unknown;
}

interface UseAgendaModalArgs {
  createEvent: (formData: Record<string, unknown>) => Promise<void>;
  updateEvent: (id: string, formData: Record<string, unknown>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  triggerAlert: (msg: string) => void;
}

export interface UseAgendaModalReturn {
  showAgendaModal: boolean;
  setShowAgendaModal: (v: boolean) => void;
  editingEventId: string | null;
  editingEventData: AgendaEvent | null;
  selectedDate: string | null;
  openForDate: (dateIso: string) => void;
  handleEventEdit: (event: AgendaEvent) => void;
  handleEventSubmit: (formData: Record<string, unknown>) => Promise<void>;
  handleEventDelete: (id: string) => Promise<void>;
  resetEventForm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAgendaModal({ createEvent, updateEvent, deleteEvent, triggerAlert }: UseAgendaModalArgs): UseAgendaModalReturn {
  const [showAgendaModal, setShowAgendaModal] = useState<boolean>(false);
  const [editingEventId,  setEditingEventId]  = useState<string | null>(null);
  const [editingEventData,setEditingEventData]= useState<AgendaEvent | null>(null);
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null);

  const openForDate = useCallback((dateIso: string): void => {
    setSelectedDate(dateIso);
    setEditingEventId(null);
    setEditingEventData(null);
    setShowAgendaModal(true);
  }, []);

  const handleEventEdit = useCallback((event: AgendaEvent): void => {
    setEditingEventId(event.id);
    setEditingEventData(event);
    setSelectedDate(event.date_iso);
    setShowAgendaModal(true);
  }, []);

  const resetEventForm = useCallback((): void => {
    setEditingEventId(null);
    setEditingEventData(null);
    setSelectedDate(null);
  }, []);

  const handleEventSubmit = useCallback(async (formData: Record<string, unknown>): Promise<void> => {
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, formData);
        triggerAlert("Événement modifié !");
      } else {
        await createEvent(formData);
        triggerAlert("Événement créé !");
      }
      resetEventForm();
      setShowAgendaModal(false);
    } catch (err) {
      triggerAlert("Erreur : " + ((err as Error)?.message || "Opération échouée"));
    }
  }, [editingEventId, createEvent, updateEvent, triggerAlert, resetEventForm]);

  const handleEventDelete = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteEvent(id);
      triggerAlert("Événement supprimé");
      resetEventForm();
      setShowAgendaModal(false);
    } catch {
      triggerAlert("Erreur suppression");
    }
  }, [deleteEvent, triggerAlert, resetEventForm]);

  return {
    showAgendaModal,
    setShowAgendaModal,
    editingEventId,
    editingEventData,
    selectedDate,
    openForDate,
    handleEventEdit,
    handleEventSubmit,
    handleEventDelete,
    resetEventForm,
  };
}

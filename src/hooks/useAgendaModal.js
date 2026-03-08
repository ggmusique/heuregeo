import { useState, useCallback } from "react";

export function useAgendaModal({ createEvent, updateEvent, deleteEvent, triggerAlert }) {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [editingEventId,  setEditingEventId]  = useState(null);
  const [editingEventData,setEditingEventData]= useState(null);
  const [selectedDate,    setSelectedDate]    = useState(null);

  const openForDate = useCallback((dateIso) => {
    setSelectedDate(dateIso);
    setEditingEventId(null);
    setEditingEventData(null);
    setShowAgendaModal(true);
  }, []);

  const handleEventEdit = useCallback((event) => {
    setEditingEventId(event.id);
    setEditingEventData(event);
    setSelectedDate(event.date_iso);
    setShowAgendaModal(true);
  }, []);

  const resetEventForm = useCallback(() => {
    setEditingEventId(null);
    setEditingEventData(null);
    setSelectedDate(null);
  }, []);

  const handleEventSubmit = useCallback(async (formData) => {
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
      triggerAlert("Erreur : " + (err?.message || "Opération échouée"));
    }
  }, [editingEventId, createEvent, updateEvent, triggerAlert, resetEventForm]);

  const handleEventDelete = useCallback(async (id) => {
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

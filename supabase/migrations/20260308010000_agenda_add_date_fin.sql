-- Add date_fin to agenda_events to support multi-day events (congés)
alter table agenda_events
  add column if not exists date_fin date;

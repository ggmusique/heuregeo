-- Agenda events table for Pro users
create table if not exists agenda_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date_iso       date not null,
  type           text not null check (type in ('rdv', 'conge', 'note')),
  titre          text not null,
  description    text,
  heure_debut    time,
  heure_fin      time,
  rappel_minutes int,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table agenda_events enable row level security;

create policy "agenda_select_own" on agenda_events
  for select using (auth.uid() = user_id);

create policy "agenda_insert_own" on agenda_events
  for insert with check (auth.uid() = user_id);

create policy "agenda_update_own" on agenda_events
  for update using (auth.uid() = user_id);

create policy "agenda_delete_own" on agenda_events
  for delete using (auth.uid() = user_id);

create index if not exists agenda_events_user_date on agenda_events(user_id, date_iso);

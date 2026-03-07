-- Ticket 7: migration douce date_iso -> date_mission
-- 1) Ajouter la colonne date (type date natif)
alter table missions add column if not exists date_mission date;

-- 2) Backfill depuis date_iso pour les lignes existantes
update missions
  set date_mission = date_iso::date
  where date_mission is null
    and date_iso is not null;

-- 3) Index composite pour les filtres par période
create index if not exists missions_user_date_mission_idx
  on missions(user_id, date_mission);

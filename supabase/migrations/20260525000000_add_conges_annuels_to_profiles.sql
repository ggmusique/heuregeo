-- Ajoute la colonne conges_annuels (nullable integer) à la table profiles.
-- Utilisée pour afficher le KPI "Congés restants" dans le Dashboard.

alter table public.profiles
  add column if not exists conges_annuels integer default null;

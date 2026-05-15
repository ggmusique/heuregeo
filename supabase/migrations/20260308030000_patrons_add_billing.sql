-- Add billing fields to patrons table (all optional)
alter table patrons
  add column if not exists adresse     text,
  add column if not exists code_postal text,
  add column if not exists ville       text,
  add column if not exists telephone   text,
  add column if not exists email       text,
  add column if not exists siret       text;

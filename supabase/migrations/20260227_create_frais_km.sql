-- Table dédiée aux frais kilométriques (remplace le parsing fragile dans frais_divers)
create table if not exists public.frais_km (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id bigint null references public.missions(id) on delete set null,
  patron_id uuid not null references public.patrons(id) on delete cascade,
  date_frais date not null,
  country_code text not null default 'BE',
  distance_km numeric(10,2) not null default 0,
  rate_per_km numeric(10,4) not null default 0,
  amount numeric(12,2) not null default 0,
  source text not null default 'auto',
  notes text null,
  created_at timestamptz not null default now()
);

alter table public.frais_km enable row level security;

drop policy if exists "frais_km_select_own" on public.frais_km;
create policy "frais_km_select_own" on public.frais_km for select using (auth.uid() = user_id);

drop policy if exists "frais_km_insert_own" on public.frais_km;
create policy "frais_km_insert_own" on public.frais_km for insert with check (auth.uid() = user_id);

drop policy if exists "frais_km_update_own" on public.frais_km;
create policy "frais_km_update_own" on public.frais_km for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "frais_km_delete_own" on public.frais_km;
create policy "frais_km_delete_own" on public.frais_km for delete using (auth.uid() = user_id);

-- viewer lecture par patron
drop policy if exists "viewer_read_frais_km_by_patron" on public.frais_km;
create policy "viewer_read_frais_km_by_patron" on public.frais_km for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'viewer'
      and p.patron_id = frais_km.patron_id
  )
);

-- V2 Contrat PRO: banque d'heures persistante (ledger)

create table if not exists public.contract_reserve_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  patron_id uuid null references public.patrons(id) on delete set null,
  movement_type text not null check (movement_type in (
    'manual_add',
    'manual_consume',
    'admin_correction',
    'weekly_settlement',
    'carry_over',
    'overtime_to_reserve'
  )),
  movement_source text not null check (movement_source in (
    'user',
    'admin',
    'contract_engine',
    'migration',
    'system'
  )),
  delta_hours numeric(8,2) not null,
  movement_date timestamptz not null default now(),
  mission_id bigint null references public.missions(id) on delete set null,
  period_type text null,
  period_value text null,
  comment text null,
  movement_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_reserve_movements_user_idx
  on public.contract_reserve_movements(user_id, movement_date desc);

create index if not exists contract_reserve_movements_patron_idx
  on public.contract_reserve_movements(patron_id, movement_date desc);

create unique index if not exists contract_reserve_movements_user_patron_key_unique
  on public.contract_reserve_movements(user_id, patron_id, movement_key)
  where movement_key is not null;

create or replace function public.trg_contract_reserve_movements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contract_reserve_movements_updated_at
  on public.contract_reserve_movements;

create trigger trg_contract_reserve_movements_updated_at
before update on public.contract_reserve_movements
for each row
execute function public.trg_contract_reserve_movements_updated_at();

alter table public.contract_reserve_movements enable row level security;

drop policy if exists "contract_reserve_select" on public.contract_reserve_movements;
create policy "contract_reserve_select"
  on public.contract_reserve_movements
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      patron_id is not null and patron_id in (
        select id from public.patrons where user_id = auth.uid()
      )
    )
  );

drop policy if exists "contract_reserve_insert" on public.contract_reserve_movements;
create policy "contract_reserve_insert"
  on public.contract_reserve_movements
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      patron_id is null
      or patron_id in (select id from public.patrons where user_id = auth.uid())
    )
  );

drop policy if exists "contract_reserve_update" on public.contract_reserve_movements;
create policy "contract_reserve_update"
  on public.contract_reserve_movements
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and (
      patron_id is null
      or patron_id in (select id from public.patrons where user_id = auth.uid())
    )
  )
  with check (
    user_id = auth.uid()
    and (
      patron_id is null
      or patron_id in (select id from public.patrons where user_id = auth.uid())
    )
  );

drop policy if exists "contract_reserve_delete" on public.contract_reserve_movements;
create policy "contract_reserve_delete"
  on public.contract_reserve_movements
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and (
      patron_id is null
      or patron_id in (select id from public.patrons where user_id = auth.uid())
    )
  );

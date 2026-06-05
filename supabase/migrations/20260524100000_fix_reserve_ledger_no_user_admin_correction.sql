-- LOT B CRITIQUE
-- Verrouille les insertions admin_correction/source=admin pour les non-admin.

alter table if exists public.contract_reserve_movements enable row level security;

drop policy if exists reserve_ledger_no_user_admin_correction on public.contract_reserve_movements;

drop policy if exists contract_reserve_insert on public.contract_reserve_movements;
create policy contract_reserve_insert
  on public.contract_reserve_movements
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      patron_id is null
      or patron_id in (select id from public.patrons where user_id = auth.uid())
    )
    and (
      movement_source <> 'admin'
      or exists (
        select 1
        from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- LOT B CRITIQUE (alias policy name demandé)
-- Compatibilité: la table cible du projet est contract_reserve_movements.

drop policy if exists reserve_ledger_no_user_admin_correction on public.contract_reserve_movements;
create policy reserve_ledger_no_user_admin_correction
  on public.contract_reserve_movements
  for insert
  to authenticated
  with check (
    movement_source <> 'admin'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

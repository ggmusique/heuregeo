-- LOT A CRITIQUE
-- Ajoute balance_before_hours / balance_after_hours et une fonction atomique d'insertion ledger.

alter table if exists public.contract_reserve_movements
  add column if not exists balance_before_hours numeric(8,2),
  add column if not exists balance_after_hours numeric(8,2);

create or replace function public.insert_reserve_movement(
  p_patron_id uuid,
  p_movement_type text,
  p_movement_source text,
  p_delta_hours numeric,
  p_movement_date timestamptz default now(),
  p_mission_id bigint default null,
  p_period_type text default null,
  p_period_value text default null,
  p_comment text default null,
  p_movement_key text default null
)
returns public.contract_reserve_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_before numeric(8,2) := 0;
  v_after numeric(8,2);
  v_row public.contract_reserve_movements;
begin
  if v_user_id is null then
    raise exception 'auth.uid() is required';
  end if;

  -- Sérialise les écritures par utilisateur pour éviter les courses critiques.
  perform 1 from public.profiles where id = v_user_id for update;

  with locked as (
    select delta_hours
    from public.contract_reserve_movements
    where user_id = v_user_id
      and (
        (p_patron_id is null and patron_id is null)
        or patron_id = p_patron_id
      )
    for update
  )
  select coalesce(sum(delta_hours), 0)::numeric(8,2) into v_before
  from locked;

  v_after := (v_before + coalesce(p_delta_hours, 0))::numeric(8,2);

  insert into public.contract_reserve_movements (
    user_id,
    patron_id,
    movement_type,
    movement_source,
    delta_hours,
    movement_date,
    mission_id,
    period_type,
    period_value,
    comment,
    movement_key,
    balance_before_hours,
    balance_after_hours
  ) values (
    v_user_id,
    p_patron_id,
    p_movement_type,
    p_movement_source,
    p_delta_hours,
    coalesce(p_movement_date, now()),
    p_mission_id,
    p_period_type,
    p_period_value,
    p_comment,
    p_movement_key,
    v_before,
    v_after
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.insert_reserve_movement(
  uuid,
  text,
  text,
  numeric,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text
) to authenticated;

-- Durcissement sécurité de la fonction SECURITY DEFINER du ledger réserve.

revoke execute on function public.insert_reserve_movement(
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
) from anon;

revoke execute on function public.insert_reserve_movement(
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
) from public;

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

import { supabase } from "../../../services/supabase";
import type {
  ReserveMovementInput,
  ReserveMovementRow,
  ReserveSyncWeeklyInput,
} from "./reserve.types";
import { buildWeeklySettlementKey, computeWeeklySettlementDelta } from "./reserveCalculations";

const TABLE = "contract_reserve_movements";

function sanitizeComment(comment: string | null | undefined): string | null {
  if (!comment) return null;
  const trimmed = comment.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function fetchReserveMovements(patronId: string | null): Promise<ReserveMovementRow[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });

  query = patronId ? query.eq("patron_id", patronId) : query.is("patron_id", null);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as ReserveMovementRow[];
}

export async function createReserveMovement(input: ReserveMovementInput): Promise<ReserveMovementRow> {
  const { data, error } = await supabase.rpc("insert_reserve_movement", {
    p_patron_id: input.patronId,
    p_movement_type: input.movementType,
    p_movement_source: input.source,
    p_delta_hours: input.deltaHours,
    p_movement_date: input.movementDate || new Date().toISOString(),
    p_mission_id: input.missionId ?? null,
    p_period_type: input.periodType ?? null,
    p_period_value: input.periodValue ?? null,
    p_comment: sanitizeComment(input.comment),
    p_movement_key: input.movementKey ?? null,
  });

  if (error) throw error;
  return data as ReserveMovementRow;
}

export async function deleteReserveMovement(movementId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", movementId)
    .eq("movement_source", "user");

  if (error) throw error;
}

export async function upsertWeeklySettlement(input: ReserveSyncWeeklyInput): Promise<void> {
  const deltaHours = computeWeeklySettlementDelta(input);
  const movementKey = buildWeeklySettlementKey(input.patronId, input.periodValue);

  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq("movement_key", movementKey)
    .eq("movement_source", "contract_engine");

  if (deleteError) throw deleteError;

  const { error } = await supabase.rpc("insert_reserve_movement", {
    p_patron_id: input.patronId,
    p_movement_type: input.overflowRule === "to_reserve" ? "overtime_to_reserve" : "weekly_settlement",
    p_movement_source: "contract_engine",
    p_delta_hours: deltaHours,
    p_movement_date: new Date().toISOString(),
    p_mission_id: null,
    p_period_type: "semaine",
    p_period_value: input.periodValue,
    p_comment: "Synchronisation automatique du contrat",
    p_movement_key: movementKey,
  });

  if (error) throw error;
}

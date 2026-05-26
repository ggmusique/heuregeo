export type ReserveMovementType =
  | "manual_add"
  | "manual_consume"
  | "admin_correction"
  | "weekly_settlement"
  | "carry_over"
  | "overtime_to_reserve"
  | "deficit_cover"
  | "planned_week";

export type ReserveMovementSource =
  | "user"
  | "admin"
  | "contract_engine"
  | "migration"
  | "system";

export interface ReserveMovementInput {
  patronId: string | null;
  movementType: ReserveMovementType;
  source: ReserveMovementSource;
  deltaHours: number;
  movementDate?: string;
  missionId?: number | null;
  periodType?: "semaine" | "mois" | "annee";
  periodValue?: string | null;
  comment?: string | null;
  movementKey?: string | null;
}

export interface ReserveMovementRow {
  id: string;
  user_id: string;
  patron_id: string | null;
  movement_type: ReserveMovementType;
  movement_source: ReserveMovementSource;
  delta_hours: number;
  movement_date: string;
  mission_id: number | null;
  period_type: string | null;
  period_value: string | null;
  comment: string | null;
  movement_key: string | null;
  balance_before_hours: number | null;
  balance_after_hours: number | null;
  created_at: string;
  updated_at: string;
}

export type ReserveLedgerEntry = ReserveMovementRow;

export interface ReserveBalance {
  patronId: string | null;
  balanceHours: number;
}

export interface ReserveSyncWeeklyInput {
  patronId: string | null;
  periodValue: string;
  workedHours: number;
  quotaHours: number;
  reserveEnabled: boolean;
  overflowRule: "ignore" | "to_reserve";
  surplusSplitPct?: number;
}

export interface ReserveHistoryFilters {
  movementType?: ReserveMovementType;
  source?: ReserveMovementSource;
  fromDate?: string;
  toDate?: string;
}

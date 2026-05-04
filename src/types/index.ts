/**
 * Point d'entrée unique pour tous les types partagés.
 * Réexporte les interfaces et types de chaque module de types.
 */

export type {
  Mission,
  Patron,
  Client,
  Lieu,
  Acompte,
  FraisDivers,
  AgendaEvent,
} from "./entities";

export type {
  UserRole,
  UserFeatures,
  UserProfile,
} from "./profile";

export type {
  BilanRow,
  BilanRowForRepair,
  AcompteAllocation,
  AcompteRow,
  FraisKmRow,
  WeeklyAcompteState,
  StandardAcompteState,
  WeeklyAcompteMetrics,
  WeatherData,
  RepairDecision,
  HistoriqueRow,
  NormalizedHistorique,
  NormalizedBilanPayload,
} from "./bilan";

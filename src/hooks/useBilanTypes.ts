import type { Dispatch, SetStateAction } from "react";
import type { Mission, FraisDivers, Patron, Lieu } from "../types/entities";
import type { KmSettings } from "./useKmDomicile";
import type { BilanContent } from "../types/bilan";
import type { HistoriqueData } from "./useHistorique";
import type { RebuildResult, RepairResult } from "./useBilanDB";

// ─── Paramètres d'entrée de useBilan ─────────────────────────────────────────

export interface UseBilanParams {
  missions: Mission[];
  fraisDivers: FraisDivers[];
  patrons?: Patron[];
  getMissionsByWeek: (weekNumber: number, patronId?: string | null, year?: number) => Mission[];
  getMissionsByPeriod: (periodType: string, periodValue: string | number, patronId?: string | null, year?: number) => Mission[];
  getFraisByWeek: (weekNumber: number, patronId?: string | null) => FraisDivers[];
  getTotalFrais: (fraisList?: FraisDivers[]) => number;
  getSoldeAvant: (dateRef: string, patronId?: string | null) => number;
  getAcomptesDansPeriode: (dateDebut: string, dateFin: string, patronId?: string | null) => number;
  getTotalAcomptesJusqua: (dateFin: string, patronId?: string | null) => number;
  triggerAlert: (msg: string) => void;
  kmSettings?: KmSettings | null;
  domicileLatLng?: { lat: number; lng: number } | null;
  lieux?: Lieu[];
}

// ─── Valeur de retour de useBilan ─────────────────────────────────────────────

export interface UseBilanReturn {
  showBilan: boolean;
  setShowBilan: Dispatch<SetStateAction<boolean>>;
  showPeriodModal: boolean;
  setShowPeriodModal: Dispatch<SetStateAction<boolean>>;
  bilanPeriodType: string;
  setBilanPeriodType: Dispatch<SetStateAction<string>>;
  bilanPeriodValue: string;
  setBilanPeriodValue: Dispatch<SetStateAction<string>>;
  availablePeriods: (number | string)[];
  bilanPaye: boolean;
  bilanContent: BilanContent;
  isRecalculatingKm: boolean;
  formatPeriodLabel: (val: string | number) => string;
  calculerPeriodesDisponibles: () => void;
  genererBilan: (patronId?: string | null, clientId?: string | null) => Promise<boolean | void>;
  marquerCommePaye: (patronId?: string | null) => Promise<boolean>;
  autoPayerBilans: (patronId: string, montantAcompte: number) => Promise<boolean>;
  fetchHistoriqueBilans: (patronId?: string | null) => Promise<HistoriqueData>;
  gotoPreviousWeek: () => void;
  gotoNextWeek: () => void;
  hasPreviousWeek: boolean;
  hasNextWeek: boolean;
  handleWeekChange: (newValue: string) => void;
  recalculerFraisKm: (patronId?: string | null) => Promise<void>;
  rebuildBilans: (patronId: string | null, startWeek: number, endWeek: number) => Promise<RebuildResult>;
  repairBilansDB: (patronId: string | null) => Promise<RepairResult>;
}

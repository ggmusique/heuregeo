import type { AcompteAllocation, AcompteRow, WeeklyAcompteMetrics } from "../types/bilan.ts";

export function mapWeeklyAcompteMetricsFromRows({
  allocsCetteSemaine = [],
  allocsJusqua = [],
  allocsAvant = [],
  allocsCreatedInPeriod = [],
  acomptesCumules = [],
  acomptesPeriode = [],
  allocAcompteDates = [],
}: {
  allocsCetteSemaine?: AcompteAllocation[];
  allocsJusqua?: AcompteAllocation[];
  allocsAvant?: AcompteAllocation[];
  allocsCreatedInPeriod?: AcompteAllocation[];
  acomptesCumules?: AcompteRow[];
  acomptesPeriode?: AcompteRow[];
  allocAcompteDates?: string[];
} = {}): WeeklyAcompteMetrics {
  const sumAmount = (rows: AcompteAllocation[] = []) => rows.reduce((sum, a) => sum + (parseFloat(a.amount as string) || 0), 0);
  const sumMontant = (rows: AcompteRow[] = []) => rows.reduce((sum, a) => sum + (parseFloat(a.montant as string) || 0), 0);

  return {
    allocCetteSemaine: sumAmount(allocsCetteSemaine),
    totalAlloueJusqua: sumAmount(allocsJusqua),
    totalAlloueAvant: sumAmount(allocsAvant),
    acompteConsommePeriode: sumAmount(allocsCreatedInPeriod),
    acomptesCumules: sumMontant(acomptesCumules),
    acomptesDansPeriode: sumMontant(acomptesPeriode),
    allocAcompteDates,
  };
}

export function mapWeeklyAcompteMetricsFromRows({
  allocsCetteSemaine = [],
  allocsJusqua = [],
  allocsAvant = [],
  allocsCreatedInPeriod = [],
  acomptesCumules = [],
  acomptesPeriode = [],
}: {
  allocsCetteSemaine?: any[];
  allocsJusqua?: any[];
  allocsAvant?: any[];
  allocsCreatedInPeriod?: any[];
  acomptesCumules?: any[];
  acomptesPeriode?: any[];
} = {}) {
  const sumAmount = (rows: any[] = []) => rows.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const sumMontant = (rows: any[] = []) => rows.reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);

  return {
    allocCetteSemaine: sumAmount(allocsCetteSemaine),
    totalAlloueJusqua: sumAmount(allocsJusqua),
    totalAlloueAvant: sumAmount(allocsAvant),
    acompteConsommePeriode: sumAmount(allocsCreatedInPeriod),
    acomptesCumules: sumMontant(acomptesCumules),
    acomptesDansPeriode: sumMontant(acomptesPeriode),
  };
}

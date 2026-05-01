export function mapWeeklyAcompteMetricsFromRows({
  allocsCetteSemaine = [],
  allocsJusqua = [],
  allocsAvant = [],
  allocsCreatedInPeriod = [],
  acomptesCumules = [],
  acomptesPeriode = [],
} = {}) {
  const sumAmount = (rows = []) => rows.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const sumMontant = (rows = []) => rows.reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);

  return {
    allocCetteSemaine: sumAmount(allocsCetteSemaine),
    totalAlloueJusqua: sumAmount(allocsJusqua),
    totalAlloueAvant: sumAmount(allocsAvant),
    acompteConsommePeriode: sumAmount(allocsCreatedInPeriod),
    acomptesCumules: sumMontant(acomptesCumules),
    acomptesDansPeriode: sumMontant(acomptesPeriode),
  };
}

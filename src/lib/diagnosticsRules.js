export function pluralFr(count, singular, plural) {
  return count !== 1 ? plural : singular;
}

export function isoWeekStart(wk, year = new Date().getFullYear()) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - (dow - 1) + (wk - 1) * 7);
  return d.toISOString().slice(0, 10);
}

export function isoWeekEnd(wk, year) {
  const d = new Date(isoWeekStart(wk, year));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function getDiagnosticStatus({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) return "critical";
  if (lieuxSansCoords.length >= 3) return "critical";
  if (lieuxSansCoords.length > 0 || lieuxSuspects.length > 0) return "warning";
  if (kmEnabled && nbSansFraisKm > 0) return "warning";
  return "ok";
}

export function getDiagnosticSummary({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) {
    return "Incohérence critique : coordonnées domicile manquantes — calcul KM impossible.";
  }
  const issues = [];
  if (lieuxSansCoords.length > 0)
    issues.push(`${lieuxSansCoords.length} lieu${lieuxSansCoords.length > 1 ? "x" : ""} sans coordonnées GPS`);
  if (lieuxSuspects.length > 0)
    issues.push(`${lieuxSuspects.length} lieu${lieuxSuspects.length > 1 ? "x suspects" : " suspect"}`);
  if (kmEnabled && nbSansFraisKm > 0)
    issues.push(`${nbSansFraisKm} mission${nbSansFraisKm > 1 ? "s" : ""} sans frais km`);
  if (issues.length === 0) return "Aucune incohérence détectée.";
  if (issues.length === 1) return `Point de vigilance : ${issues[0]}.`;
  return `${issues.length} points de vigilance : ${issues.join(", ")}.`;
}

export function getStaticAnomalies({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
  const anomalies = [];
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) {
    anomalies.push({
      severity: "critical",
      message: "Coordonnées domicile manquantes — les frais KM ne peuvent pas être calculés.",
    });
  }
  if (lieuxSansCoords.length > 0) {
    anomalies.push({
      severity: lieuxSansCoords.length >= 3 ? "critical" : "warning",
      message: `${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")} sans coordonnées GPS exploitables.`,
    });
  }
  if (lieuxSuspects.length > 0) {
    anomalies.push({
      severity: "warning",
      message: `${lieuxSuspects.length} lieu${pluralFr(lieuxSuspects.length, "", "x")} ${lieuxSuspects.length > 1 ? "ont des" : "a des"} coordonnées suspectes (trop proches du domicile).`,
    });
  }
  if (kmEnabled && nbSansFraisKm > 0) {
    anomalies.push({
      severity: "warning",
      message: `${nbSansFraisKm} mission${pluralFr(nbSansFraisKm, "", "s")} de la semaine en cours n'${nbSansFraisKm > 1 ? "ont" : "a"} pas de frais km associé${pluralFr(nbSansFraisKm, "", "s")}.`,
    });
  }
  return anomalies;
}

export function getDiagDataAnomalies(diagData, diagWeek) {
  const anomalies = [];
  const bilan = diagData.bilan;

  if (bilan?.paye && parseFloat(bilan.reste_a_percevoir || 0) > 0.01) {
    anomalies.push({
      severity: "critical",
      message: `S${diagWeek} marquée payée mais reste à percevoir de ${parseFloat(bilan.reste_a_percevoir).toFixed(2)} € en base.`,
    });
  }

  const acomptesSansAlloc = diagData.acomptes.filter(
    (ac) => !diagData.allocations.some((al) => al.acompte_id === ac.id)
  );
  if (acomptesSansAlloc.length > 0) {
    anomalies.push({
      severity: "warning",
      message: `${acomptesSansAlloc.length} acompte${pluralFr(acomptesSansAlloc.length, "", "s")} sans aucune allocation associée.`,
    });
  }

  const acomptesOverAlloues = diagData.acomptes.filter((ac) => {
    const totalAlloue = diagData.allocations
      .filter((al) => al.acompte_id === ac.id)
      .reduce((s, al) => s + parseFloat(al.amount || 0), 0);
    return totalAlloue > parseFloat(ac.montant || 0) + 0.01;
  });
  if (acomptesOverAlloues.length > 0) {
    anomalies.push({
      severity: "critical",
      message: `${acomptesOverAlloues.length} acompte${pluralFr(acomptesOverAlloues.length, "", "s")} sur-alloué${pluralFr(acomptesOverAlloues.length, "", "s")} (total allocations > montant).`,
    });
  }

  if (diagData.impayePrecedent > 0.01) {
    anomalies.push({
      severity: "warning",
      message: `Impayé antérieur de ${diagData.impayePrecedent.toFixed(2)} € reporté sur cette période.`,
    });
  }

  return anomalies;
}

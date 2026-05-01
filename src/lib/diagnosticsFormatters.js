import { getDiagDataAnomalies } from "./diagnosticsRules.js";

export function getHumanDiagnosticSummary(diagData, diagWeek) {
  if (!diagData) return [];
  const sentences = [];
  const bilan = diagData.bilan;
  const wk = parseInt(diagWeek, 10);

  if (!bilan) {
    sentences.push(`Aucun bilan enregistré pour S${diagWeek}.`);
  } else if (bilan.paye) {
    const dateStr = bilan.date_paiement
      ? new Date(bilan.date_paiement).toLocaleDateString("fr-FR")
      : null;
    sentences.push(`La semaine S${diagWeek} est soldée${dateStr ? ` le ${dateStr}` : ""}.`);
    if (parseFloat(bilan.reste_a_percevoir || 0) > 0.01) {
      sentences.push(
        `Attention : elle est marquée payée mais un reste de ${parseFloat(bilan.reste_a_percevoir).toFixed(2)} € subsiste en base.`
      );
    }
  } else {
    const reste = parseFloat(bilan.reste_a_percevoir || 0);
    if (reste > 0.01) {
      sentences.push(`La semaine S${diagWeek} reste impayée (${reste.toFixed(2)} € à percevoir).`);
    } else {
      sentences.push(`S${diagWeek} n'est pas marquée payée mais le reste à percevoir est nul.`);
    }
  }

  const allocsThisWeek = diagData.allocations.filter((al) => al.periode_index === wk);
  if (allocsThisWeek.length > 0) {
    const acompteIds = [...new Set(allocsThisWeek.map((al) => al.acompte_id))];
    if (acompteIds.length === 1) {
      const ac = diagData.acomptes.find((a) => a.id === acompteIds[0]);
      if (ac) {
        const allAllocsForAc = diagData.allocations.filter((al) => al.acompte_id === ac.id);
        const semaines = allAllocsForAc.map((al) => `S${al.periode_index}`).join(", ");
        sentences.push(
          `Un acompte de ${parseFloat(ac.montant || 0).toFixed(2)} € a été alloué sur ${semaines}.`
        );
      }
    } else {
      const totalCouvert = allocsThisWeek.reduce((s, al) => s + parseFloat(al.amount || 0), 0);
      sentences.push(
        `${acompteIds.length} acomptes couvrent ${totalCouvert.toFixed(2)} € sur S${diagWeek}.`
      );
    }
  } else if (diagData.acomptes.length > 0) {
    sentences.push(`Aucun acompte n'est alloué à S${diagWeek}.`);
  } else {
    sentences.push("Aucun acompte enregistré pour ce patron.");
  }

  if (diagData.impayePrecedent > 0.01) {
    sentences.push(
      `Un impayé antérieur de ${diagData.impayePrecedent.toFixed(2)} € est reporté sur cette période.`
    );
  }

  return sentences;
}

export function buildDiagnosticClipboardText(diagData, diagWeek, patronNom) {
  const lines = [];
  lines.push(`Patron : ${patronNom || "—"}`);
  lines.push(`Semaine : ${diagWeek}`);
  lines.push("");

  if (diagData.bilan) {
    lines.push(`CA brut : ${parseFloat(diagData.bilan.ca_brut_periode || 0).toFixed(2)} €`);
    lines.push(`Impayé précédent : ${diagData.impayePrecedent.toFixed(2)} €`);
    lines.push(`Statut payé : ${diagData.bilan.paye ? "Oui" : "Non"}`);
    lines.push(`Reste à percevoir : ${parseFloat(diagData.bilan.reste_a_percevoir || 0).toFixed(2)} €`);
  } else {
    lines.push("Bilan : absent");
  }

  lines.push("");
  lines.push("Acomptes :");
  if (diagData.acomptes.length === 0) {
    lines.push("- Aucun acompte");
  } else {
    diagData.acomptes.forEach((ac) => {
      lines.push(
        `- ${new Date(ac.date_acompte).toLocaleDateString("fr-FR")} : ${parseFloat(ac.montant || 0).toFixed(2)} €`
      );
    });
  }

  lines.push("");
  lines.push("Allocations :");
  if (diagData.allocations.length === 0) {
    lines.push("- Aucune allocation");
  } else {
    diagData.allocations.forEach((al) => {
      lines.push(`- S${al.periode_index} : ${parseFloat(al.amount || 0).toFixed(2)} €`);
    });
  }

  lines.push("");
  lines.push("Frais KM :");
  if (diagData.fraisKm.length === 0) {
    lines.push("- 0 ligne");
  } else {
    diagData.fraisKm.forEach((f) => {
      lines.push(
        `- ${new Date(f.date_frais).toLocaleDateString("fr-FR")} : ${parseFloat(f.distance_km).toFixed(1)} km — ${parseFloat(f.amount).toFixed(2)} €`
      );
    });
  }

  const anomalies = getDiagDataAnomalies(diagData, diagWeek);
  if (anomalies.length > 0) {
    lines.push("");
    lines.push("Anomalies :");
    anomalies.forEach((a) => {
      lines.push(`- [${a.severity === "critical" ? "Critique" : "Vigilance"}] ${a.message}`);
    });
  }

  return lines.join("\n");
}

export function formatAcompteAllocationSummary(acompte, allocations) {
  const allocs = allocations.filter((a) => a.acompte_id === acompte.id);
  if (allocs.length === 0) return "Aucune allocation — acompte non affecté à une semaine.";
  const semaines = allocs.map((a) => `S${a.periode_index}`).join(", ");
  const totalAlloue = allocs.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const montant = parseFloat(acompte.montant || 0);
  const solde = montant - totalAlloue;
  if (Math.abs(solde) < 0.01) return `Alloué intégralement sur ${semaines}.`;
  if (solde > 0) return `Alloué sur ${semaines} · solde non affecté : ${solde.toFixed(2)} €.`;
  return `Sur-alloué sur ${semaines} (dépassement de ${Math.abs(solde).toFixed(2)} €).`;
}

export function formatBilanSummary(bilan, diagWeek, impayePrecedent) {
  if (!bilan) return `Aucun bilan enregistré pour S${diagWeek}.`;
  const reste = parseFloat(bilan.reste_a_percevoir || 0);
  if (bilan.paye) {
    const dateStr = bilan.date_paiement
      ? new Date(bilan.date_paiement).toLocaleDateString("fr-FR")
      : "date inconnue";
    return `S${diagWeek} soldée le ${dateStr}.`;
  }
  if (reste > 0.01) {
    const cause = impayePrecedent > 0.01
      ? `dont ${impayePrecedent.toFixed(2)} € d'impayé antérieur`
      : "aucun acompte ne couvre entièrement la semaine";
    return `S${diagWeek} reste impayée (${reste.toFixed(2)} € restants — ${cause}).`;
  }
  return `S${diagWeek} à jour, pas de reste à percevoir.`;
}

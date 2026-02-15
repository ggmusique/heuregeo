import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatEuro, formatHeures, formatDateFR } from "./formatters";

/**
 * PALETTE DE COULEURS MODERNE
 */
const COLORS = {
  primary: [99, 102, 241],
  secondary: [168, 85, 247],
  success: [34, 197, 94],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  cyan: [6, 182, 212],
  orange: [251, 146, 60],
  dark: [15, 23, 42],
  light: [248, 250, 252],
  border: [226, 232, 240],
  textPrimary: [30, 41, 59],
  textSecondary: [100, 116, 139],
};

/**
 * Utilitaire pour définir l'opacité de manière sûre
 */
const setOpacity = (doc, opacity) => {
  try {
    doc.setGState(new doc.GState({ opacity }));
  } catch (e) {
    // Fallback si GState ne fonctionne pas
    doc.setFillColor(255, 255, 255);
  }
};

/**
 * Génère le numéro de document unique
 */
const generateDocRef = (periodType, periodValue) => {
  const year = new Date().getFullYear();
  let periodStr = "PER";

  if (periodType === "semaine") {
    const weekNum = Number(periodValue);
    if (!isNaN(weekNum) && weekNum > 0) {
      periodStr = `W${String(weekNum).padStart(2, "0")}`;
    }
  } else if (periodType === "mois") {
    const monthMatch = String(periodValue).match(/-(\d{2})$/);
    if (monthMatch) {
      periodStr = `M${monthMatch[1]}`;
    }
  } else if (periodType === "annee") {
    periodStr = `Y${periodValue}`;
  }

  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `BILAN-${year}-${periodStr}-${randomSuffix}`;
};

/**
 * Dessine l'en-tête du PDF
 */
const drawHeader = (doc, bilanContent, periodType, periodValue) => {
  try {
    // Fond dégradé simplifié
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, 210, 50, "F");

    // Logo/Icône
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 30, 8, "F");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("H", 20, 32, { align: "center" });

    // Titre principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.text("HEURES DE GEO", 35, 28);

    // Sous-titre
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text("Rapport d'activité professionnel", 35, 35);

    // Badge période
    const periodText = `${periodType.toUpperCase()} : ${
      bilanContent.titre || ""
    }`;
    const docRef = generateDocRef(periodType, periodValue);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(130, 20, 70, 20, 4, 4, "F");

    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text(periodText, 165, 28, { align: "center" });

    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.text(`N° ${docRef}`, 165, 37, { align: "center" });

    // Date
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFontSize(8);
    const dateGen = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc.text(`Généré le ${dateGen}`, 165, 47, { align: "center" });

    return 55;
  } catch (error) {
    console.error("Erreur drawHeader:", error);
    return 55;
  }
};

/**
 * Dessine les cartes métriques (KPIs)
 */
const drawMetrics = (doc, bilanContent, periodType, startY) => {
  try {
    const totalMissions =
      (bilanContent.totalE || 0) - (bilanContent.totalFrais || 0);
    const netValue =
      bilanContent.resteAPercevoir !== undefined
        ? bilanContent.resteAPercevoir
        : bilanContent.totalE || 0;

    let metrics = [
      {
        label: "Total Heures",
        value: formatHeures(bilanContent.totalH || 0),
        color: COLORS.primary,
      },
      {
        label: "CA Missions",
        value: formatEuro(totalMissions),
        color: COLORS.success,
      },
    ];

    if (periodType === "semaine") {
      metrics.push({
        label: "Frais Divers",
        value: formatEuro(bilanContent.totalFrais || 0),
        color: COLORS.warning,
      });
    }

    if (periodType === "semaine" && (bilanContent.impayePrecedent || 0) > 0) {
      metrics.push({
        label: "Semaine Passée (Impayé)",
        value: `+${formatEuro(bilanContent.impayePrecedent)}`,
        color: COLORS.orange,
      });
    }

    if (periodType === "semaine" && (bilanContent.totalAcomptes || 0) > 0) {
      metrics.push({
        label: "Acomptes Consommés",
        value: `-${formatEuro(bilanContent.totalAcomptes || 0)}`,
        color: COLORS.cyan,
      });
    }

    if (periodType === "semaine") {
      metrics.push({
        label: "Reste à Percevoir",
        value: formatEuro(netValue),
        color: netValue > 0 ? COLORS.secondary : COLORS.success,
      });
    } else {
      metrics.push({
        label: "CA Brut Total",
        value: formatEuro(bilanContent.totalE || 0),
        color: COLORS.secondary,
      });
    }

    const numMetrics = metrics.length;
    const totalWidthAvailable = 190;
    const gap = numMetrics > 4 ? 3 : 4;
    const cardWidth = Math.floor(
      (totalWidthAvailable - (numMetrics - 1) * gap) / numMetrics
    );
    const startX = 10;
    const cardHeight = 20;

    let currentX = startX;
    let y = startY;

    metrics.forEach((metric) => {
      const x = currentX;
      const centerX = x + cardWidth / 2;

      // Carte
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");

      // Bordure colorée
      doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      doc.roundedRect(x, y, cardWidth, 3, 3, 3, "F");
      doc.rect(x, y + 1.5, cardWidth, 1.5, "F");

      // Label
      doc.setFontSize(6.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      const labelLines = doc.splitTextToSize(metric.label, cardWidth - 4);
      const labelY = y + 8;
      labelLines.forEach((line, i) => {
        doc.text(line, centerX, labelY + i * 3, { align: "center" });
      });

      // Valeur
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
      doc.text(metric.value, centerX, y + 16, { align: "center" });

      currentX += cardWidth + gap;
    });

    return y + cardHeight + 10;
  } catch (error) {
    console.error("Erreur drawMetrics:", error);
    return startY + 30;
  }
};

/**
 * Dessine le tableau de résumé par semaine (pour bilan MOIS)
 */
const drawWeeklySummary = (doc, bilanContent, startY) => {
  if (!bilanContent.groupedData?.length) return startY;

  try {
    let y = startY;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text("Résumé par semaine", 15, y);

    y += 8;

    const headers = ["Semaine", "Heures", "Montant"];
    const colWidths = [120, 35, 30];
    const startTableX = 15;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");

    let currentX = startTableX;
    headers.forEach((header, i) => {
      doc.text(header, currentX + colWidths[i] / 2, y + 5.5, {
        align: "center",
      });
      currentX += colWidths[i];
    });

    y += 10;

    // Lignes
    doc.setFont(undefined, "normal");
    bilanContent.groupedData.forEach((group, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startTableX, y - 1, tableWidth, 7, "F");
      }

      currentX = startTableX;

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text(group.label || "", currentX + 5, y + 4);
      currentX += colWidths[0];

      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.primary);
      doc.text(formatHeures(group.h || 0), currentX + colWidths[1] / 2, y + 4, {
        align: "center",
      });
      currentX += colWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(group.e || 0), currentX + colWidths[2] / 2, y + 4, {
        align: "center",
      });

      y += 7;
    });

    y += 8;

    // Total
    doc.setFillColor(...COLORS.success);
    doc.setDrawColor(...COLORS.success);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "FD");

    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL", startTableX + 5, y + 5.5);

    doc.text(
      formatHeures(bilanContent.totalH || 0),
      startTableX + colWidths[0] + colWidths[1] / 2,
      y + 5.5,
      { align: "center" }
    );
    doc.text(
      formatEuro(bilanContent.totalE || 0),
      startTableX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
      y + 5.5,
      { align: "center" }
    );

    return y + 15;
  } catch (error) {
    console.error("Erreur drawWeeklySummary:", error);
    return startY;
  }
};

/**
 * Dessine le tableau de résumé par mois (pour bilan ANNÉE)
 */
const drawMonthlySummary = (doc, bilanContent, startY) => {
  if (!bilanContent.groupedData?.length) return startY;

  try {
    let y = startY;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text("Résumé par mois", 15, y);

    y += 8;

    const headers = ["Mois", "Heures", "Montant"];
    const colWidths = [120, 35, 30];
    const startTableX = 15;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");

    let currentX = startTableX;
    headers.forEach((header, i) => {
      doc.text(header, currentX + colWidths[i] / 2, y + 5.5, {
        align: "center",
      });
      currentX += colWidths[i];
    });

    y += 10;

    doc.setFont(undefined, "normal");
    bilanContent.groupedData.forEach((group, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startTableX, y - 1, tableWidth, 7, "F");
      }

      currentX = startTableX;

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text(group.label || "", currentX + 5, y + 4);
      currentX += colWidths[0];

      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.primary);
      doc.text(formatHeures(group.h || 0), currentX + colWidths[1] / 2, y + 4, {
        align: "center",
      });
      currentX += colWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(group.e || 0), currentX + colWidths[2] / 2, y + 4, {
        align: "center",
      });

      y += 7;
    });

    y += 8;

    doc.setFillColor(...COLORS.success);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL ANNUEL", startTableX + 5, y + 5.5);

    doc.text(
      formatHeures(bilanContent.totalH || 0),
      startTableX + colWidths[0] + colWidths[1] / 2,
      y + 5.5,
      { align: "center" }
    );
    doc.text(
      formatEuro(bilanContent.totalE || 0),
      startTableX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
      y + 5.5,
      { align: "center" }
    );

    return y + 15;
  } catch (error) {
    console.error("Erreur drawMonthlySummary:", error);
    return startY;
  }
};

/**
 * Dessine le tableau des missions (pour bilan SEMAINE uniquement)
 */
const drawMissionsTable = (doc, bilanContent, startY) => {
  if (!bilanContent.filteredData?.length) return startY;

  try {
    let y = startY;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text("Détail des missions", 15, y);

    y += 8;

    const headers = [
      "Date",
      "Client",
      "Lieu",
      "Horaires",
      "Pause",
      "Durée",
      "Montant",
    ];
    const colWidths = [20, 38, 42, 25, 15, 20, 25];
    const startTableX = 15;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(...COLORS.dark);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");

    let currentX = startTableX;
    headers.forEach((header, i) => {
      doc.text(header, currentX + colWidths[i] / 2, y + 5.5, {
        align: "center",
      });
      currentX += colWidths[i];
    });

    y += 10;

    doc.setFont(undefined, "normal");
    bilanContent.filteredData.forEach((mission, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startTableX, y - 1, tableWidth, 7, "F");
      }

      currentX = startTableX;

      // Date
      doc.setTextColor(...COLORS.textPrimary);
      doc.setFontSize(7);
      doc.text(
        formatDateFR(mission.date_iso) || "",
        currentX + colWidths[0] / 2,
        y + 4,
        { align: "center" }
      );
      currentX += colWidths[0];

      // Client
      doc.setFont(undefined, "bold");
      const clientText = (mission.client || "").substring(0, 18);
      doc.text(clientText, currentX + 2, y + 4);
      doc.setFont(undefined, "normal");
      currentX += colWidths[1];

      // Lieu
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFontSize(6.5);
      const lieuText = (mission.lieu || "-").substring(0, 22);
      doc.text(lieuText, currentX + 2, y + 4);
      doc.setFontSize(7);
      currentX += colWidths[2];

      // Horaires
      doc.setTextColor(...COLORS.primary);
      doc.setFont(undefined, "bold");
      doc.text(
        `${mission.debut || ""} - ${mission.fin || ""}`,
        currentX + colWidths[3] / 2,
        y + 4,
        { align: "center" }
      );
      doc.setFont(undefined, "normal");
      currentX += colWidths[3];

      // Pause
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(
        mission.pause > 0 ? `${mission.pause}m` : "-",
        currentX + colWidths[4] / 2,
        y + 4,
        { align: "center" }
      );
      currentX += colWidths[4];

      // Durée
      doc.setTextColor(...COLORS.textPrimary);
      doc.text(
        formatHeures(mission.duree || 0),
        currentX + colWidths[5] / 2,
        y + 4,
        { align: "center" }
      );
      currentX += colWidths[5];

      // Montant
      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(
        formatEuro(mission.montant || 0),
        currentX + colWidths[6] / 2,
        y + 4,
        { align: "center" }
      );
      doc.setFont(undefined, "normal");

      y += 7;
    });

    y += 8;

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(startTableX, y - 1, startTableX + tableWidth, y - 1);

    y += 5;

    doc.setFillColor(...COLORS.success);
    doc.roundedRect(startTableX, y, tableWidth, 8, 2, 2, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL MISSIONS", startTableX + 5, y + 5.5);

    const totalHeuresMissions = bilanContent.filteredData.reduce(
      (sum, m) => sum + (m.duree || 0),
      0
    );
    const totalMontantMissions = bilanContent.filteredData.reduce(
      (sum, m) => sum + (m.montant || 0),
      0
    );

    doc.text(
      formatHeures(totalHeuresMissions),
      startTableX + tableWidth - 60,
      y + 5.5,
      { align: "center" }
    );
    doc.text(
      formatEuro(totalMontantMissions),
      startTableX + tableWidth - 15,
      y + 5.5,
      { align: "center" }
    );

    return y + 20;
  } catch (error) {
    console.error("Erreur drawMissionsTable:", error);
    return startY;
  }
};

/**
 * Dessine le tableau des frais divers
 */
const drawFraisTable = (doc, bilanContent, startY) => {
  if (!bilanContent.fraisDivers?.length) return startY;

  try {
    let y = startY;

    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text("Frais divers", 15, y);

    y += 8;

    const fraisHeaders = ["Description", "Date", "Montant"];
    const fraisColWidths = [100, 40, 45];
    const fraisTableWidth = fraisColWidths.reduce((a, b) => a + b, 0);
    const startFraisX = 15;

    doc.setFillColor(...COLORS.warning);
    doc.roundedRect(startFraisX, y, fraisTableWidth, 8, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");

    let fraisX = startFraisX;
    fraisHeaders.forEach((header, i) => {
      doc.text(header, fraisX + fraisColWidths[i] / 2, y + 5.5, {
        align: "center",
      });
      fraisX += fraisColWidths[i];
    });

    y += 10;

    doc.setFont(undefined, "normal");
    bilanContent.fraisDivers.forEach((frais, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(254, 252, 232);
        doc.rect(startFraisX, y - 1, fraisTableWidth, 7, "F");
      }

      fraisX = startFraisX;

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFontSize(7);
      const descText = (frais.description || "").substring(0, 45);
      doc.text(descText, fraisX + 2, y + 4);
      fraisX += fraisColWidths[0];

      doc.setTextColor(...COLORS.textSecondary);
      doc.text(
        formatDateFR(frais.date_frais) || "-",
        fraisX + fraisColWidths[1] / 2,
        y + 4,
        { align: "center" }
      );
      fraisX += fraisColWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.warning);
      doc.text(
        formatEuro(frais.montant || 0),
        fraisX + fraisColWidths[2] / 2,
        y + 4,
        { align: "center" }
      );
      doc.setFont(undefined, "normal");

      y += 7;
    });

    doc.setDrawColor(...COLORS.border);
    doc.line(startFraisX, y - 1, startFraisX + fraisTableWidth, y - 1);

    y += 5;

    doc.setFillColor(...COLORS.warning);
    doc.roundedRect(startFraisX, y, fraisTableWidth, 8, 2, 2, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL FRAIS", startFraisX + 5, y + 5.5);
    doc.text(
      formatEuro(bilanContent.totalFrais || 0),
      startFraisX + fraisTableWidth - 5,
      y + 5.5,
      { align: "right" }
    );

    return y + 20;
  } catch (error) {
    console.error("Erreur drawFraisTable:", error);
    return startY;
  }
};

/**
 * Dessine la section suivi des acomptes
 */
const drawAcomptesSection = (doc, bilanContent, startY) => {
  const hasAcomptes =
    (bilanContent.soldeAcomptesAvant || 0) > 0 ||
    (bilanContent.acomptesDansPeriode || 0) > 0 ||
    (bilanContent.totalAcomptes || 0) > 0 ||
    (bilanContent.soldeAcomptesApres || 0) > 0;

  if (!hasAcomptes) return startY;

  try {
    let y = startY;

    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text("Suivi des acomptes", 15, y);

    y += 8;

    const acompteWidth = 180;
    const acompteX = 15;

    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    doc.roundedRect(acompteX, y, acompteWidth, 36, 3, 3, "S");

    y += 6;

    const acompteLines = [
      {
        label: "Solde avant période",
        value: formatEuro(bilanContent.soldeAcomptesAvant || 0),
        color: COLORS.textSecondary,
      },
      {
        label: "Acomptes reçus cette période",
        value: `+${formatEuro(bilanContent.acomptesDansPeriode || 0)}`,
        color: COLORS.success,
      },
      {
        label: "Consommé cette période",
        value: `-${formatEuro(bilanContent.totalAcomptes || 0)}`,
        color: COLORS.danger,
      },
    ];

    doc.setFontSize(8);
    acompteLines.forEach((line) => {
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(line.label, acompteX + 5, y);

      doc.setFont(undefined, "bold");
      doc.setTextColor(line.color[0], line.color[1], line.color[2]);
      doc.text(line.value, acompteX + acompteWidth - 5, y, { align: "right" });

      y += 6;
    });

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(acompteX + 5, y, acompteX + acompteWidth - 5, y);

    y += 6;

    doc.setFillColor(...COLORS.success);
    doc.roundedRect(acompteX + 3, y - 3, acompteWidth - 6, 8, 2, 2, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("SOLDE À REPORTER", acompteX + 5, y + 2);
    doc.setFontSize(12);
    doc.text(
      formatEuro(bilanContent.soldeAcomptesApres || 0),
      acompteX + acompteWidth - 5,
      y + 2,
      { align: "right" }
    );

    return y + 10;
  } catch (error) {
    console.error("Erreur drawAcomptesSection:", error);
    return startY;
  }
};

/**
 * Dessine le tampon "PAYÉ" (simplifié)
 */
const drawPayeStamp = (doc) => {
  try {
    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      const pageWidth = 210;
      const pageHeight = 297;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const rectWidth = 140;
      const rectHeight = 36;
      const rectX = centerX - rectWidth / 2;
      const rectY = centerY - rectHeight / 2;

      // Contour
      doc.setDrawColor(255, 0, 51);
      doc.setLineWidth(3);
      doc.roundedRect(rectX, rectY, rectWidth, rectHeight, 6, 6, "S");

      // Texte "PAYÉ"
      doc.setTextColor(255, 0, 51);
      doc.setFontSize(48);
      doc.setFont(undefined, "bold");
      doc.text("PAYÉ", centerX, centerY + 8, { align: "center" });

      // Date
      doc.setFontSize(10);
      doc.setFont(undefined, "italic");
      const dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      doc.text(`Réglé le ${dateStr}`, centerX, centerY + 20, {
        align: "center",
      });
    }
  } catch (error) {
    console.error("Erreur drawPayeStamp:", error);
  }
};

/**
 * Dessine le footer sur toutes les pages
 */
const drawFooter = (doc) => {
  try {
    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(15, 285, 195, 285);

      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      doc.text("Heures de Geo - Rapport d'activité", 15, 290);
      doc.text(`Page ${i} / ${pageCount}`, 195, 290, { align: "right" });
    }
  } catch (error) {
    console.error("Erreur drawFooter:", error);
  }
};

/**
 * Export PDF Professionnel - Design moderne
 */
export const exportToPDFPro = (
  bilanContent,
  periodType,
  estPaye = false,
  periodValue = ""
) => {
  // Validation
  if (!bilanContent) {
    console.error("❌ exportToPDFPro: bilanContent est requis");
    alert("Erreur : Aucune donnée à exporter");
    return;
  }

  console.log("🚀 Démarrage exportToPDFPro", {
    periodType,
    estPaye,
    periodValue,
    bilanContent,
  });

  try {
    const doc = new jsPDF();

    // Dessiner les sections
    let y = drawHeader(doc, bilanContent, periodType, periodValue);
    y = drawMetrics(doc, bilanContent, periodType, y);

    if (periodType === "semaine") {
      y = drawMissionsTable(doc, bilanContent, y);
      y = drawFraisTable(doc, bilanContent, y);
      y = drawAcomptesSection(doc, bilanContent, y);
    } else if (periodType === "mois") {
      y = drawWeeklySummary(doc, bilanContent, y);
    } else if (periodType === "annee") {
      y = drawMonthlySummary(doc, bilanContent, y);
    }

    if (estPaye) {
      drawPayeStamp(doc);
    }

    drawFooter(doc);

    // Sauvegarde
    const fileName = `GeoBilan_${(bilanContent.titre || "export")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}.pdf`;

        doc.save(fileName);
  } catch (error) {
    console.error("❌ Erreur lors de la génération du PDF:", error);
    console.error("Stack:", error.stack);
    alert(
      "Erreur lors de la génération du PDF. Consultez la console pour plus de détails."
    );
  }
};

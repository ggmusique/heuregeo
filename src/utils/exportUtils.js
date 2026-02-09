import { formatEuro, formatHeures, formatDateFR } from "./formatters";

/**
 * Utilitaires d'export (Excel, CSV)
 * Note: L'export PDF est géré par exportPDF_Pro.js
 */

// ========== EXPORT EXCEL ==========

/**
 * Exporte les données du bilan vers un fichier Excel
 * @param {Object} bilanData - Données du bilan
 * @param {string} periodType - Type de période (semaine, mois, annee)
 * @param {string} periodValue - Valeur de la période
 * @param {string} periodLabel - Label formaté de la période
 * @param {Array} fraisDivers - Liste des frais divers
 */
export const exportToExcel = (
  bilanData,
  periodType,
  periodValue,
  periodLabel,
  fraisDivers = []
) => {
  // Validation des entrées
  if (!bilanData) {
    throw new Error("Données du bilan manquantes");
  }

  if (!window.XLSX) {
    throw new Error("Librairie Excel non chargée");
  }

  const { filteredData = [], totalH = 0, totalE = 0 } = bilanData;

  // Calcul des totaux
  let totalFrais = 0;
  if (periodType === "semaine" && Array.isArray(fraisDivers)) {
    totalFrais = fraisDivers.reduce(
      (sum, f) => sum + (parseFloat(f?.montant) || 0),
      0
    );
  }

  const grandTotal = totalE;
  const totalMissions = totalE - totalFrais;
  const XLSX = window.XLSX;

  // Construction des données
  const data = [
    ["HEURES DE GEO"],
    [
      `BILAN ${(periodType || "").toUpperCase()} : ${(
        periodLabel || ""
      ).toUpperCase()}`,
    ],
    [],
    ["DATE", "CLIENT", "LIEU", "DEBUT", "FIN", "PAUSE", "DUREE", "MONTANT"],
  ];

  // Ajouter les missions
  if (Array.isArray(filteredData)) {
    filteredData.forEach((m) => {
      if (!m) return;
      data.push([
        formatDateFR(m.date_iso) || "",
        (m.client || "").toUpperCase(),
        (m.lieu || "-").toUpperCase(),
        m.debut || "",
        m.fin || "",
        (m.pause || 0) + " min",
        formatHeures(m.duree || 0),
        formatEuro(m.montant || 0),
      ]);
    });
  }

  // Ajouter les frais divers (semaine uniquement)
  if (
    totalFrais > 0 &&
    periodType === "semaine" &&
    Array.isArray(fraisDivers)
  ) {
    data.push([], ["FRAIS DIVERS"]);
    data.push(["Description", "Montant"]);
    fraisDivers.forEach((f) => {
      if (!f) return;
      data.push([f.description || "", formatEuro(f.montant || 0)]);
    });
    data.push(["TOTAL FRAIS", formatEuro(totalFrais)]);
  }

  // Ajouter les totaux
  data.push(
    [],
    ["", "", "", "", "", "TOTAL HEURES :", formatHeures(totalH), ""],
    ["", "", "", "", "", "TOTAL MISSIONS :", formatEuro(totalMissions), ""],
    ["", "", "", "", "", "TOTAL FRAIS :", "", formatEuro(totalFrais)],
    ["", "", "", "", "", "GRAND TOTAL :", "", formatEuro(grandTotal)]
  );

  // Créer et sauvegarder le fichier
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bilan");

  const fileName = `Geo_${periodType || "export"}_${(periodValue || "").replace(
    /-/g,
    "_"
  )}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ========== EXPORT CSV ==========

/**
 * Exporte les données du bilan vers un fichier CSV
 * @param {Object} bilanContent - Contenu du bilan
 * @param {string} periodType - Type de période
 * @param {string} periodValue - Valeur de la période
 * @param {boolean} includeFrais - Inclure les frais divers
 */
export const exportToCSV = (
  bilanContent,
  periodType,
  periodValue,
  includeFrais = false
) => {
  // Validation des entrées
  if (!bilanContent) {
    throw new Error("Contenu du bilan manquant");
  }

  const filteredMissions = bilanContent.filteredData || [];

  if (filteredMissions.length === 0) {
    throw new Error("Aucune mission dans cette période");
  }

  // En-têtes
  const headers = [
    "Date",
    "Client",
    "Lieu",
    "Début",
    "Fin",
    "Pause (min)",
    "Durée (heures)",
    "Montant (€)",
  ];

  // Lignes de données
  const rows = filteredMissions.map((m) => {
    if (!m) return [];
    return [
      formatDateFR(m.date_iso) || "",
      `"${(m.client || "").replace(/"/g, '""')}"`,
      `"${(m.lieu || "-").replace(/"/g, '""')}"`,
      m.debut || "",
      m.fin || "",
      m.pause || 0,
      (m.duree?.toFixed(2) || "0.00").replace(".", ","),
      (m.montant?.toFixed(2) || "0.00").replace(".", ","),
    ];
  });

  // BOM UTF-8 pour Excel français
  const BOM = "\uFEFF";
  let csvContent = BOM;
  csvContent += headers.join(";") + "\n";
  csvContent += rows.map((row) => row.join(";")).join("\n");

  // Ajouter les frais divers si demandé
  if (
    includeFrais &&
    periodType === "semaine" &&
    Array.isArray(bilanContent.fraisDivers) &&
    bilanContent.fraisDivers.length > 0
  ) {
    csvContent += "\n\nFRAIS DIVERS\n";
    csvContent += "Description;Montant (€);Date\n";

    const fraisRows = bilanContent.fraisDivers.map((f) => {
      if (!f) return [];
      return [
        `"${(f.description || "").replace(/"/g, '""')}"`,
        (f.montant?.toFixed(2) || "0.00").replace(".", ","),
        formatDateFR(f.date_frais) || "-",
      ];
    });

    csvContent += fraisRows.map((row) => row.join(";")).join("\n");

    const totalFrais = bilanContent.totalFrais || 0;
    csvContent += `\nTOTAL FRAIS;${totalFrais.toFixed(2).replace(".", ",")}\n`;
  }

  // Créer et télécharger le fichier
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);

  const periodStr = (periodValue || "").replace(/-/g, "_");
  const typeStr = includeFrais ? "complet" : "missions";
  const dateStr = new Date().toISOString().slice(0, 10);

  link.setAttribute(
    "download",
    `Heures_Geo_${
      periodType || "export"
    }_${periodStr}_${typeStr}_${dateStr}.csv`
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libérer l'URL
  URL.revokeObjectURL(url);
};

// ========== EXPORT PDF (LEGACY) ==========
// Note: Utilisez exportPDF_Pro.js pour l'export PDF
// Cette fonction est conservée pour compatibilité si nécessaire

/**
 * @deprecated Utilisez exportToPDFPro de exportPDF_Pro.js à la place
 */
export const exportToPDF = (bilanContent, periodType) => {
  console.warn("exportToPDF est déprécié. Utilisez exportToPDFPro à la place.");

  const jsPDFLib = window.jspdf;
  if (!jsPDFLib) {
    throw new Error("PDF non prêt");
  }

  if (!bilanContent) {
    throw new Error("Contenu du bilan manquant");
  }

  const doc = new jsPDFLib.jsPDF();

  // En-tête
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("HEURES DE GEO", 14, 22);
  doc.setFontSize(12);
  doc.text(
    `BILAN ${(periodType || "").toUpperCase()} : ${(
      bilanContent.titre || ""
    ).toUpperCase()}`,
    14,
    32
  );

  let y = 50;

  // Détail des missions (semaine uniquement)
  if (periodType === "semaine" && bilanContent.filteredData?.length > 0) {
    const colWidths = [30, 55, 25, 25, 25, 35];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = (210 - tableWidth) / 2;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("DÉTAIL DES MISSIONS", startX, y);
    y += 10;

    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(startX, y, startX + tableWidth, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(100, 100, 100);
    let x = startX;
    ["DATE", "CLIENT", "DÉBUT", "PAUSE", "FIN", "MONTANT"].forEach(
      (header, i) => {
        doc.text(header, x + colWidths[i] / 2, y, { align: "center" });
        x += colWidths[i];
      }
    );
    y += 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(startX, y - 2, startX + tableWidth, y - 2);
    y += 4;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    bilanContent.filteredData.forEach((mission, index) => {
      if (!mission) return;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 255);
        doc.rect(startX, y - 2, tableWidth, 7, "F");
      }

      x = startX;
      doc.setTextColor(0, 0, 0);
      doc.text(formatDateFR(mission.date_iso) || "", x + colWidths[0] / 2, y, {
        align: "center",
      });
      x += colWidths[0];

      doc.text(
        (mission.client || "").substring(0, 20),
        x + colWidths[1] / 2,
        y,
        {
          align: "center",
        }
      );
      x += colWidths[1];

      doc.setTextColor(79, 70, 229);
      doc.setFont(undefined, "bold");
      doc.text(mission.debut || "-", x + colWidths[2] / 2, y, {
        align: "center",
      });
      x += colWidths[2];

      doc.text(
        mission.pause > 0 ? `${mission.pause} min` : "-",
        x + colWidths[3] / 2,
        y,
        { align: "center" }
      );
      x += colWidths[3];

      doc.text(mission.fin || "-", x + colWidths[4] / 2, y, {
        align: "center",
      });
      x += colWidths[4];

      doc.setTextColor(34, 197, 94);
      doc.text(formatEuro(mission.montant || 0), x + colWidths[5] / 2, y, {
        align: "center",
      });

      y += 7;
    });

    y += 15;
  }

  // Frais divers
  if (periodType === "semaine" && bilanContent.fraisDivers?.length > 0) {
    const lineHeight = 7;
    const hauteurFrais = 15 + bilanContent.fraisDivers.length * lineHeight;
    if (y + hauteurFrais > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(254, 252, 232);
    doc.roundedRect(12, y, 186, hauteurFrais + 5, 3, 3, "F");
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(12, y, 186, hauteurFrais + 5, 3, 3, "S");

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(245, 158, 11);
    doc.text("FRAIS DIVERS", 18, y + 8);

    doc.setFontSize(9);
    let fraisY = y + 16;
    bilanContent.fraisDivers.forEach((frais) => {
      if (!frais) return;
      doc.text(`• ${frais.description || ""}`, 20, fraisY);
      doc.setFont(undefined, "bold");
      doc.text(`${formatEuro(frais.montant || 0)}`, 150, fraisY);
      fraisY += lineHeight;
    });
    y = fraisY + 10;
  }

  // Récapitulatif
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  const totalFrais = bilanContent.totalFrais || 0;
  const totalE = bilanContent.totalE || 0;
  const totalH = bilanContent.totalH || 0;
  const totalMissions = totalE - totalFrais;
  const hauteurCadre = 55;

  doc.setFillColor(240, 240, 240);
  doc.roundedRect(14, y + 2, 182, hauteurCadre, 3, 3, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, y, 186, hauteurCadre, 3, 3, "F");
  doc.setDrawColor(79, 70, 229);
  doc.roundedRect(12, y, 186, hauteurCadre, 3, 3, "S");

  doc.setFillColor(79, 70, 229);
  doc.roundedRect(12, y, 186, 15, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("RÉCAPITULATIF", 18, y + 10);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text("Total Heures:", 20, y + 24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`${formatHeures(totalH)}`, 140, y + 24);

  doc.setTextColor(60, 60, 60);
  doc.text("Total Missions:", 20, y + 34);
  doc.setFont(undefined, "bold");
  doc.setTextColor(34, 197, 94);
  doc.text(`${formatEuro(totalMissions)}`, 140, y + 34);

  let ligne = y + 44;
  if (totalFrais > 0) {
    doc.setTextColor(60, 60, 60);
    doc.text("Total Frais:", 20, ligne);
    doc.setFont(undefined, "bold");
    doc.setTextColor(245, 158, 11);
    doc.text(`${formatEuro(totalFrais)}`, 140, ligne);
  }

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("GRAND TOTAL:", 20, ligne + 8);
  doc.setFontSize(12);
  doc.text(`${formatEuro(totalE)}`, 140, ligne + 8);

  y = ligne + 20;

  // Suivi des acomptes
  if (periodType === "semaine") {
    const hasAcomptes =
      (bilanContent.soldeAcomptesAvant || 0) > 0 ||
      (bilanContent.acomptesDansPeriode || 0) > 0 ||
      (bilanContent.totalAcomptes || 0) > 0 ||
      (bilanContent.soldeAcomptesApres || 0) > 0;

    if (hasAcomptes) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      const hauteurAcomptes = 55;
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(12, y, 186, hauteurAcomptes, 3, 3, "F");
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(12, y, 186, hauteurAcomptes, 3, 3, "S");

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("SUIVI DES ACOMPTES", 18, y + 10);

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 255);
      let ay = y + 22;

      doc.text(
        `Solde avant période : ${formatEuro(
          bilanContent.soldeAcomptesAvant || 0
        )}`,
        18,
        ay
      );
      ay += 6;
      doc.text(
        `Reçus cette période : +${formatEuro(
          bilanContent.acomptesDansPeriode || 0
        )}`,
        18,
        ay
      );
      ay += 6;
      doc.text(
        `Déduit cette période : -${formatEuro(
          bilanContent.totalAcomptes || 0
        )}`,
        18,
        ay
      );
      ay += 8;

      doc.setTextColor(34, 197, 94);
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(
        `Solde restant à reporter : ${formatEuro(
          bilanContent.soldeAcomptesApres || 0
        )}`,
        18,
        ay
      );
    }
  }

  const fileName = `GeoBilan_${(bilanContent.titre || "export").replace(
    /\s+/g,
    "_"
  )}_complet.pdf`;
  doc.save(fileName);
};

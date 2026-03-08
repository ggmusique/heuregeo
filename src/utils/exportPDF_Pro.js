import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatEuro, formatHeures, formatDateFR } from "./formatters";

/**
 * PALETTE CLASSIQUE PRO — Blanc / Bleu Marine
 */
const COLORS = {
  navy:          [15,  40,  80],   // bleu marine foncé
  navyMid:       [26,  58, 110],   // bleu marine moyen
  navyLight:     [44,  82, 148],   // bleu marine clair
  gold:          [180, 145,  60],  // or discret
  white:         [255, 255, 255],
  offWhite:      [248, 249, 252],
  light:         [235, 240, 250],  // bleu très clair (zèbre)
  border:        [210, 220, 235],
  textPrimary:   [20,  30,  50],
  textSecondary: [90, 110, 140],
  success:       [22, 120,  70],
  danger:        [180,  40,  40],
  warning:       [160, 110,  20],
};

/**
 * Génère le numéro de document unique
 */
const generateDocRef = (periodType, periodValue) => {
  const year = new Date().getFullYear();
  let periodStr = "PER";
  if (periodType === "semaine") {
    const w = Number(periodValue);
    if (!isNaN(w) && w > 0) periodStr = `S${String(w).padStart(2, "0")}`;
  } else if (periodType === "mois") {
    const m = String(periodValue).match(/-(\d{2})$/);
    if (m) periodStr = `M${m[1]}`;
  } else if (periodType === "annee") {
    periodStr = `A${periodValue}`;
  }
  const suffix = Math.floor(100 + Math.random() * 900);
  return `GEO-${year}-${periodStr}-${suffix}`;
};

// ─────────────────────────────────────────────
// EN-TÊTE
// ─────────────────────────────────────────────
const drawHeader = (doc, bilanContent, periodType, periodValue) => {
  try {
    const pageW = 210;

    // Bande navy principale
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageW, 44, "F");

    // Bande or fine en bas du header
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 44, pageW, 1.5, "F");

    // Titre
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("HEURES DE GEO", 15, 22);

    // Sous-titre
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(180, 200, 230);
    doc.text("Rapport d'activité professionnel", 15, 30);

    // Bloc référence (droite)
    const docRef = generateDocRef(periodType, periodValue);
    const periodText = `${periodType.toUpperCase()} — ${bilanContent.titre || ""}`;
    const dateGen = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    doc.setFillColor(...COLORS.navyMid);
    doc.roundedRect(128, 7, 72, 32, 3, 3, "F");
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.roundedRect(128, 7, 72, 32, 3, 3, "S");

    doc.setTextColor(...COLORS.gold);
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("RÉFÉRENCE", 164, 14, { align: "center" });

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text(docRef, 164, 21, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(180, 200, 230);
    doc.text(periodText, 164, 28, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setTextColor(150, 175, 210);
    doc.text(`Généré le ${dateGen}`, 164, 35, { align: "center" });

    return 52;
  } catch (e) {
    console.error("Erreur drawHeader:", e);
    return 52;
  }
};

// ─────────────────────────────────────────────
// PROFIL UTILISATEUR
// ─────────────────────────────────────────────
const drawProfileSection = (doc, profile, startY) => {
  if (!profile) return startY;
  try {
    const lines = [];
    const fullName = [profile.prenom, profile.nom].filter(Boolean).join(" ");
    if (fullName) lines.push(fullName);
    if (profile.adresse) lines.push(profile.adresse);
    const cityLine = [profile.code_postal, profile.ville].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    if (profile.telephone) lines.push(profile.telephone);
    if (!lines.length) return startY;

    let y = startY;

    // Fond léger
    doc.setFillColor(...COLORS.offWhite);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, y, 110, lines.length * 5 + 6, 2, 2, "FD");

    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navyLight);
    doc.text("PRESTATAIRE", 16, y + 5);

    doc.setFont(undefined, "normal");
    doc.setTextColor(...COLORS.textPrimary);
    lines.forEach((line, i) => {
      doc.text(line, 16, y + 10 + i * 5);
    });

    return y + lines.length * 5 + 12;
  } catch (e) {
    console.error("Erreur drawProfileSection:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// CARTES KPI
// ─────────────────────────────────────────────
const drawMetrics = (doc, bilanContent, periodType, startY) => {
  try {
    const getFittedFontSize = (text, maxWidth, initialSize, minSize = 7) => {
      let size = initialSize;
      doc.setFontSize(size);
      while (size > minSize && doc.getTextWidth(text) > maxWidth) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      return size;
    };

    const netValue = bilanContent.resteAPercevoir !== undefined
      ? bilanContent.resteAPercevoir
      : bilanContent.totalE || 0;

    let metrics = [
      { label: "Total Heures",   value: formatHeures(bilanContent.totalH || 0),   accent: COLORS.navyLight },
      { label: "CA Missions",    value: formatEuro(bilanContent.totalE || 0),      accent: COLORS.success   },
    ];

    if (periodType === "semaine" && (bilanContent.totalFrais || 0) > 0) {
      metrics.push({ label: "Frais Divers", value: formatEuro(bilanContent.totalFrais || 0), accent: COLORS.warning });
    }
    if (periodType === "semaine" && (bilanContent.fraisKilometriques?.totalAmount || 0) > 0) {
      metrics.push({ label: "Frais Km", value: formatEuro(bilanContent.fraisKilometriques.totalAmount), accent: COLORS.navyLight });
    }
    if (periodType === "semaine" && (bilanContent.impayePrecedent || 0) > 0) {
      metrics.push({ label: "Impayé reporté", value: `+${formatEuro(bilanContent.impayePrecedent)}`, accent: COLORS.warning });
    }
    if (periodType === "semaine" && (bilanContent.totalAcomptes || 0) > 0) {
      metrics.push({ label: "Acomptes déduits", value: `-${formatEuro(bilanContent.totalAcomptes || 0)}`, accent: COLORS.danger });
    }
    if (periodType === "semaine") {
      metrics.push({ label: "Reste à Percevoir", value: formatEuro(netValue), accent: netValue > 0 ? COLORS.navy : COLORS.success });
    } else {
      metrics.push({ label: "CA Brut Total", value: formatEuro(bilanContent.totalE || 0), accent: COLORS.navyLight });
    }

    const n = metrics.length;
    const gap = 4;
    const cardW = Math.floor((190 - (n - 1) * gap) / n);
    const cardH = 22;
    const cardHBig = 28; // ← hauteur agrandie pour Reste à Percevoir
    let x = 10;
    const y = startY;

    metrics.forEach((m) => {
      const cx = x + cardW / 2;
      const isRAP = m.label === "Reste à Percevoir";
      const thisCardH = isRAP ? cardHBig : cardH;

      // Ombre simulée
      doc.setFillColor(200, 210, 225);
      doc.roundedRect(x + 1, y + 1, cardW, thisCardH, 3, 3, "F");

      // Fond blanc
      doc.setFillColor(...COLORS.white);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, cardW, thisCardH, 3, 3, "FD");

      // Barre colorée en haut
      doc.setFillColor(...m.accent);
      doc.roundedRect(x, y, cardW, 3, 3, 3, "F");
      doc.rect(x, y + 1.5, cardW, 1.5, "F");

      // Label
      doc.setFontSize(6);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      const labelLines = doc.splitTextToSize(m.label, cardW - 4);
      labelLines.forEach((line, i) => {
        doc.text(line, cx, y + 9 + i * 3.5, { align: "center" });
      });

      // Valeur (avec réduction auto si le montant dépasse la largeur de carte)
      const baseValueSize = isRAP ? 18 : 9.5;
      const valueMaxWidth = cardW - 6;
      const fittedValueSize = getFittedFontSize(m.value, valueMaxWidth, baseValueSize, isRAP ? 10 : 7);
      doc.setFontSize(fittedValueSize);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...m.accent);
      doc.text(m.value, cx, y + (isRAP ? 20 : 18), { align: "center" });
      x += cardW + gap;
    });

    // On retourne la hauteur max (cardHBig si RAP présent)
    const maxH = metrics.some(m => m.label === "Reste à Percevoir") ? cardHBig : cardH;
    return y + maxH + 10;
  } catch (e) {
    console.error("Erreur drawMetrics:", e);
    return startY + 32;
  }
};

// ─────────────────────────────────────────────
// HELPER : dessine un header de tableau
// ─────────────────────────────────────────────
const drawTableHeader = (doc, startX, y, headers, colWidths, bgColor) => {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  doc.setFillColor(...bgColor);
  doc.roundedRect(startX, y, tableWidth, 8, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7.5);
  doc.setFont(undefined, "bold");
  let cx = startX;
  headers.forEach((h, i) => {
    doc.text(h, cx + colWidths[i] / 2, y + 5.5, { align: "center" });
    cx += colWidths[i];
  });
  return y + 10;
};

// ─────────────────────────────────────────────
// TABLEAU MISSIONS (SEMAINE)
// ─────────────────────────────────────────────
const drawMissionsTable = (doc, bilanContent, startY, labels = {}) => {
  if (!bilanContent.filteredData?.length) return startY;
  try {
    let y = startY;

    const Lmissions = labels.missions || "missions";
    const Lclient   = labels.client   || "Client";
    const Llieu     = labels.lieu     || "Lieu";

    // Titre section
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Détail des " + Lmissions.toLowerCase(), 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 75, y + 2);
    y += 8;

    const headers   = ["Date", Lclient, Llieu, "Horaires", "Pause", "Durée", "Montant"];
    const colWidths = [20, 38, 40, 26, 14, 20, 27];
    const startX    = 15;
    const tableW    = colWidths.reduce((a, b) => a + b, 0);

    y = drawTableHeader(doc, startX, y, headers, colWidths, COLORS.navy);

    bilanContent.filteredData.forEach((m, idx) => {
      if (y > 268) { doc.addPage(); y = 20; }

      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startX, y - 1, tableW, 7.5, "F");
      }

      let cx = startX;
      doc.setFontSize(7);

      // Date
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, "normal");
      doc.text(formatDateFR(m.date_iso) || "", cx + colWidths[0] / 2, y + 4, { align: "center" });
      cx += colWidths[0];

      // Client
      doc.setTextColor(...COLORS.textPrimary);
      doc.setFont(undefined, "bold");
      doc.text((m.client || "").substring(0, 18), cx + 2, y + 4);
      cx += colWidths[1];

      // Lieu
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFontSize(6.5);
      const lieux = bilanContent.lieux || [];
      const lieuObj = lieux.find(l => l.id === m.lieu_id)
        || (m.lieu ? lieux.find(l => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim()) : null);
      const typeLabel = lieuObj?.type && lieuObj.type !== 'client'
        ? ` (${lieuObj.type.toUpperCase()})`
        : '';
      const lieuName = m.lieu || lieuObj?.nom || '-';
      const lieuDisplay = `${lieuName.substring(0, 22)}${typeLabel}`;
      doc.text(lieuDisplay, cx + 2, y + 4);
      cx += colWidths[2];

      // Horaires
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.navyLight);
      doc.setFont(undefined, "bold");
      doc.text(`${m.debut || ""} - ${m.fin || ""}`, cx + colWidths[3] / 2, y + 4, { align: "center" });
      cx += colWidths[3];

      // Pause
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(m.pause > 0 ? `${m.pause}m` : "-", cx + colWidths[4] / 2, y + 4, { align: "center" });
      cx += colWidths[4];

      // Durée
      doc.setTextColor(...COLORS.textPrimary);
      doc.text(formatHeures(m.duree || 0), cx + colWidths[5] / 2, y + 4, { align: "center" });
      cx += colWidths[5];

      // Montant
      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(m.montant || 0), cx + colWidths[6] / 2, y + 4, { align: "center" });

      y += 7.5;
    });

    y += 3;

    // Ligne séparatrice
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(startX, y, startX + tableW, y);
    y += 4;

    // Total missions
    const totH = bilanContent.filteredData.reduce((s, m) => s + (m.duree || 0), 0);
    const totE = bilanContent.filteredData.reduce((s, m) => s + (m.montant || 0), 0);

    doc.setFillColor(...COLORS.navyLight);
    doc.roundedRect(startX, y, tableW, 8, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL " + Lmissions.toUpperCase(), startX + 5, y + 5.5);
    doc.text(formatHeures(totH), startX + tableW - 52, y + 5.5, { align: "center" });
    doc.text(formatEuro(totE),   startX + tableW - 13, y + 5.5, { align: "center" });

    return y + 18;
  } catch (e) {
    console.error("Erreur drawMissionsTable:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// TABLEAU FRAIS
// ─────────────────────────────────────────────
const drawFraisTable = (doc, bilanContent, startY) => {
  if (!bilanContent.fraisDivers?.length) return startY;
  try {
    let y = startY;
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Frais divers", 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 55, y + 2);
    y += 8;

    const headers   = ["Description", "Date", "Montant"];
    const colWidths = [103, 40, 42];
    const startX    = 15;
    const tableW    = colWidths.reduce((a, b) => a + b, 0);

    y = drawTableHeader(doc, startX, y, headers, colWidths, COLORS.navyMid);

    bilanContent.fraisDivers.forEach((f, idx) => {
      if (y > 268) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startX, y - 1, tableW, 7.5, "F");
      }
      let cx = startX;
      doc.setFontSize(7);

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFont(undefined, "normal");
      doc.text((f.description || "").substring(0, 48), cx + 2, y + 4);
      cx += colWidths[0];

      doc.setTextColor(...COLORS.textSecondary);
      doc.text(formatDateFR(f.date_frais) || "-", cx + colWidths[1] / 2, y + 4, { align: "center" });
      cx += colWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.warning);
      doc.text(formatEuro(f.montant || 0), cx + colWidths[2] / 2, y + 4, { align: "center" });

      y += 7.5;
    });

    y += 3;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(startX, y, startX + tableW, y);
    y += 4;

    doc.setFillColor(...COLORS.navyMid);
    doc.roundedRect(startX, y, tableW, 8, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL FRAIS", startX + 5, y + 5.5);
    doc.text(formatEuro(bilanContent.totalFrais || 0), startX + tableW - 5, y + 5.5, { align: "right" });

    return y + 18;
  } catch (e) {
    console.error("Erreur drawFraisTable:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// FRAIS KILOMÉTRIQUES
// ─────────────────────────────────────────────
const drawKmFeesTable = (doc, bilanContent, startY, labels = {}) => {
  const km = bilanContent.fraisKilometriques;
  if (!km?.totalAmount || km.totalAmount <= 0) return startY;
  const validItems = (km.items || []).filter((i) => i.amount !== null && i.amount > 0);
  if (!validItems.length) return startY;
  try {
    let y = startY;
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Frais kilométriques", 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 75, y + 2);
    y += 8;

    const headers = ["Date", (labels.lieu || "Lieu") + " / " + (labels.client || "Client"), "Km (AR)", "Montant"];
    const colWidths = [30, 85, 30, 40];
    const startX = 15;
    const tableW = colWidths.reduce((a, b) => a + b, 0);

    y = drawTableHeader(doc, startX, y, headers, colWidths, COLORS.navyMid);

    validItems.forEach((item, idx) => {
      if (y > 268) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startX, y - 1, tableW, 7.5, "F");
      }
      let cx = startX;
      doc.setFontSize(7);

      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, "normal");
      doc.text(formatDateFR(item.date) || "-", cx + 2, y + 4);
      cx += colWidths[0];

      doc.setTextColor(...COLORS.textPrimary);
      doc.text((item.labelLieuOuClient || "").substring(0, 40), cx + 2, y + 4);
      cx += colWidths[1];

      doc.setTextColor(...COLORS.navyLight);
      doc.text(`${Math.round(item.kmTotal || 0)} km`, cx + colWidths[2] / 2, y + 4, { align: "center" });
      cx += colWidths[2];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(item.amount || 0), cx + colWidths[3] / 2, y + 4, { align: "center" });

      y += 7.5;
    });

    y += 3;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(startX, y, startX + tableW, y);
    y += 4;

    doc.setFillColor(...COLORS.navyMid);
    doc.roundedRect(startX, y, tableW, 8, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL FRAIS KM", startX + 5, y + 5.5);
    doc.text(`${Math.round(km.totalKm || 0)} km`, startX + tableW - 55, y + 5.5, { align: "center" });
    doc.text(formatEuro(km.totalAmount || 0), startX + tableW - 5, y + 5.5, { align: "right" });

    return y + 18;
  } catch (e) {
    console.error("Erreur drawKmFeesTable:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// SECTION ACOMPTES
// ─────────────────────────────────────────────
const drawAcomptesSection = (doc, bilanContent, startY) => {
  const hasAcomptes =
    (bilanContent.soldeAcomptesAvant  || 0) > 0 ||
    (bilanContent.acomptesDansPeriode || 0) > 0 ||
    (bilanContent.totalAcomptes       || 0) > 0 ||
    (bilanContent.soldeAcomptesApres  || 0) > 0;
  if (!hasAcomptes) return startY;

  try {
    let y = startY;
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Suivi des acomptes", 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 72, y + 2);
    y += 8;

    const boxW = 185;
    const boxX = 12;

    doc.setFillColor(...COLORS.offWhite);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, y, boxW, 38, 3, 3, "FD");

    // Barre navy gauche
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(boxX, y, 3, 38, 2, 2, "F");

    y += 7;
    const rows = [
      { label: "Solde avant période",          value: formatEuro(bilanContent.soldeAcomptesAvant  || 0), color: COLORS.textSecondary },
      { label: "Acomptes reçus cette période",  value: `+${formatEuro(bilanContent.acomptesDansPeriode || 0)}`, color: COLORS.success },
      { label: "Consommé cette période",        value: `-${formatEuro(bilanContent.totalAcomptes   || 0)}`, color: COLORS.danger   },
    ];

    doc.setFontSize(8);
    rows.forEach((r) => {
      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(r.label, boxX + 8, y);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...r.color);
      doc.text(r.value, boxX + boxW - 5, y, { align: "right" });
      y += 7;
    });

    // Ligne séparatrice
    doc.setDrawColor(...COLORS.border);
    doc.line(boxX + 8, y, boxX + boxW - 8, y);
    y += 5;

    // Solde à reporter en grand
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(boxX + 3, y - 3, boxW - 6, 9, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.white);
    doc.text("SOLDE À REPORTER", boxX + 8, y + 3);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.gold);
    doc.text(formatEuro(bilanContent.soldeAcomptesApres || 0), boxX + boxW - 5, y + 3, { align: "right" });

    return y + 14;
  } catch (e) {
    console.error("Erreur drawAcomptesSection:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// RÉSUMÉ PAR SEMAINE (BILAN MOIS)
// ─────────────────────────────────────────────
const drawWeeklySummary = (doc, bilanContent, startY) => {
  if (!bilanContent.groupedData?.length) return startY;
  try {
    let y = startY;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Résumé par semaine", 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 72, y + 2);
    y += 8;

    const headers   = ["Semaine", "Heures", "Montant"];
    const colWidths = [120, 35, 30];
    const startX    = 15;
    const tableW    = colWidths.reduce((a, b) => a + b, 0);

    y = drawTableHeader(doc, startX, y, headers, colWidths, COLORS.navy);

    bilanContent.groupedData.forEach((g, idx) => {
      if (y > 268) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startX, y - 1, tableW, 7.5, "F");
      }
      let cx = startX;
      doc.setFontSize(8);

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFont(undefined, "bold");
      doc.text(g.label || "", cx + 5, y + 4);
      cx += colWidths[0];

      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.navyLight);
      doc.text(formatHeures(g.h || 0), cx + colWidths[1] / 2, y + 4, { align: "center" });
      cx += colWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(g.e || 0), cx + colWidths[2] / 2, y + 4, { align: "center" });

      y += 7.5;
    });

    y += 4;
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(startX, y, tableW, 8, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL", startX + 5, y + 5.5);
    doc.text(formatHeures(bilanContent.totalH || 0), startX + colWidths[0] + colWidths[1] / 2, y + 5.5, { align: "center" });
    doc.setTextColor(...COLORS.gold);
    doc.text(formatEuro(bilanContent.totalE || 0), startX + colWidths[0] + colWidths[1] + colWidths[2] / 2, y + 5.5, { align: "center" });

    return y + 16;
  } catch (e) {
    console.error("Erreur drawWeeklySummary:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// RÉSUMÉ PAR MOIS (BILAN ANNÉE)
// ─────────────────────────────────────────────
const drawMonthlySummary = (doc, bilanContent, startY) => {
  if (!bilanContent.groupedData?.length) return startY;
  try {
    let y = startY;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Résumé par mois", 15, y);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, y + 2, 65, y + 2);
    y += 8;

    const headers   = ["Mois", "Heures", "Montant"];
    const colWidths = [120, 35, 30];
    const startX    = 15;
    const tableW    = colWidths.reduce((a, b) => a + b, 0);

    y = drawTableHeader(doc, startX, y, headers, colWidths, COLORS.navyMid);

    bilanContent.groupedData.forEach((g, idx) => {
      if (y > 268) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(startX, y - 1, tableW, 7.5, "F");
      }
      let cx = startX;
      doc.setFontSize(8);

      doc.setTextColor(...COLORS.textPrimary);
      doc.setFont(undefined, "bold");
      doc.text(g.label || "", cx + 5, y + 4);
      cx += colWidths[0];

      doc.setFont(undefined, "normal");
      doc.setTextColor(...COLORS.navyLight);
      doc.text(formatHeures(g.h || 0), cx + colWidths[1] / 2, y + 4, { align: "center" });
      cx += colWidths[1];

      doc.setFont(undefined, "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(formatEuro(g.e || 0), cx + colWidths[2] / 2, y + 4, { align: "center" });

      y += 7.5;
    });

    y += 4;
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(startX, y, tableW, 8, 2, 2, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL ANNUEL", startX + 5, y + 5.5);
    doc.text(formatHeures(bilanContent.totalH || 0), startX + colWidths[0] + colWidths[1] / 2, y + 5.5, { align: "center" });
    doc.setTextColor(...COLORS.gold);
    doc.text(formatEuro(bilanContent.totalE || 0), startX + colWidths[0] + colWidths[1] + colWidths[2] / 2, y + 5.5, { align: "center" });

    return y + 16;
  } catch (e) {
    console.error("Erreur drawMonthlySummary:", e);
    return startY;
  }
};

// ─────────────────────────────────────────────
// TAMPON PAYÉ
// ─────────────────────────────────────────────
const drawPayeStamp = (doc) => {
  try {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const cx = 210 / 2;
      const cy = 297 / 2;

      doc.setDrawColor(0, 120, 60);
      doc.setLineWidth(3);
      doc.roundedRect(cx - 55, cy - 16, 110, 32, 5, 5, "S");

      doc.setTextColor(0, 120, 60);
      doc.setFontSize(44);
      doc.setFont(undefined, "bold");
      doc.text("PAYÉ", cx, cy + 8, { align: "center" });

      doc.setFontSize(9);
      doc.setFont(undefined, "italic");
      const dateStr = new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      });
      doc.text(`Réglé le ${dateStr}`, cx, cy + 18, { align: "center" });
    }
  } catch (e) {
    console.error("Erreur drawPayeStamp:", e);
  }
};

// ─────────────────────────────────────────────
// PIED DE PAGE
// ─────────────────────────────────────────────
const drawFooter = (doc) => {
  try {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Bande navy
      doc.setFillColor(...COLORS.navy);
      doc.rect(0, 287, 210, 10, "F");

      // Bande or fine
      doc.setFillColor(...COLORS.gold);
      doc.rect(0, 287, 210, 0.8, "F");

      doc.setFontSize(7.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(180, 200, 230);
      doc.text("Heures de Geo — Rapport d'activité professionnel", 15, 293);
      doc.setTextColor(...COLORS.gold);
      doc.text(`Page ${i} / ${pageCount}`, 195, 293, { align: "right" });
    }
  } catch (e) {
    console.error("Erreur drawFooter:", e);
  }
};

// ─────────────────────────────────────────────
// EXPORT PRINCIPAL
// ─────────────────────────────────────────────
export const exportToPDFPro = (
  bilanContent,
  periodType,
  estPaye = false,
  periodValue = "",
  profile = null,
  labels = {}
) => {
  if (!bilanContent) {
    console.error("❌ exportToPDFPro: bilanContent est requis");
    alert("Erreur : Aucune donnée à exporter");
    return;
  }

  try {
    const doc = new jsPDF();

    let y = drawHeader(doc, bilanContent, periodType, periodValue);
    y = drawProfileSection(doc, profile, y);
    y = drawMetrics(doc, bilanContent, periodType, y);

    if (periodType === "semaine") {
      y = drawMissionsTable(doc, bilanContent, y, labels);
      y = drawFraisTable(doc, bilanContent, y);
      y = drawKmFeesTable(doc, bilanContent, y, labels);
      y = drawAcomptesSection(doc, bilanContent, y);
    } else if (periodType === "mois") {
      y = drawWeeklySummary(doc, bilanContent, y);
    } else if (periodType === "annee") {
      y = drawMonthlySummary(doc, bilanContent, y);
    }

    if (estPaye) drawPayeStamp(doc);
    drawFooter(doc);

    const fileName = `GeoBilan_${(bilanContent.titre || "export")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}.pdf`;

    doc.save(fileName);
  } catch (error) {
    console.error("❌ Erreur PDF:", error);
    alert("Erreur lors de la génération du PDF. Consultez la console.");
  }
};

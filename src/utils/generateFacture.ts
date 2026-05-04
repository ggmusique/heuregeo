import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Table } from "jspdf-autotable";
import { EU_TVA_RATES } from "./tvaRates";

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtEuro = (n: any): string =>
  Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const fmtDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const fmtH = (h: any): string => {
  if (h == null) return "";
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h00`;
};

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return fmtDate(d.toISOString().slice(0, 10));
};

// ── Couleurs ────────────────────────────────────────────────────────────────

const C: Record<string, [number, number, number]> = {
  navy:    [15,  40,  80],
  blue:    [44,  82, 148],
  blueB:   [26,  58, 110],
  gold:    [180, 145, 60],
  light:   [235, 240, 250],
  white:   [255, 255, 255],
  gray:    [120, 120, 130],
  grayL:   [220, 225, 235],
  red:     [200,  40,  40],
  black:   [20,   20,  30],
};

// ── Calcul numéro facture ──────────────────────────────────────────────────

function computeNumFacture(features: any): { numFacture: string; newCounter: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();
  const prevYear    = features?.facture_year    || year;
  const prevCounter = features?.facture_counter || 0;
  const newCounter  = prevYear === year ? prevCounter + 1 : 1;
  return {
    numFacture: `${year}-${String(newCounter).padStart(3, "0")}`,
    newCounter,
    year,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function generateFacture(
  bilanContent: any,
  periodType: string,
  periodValue: string,
  profile: any,
  patron: any,
  saveProfile: (data: any) => Promise<void>,
  labels: Record<string, string> = {}
): Promise<void> {
  const features = profile?.features || {};
  const { numFacture, newCounter, year } = computeNumFacture(features);

  const today    = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const echeance = addDays(todayIso, 30);
  const dateStr  = fmtDate(todayIso);

  // --- TVA ---
  const pays  = features.pays_tva || "FR";
  const entry = EU_TVA_RATES.find((r) => r.code === pays);
  const tvaRate = entry ? parseFloat(entry.rate) : 0;

  // --- Missions ---
  const missions = bilanContent?.filteredData || [];
  const sortedMissions = [...missions].sort((a: any, b: any) =>
    (a.date_iso || "").localeCompare(b.date_iso || "")
  );

  // --- Frais divers ---
  const fraisDivers = bilanContent?.fraisDivers || [];

  // --- Frais km ---
  const km = bilanContent?.fraisKilometriques;
  const hasKm = km && km.totalAmount > 0;

  // --- Totaux HT ---
  const totalMissions = sortedMissions.reduce((s: number, m: any) => s + (m.montant || 0), 0);
  const totalFrais    = fraisDivers.reduce((s: number, f: any) => s + (f.montant || 0), 0);
  const totalKmAmt    = hasKm ? (km.totalAmount || 0) : 0;
  const totalHT       = totalMissions + totalFrais + totalKmAmt;
  const tvaAmt        = Math.round(totalHT * tvaRate) / 100;
  const totalTTC      = totalHT + tvaAmt;

  // ── Init jsPDF ─────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 18, MR = 18, CT = W - ML - MR; // page width, margins, content width

  let y = 0; // current Y cursor

  // ── HEADER BAND ────────────────────────────────────────────────────────
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 38, "F");

  // Nom prestataire (gauche)
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(((profile?.prenom || "") + " " + (profile?.nom || "")).trim() || "Prestataire", ML, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let hY = 20;
  const profLines: string[] = [
    profile?.adresse,
    [profile?.code_postal, profile?.ville].filter(Boolean).join(" "),
    profile?.telephone,
    features?.numero_tva ? "N° TVA : " + features.numero_tva : null,
  ].filter(Boolean) as string[];
  profLines.forEach((l) => { doc.text(l, ML, hY); hY += 4.5; });

  // FACTURE title (droite)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...C.gold);
  doc.text("FACTURE", W - MR, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(`N° ${numFacture}`, W - MR, 23, { align: "right" });
  doc.text(`Date : ${dateStr}`, W - MR, 28, { align: "right" });
  doc.text(`Échéance : ${echeance}`, W - MR, 33, { align: "right" });

  y = 46;

  // ── BLOC CLIENT ────────────────────────────────────────────────────────
  doc.setFillColor(...C.light);
  const clientLines: string[] = [
    (patron?.nom || bilanContent?.selectedPatronNom || labels.patron || "Client"),
    patron?.adresse,
    [patron?.code_postal, patron?.ville].filter(Boolean).join(" "),
    patron?.telephone ? "Tél : " + patron.telephone : null,
    patron?.email,
    patron?.siret ? "SIRET : " + patron.siret : null,
  ].filter(Boolean) as string[];
  const clientBoxH = 8 + clientLines.length * 5;
  doc.roundedRect(ML, y, CT, clientBoxH, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.navy);
  doc.text("FACTURÉ À", ML + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.black);
  let cY = y + 12;
  clientLines.forEach((l, i) => {
    if (i === 0) { doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); }
    else         { doc.setFont("helvetica", "normal"); doc.setFontSize(9); }
    doc.text(l, ML + 5, cY);
    cY += 5;
  });

  y += clientBoxH + 8;

  // ── LIBELLÉ PÉRIODE ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.blueB);
  const periodeLabel = bilanContent?.titre || periodValue || "";
  doc.text(`Objet : Prestations de services — ${periodeLabel}`, ML, y);
  y += 8;

  // ── TABLEAU MISSIONS ───────────────────────────────────────────────────
  if (sortedMissions.length > 0) {
    const missionRows = sortedMissions.map((m: any) => {
      const taux = m.duree > 0 ? fmtEuro(m.montant / m.duree).replace(" €", "") + " €/h" : "-";
      return [
        fmtDate(m.date_iso),
        m.lieu || m.client || labels.mission || "Prestation",
        fmtH(m.duree),
        taux,
        fmtEuro(m.montant),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Date", labels.mission || "Prestation", "Durée", "Taux", "Montant"]],
      body: missionRows,
      margin: { left: ML, right: MR },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        textColor: C.black,
        lineColor: C.grayL,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: C.blueB,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: C.light },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 26, halign: "right" },
        4: { cellWidth: 26, halign: "right" },
      },
    });

    y = ((doc as unknown as { lastAutoTable: Table }).lastAutoTable?.finalY ?? y) + 4;
  }

  // ── FRAIS DIVERS ───────────────────────────────────────────────────────
  if (fraisDivers.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Frais divers", "", "", "Montant"]],
      body: fraisDivers.map((f: any) => [
        fmtDate(f.date_frais),
        f.description || "Frais",
        "", "",
        fmtEuro(f.montant),
      ]),
      margin: { left: ML, right: MR },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: C.black, lineColor: C.grayL, lineWidth: 0.1 },
      headStyles: { fillColor: C.blue, textColor: C.white, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26, halign: "right" },
      },
    });
    y = ((doc as unknown as { lastAutoTable: Table }).lastAutoTable?.finalY ?? y) + 4;
  }

  // ── FRAIS KM ────────────────────────────────────────────────────────────
  if (hasKm) {
    autoTable(doc, {
      startY: y,
      head: [["", "Frais kilométriques", "", "km", "Montant"]],
      body: [["", `${Math.round(km.totalKm)} km parcourus`, "", String(Math.round(km.totalKm)), fmtEuro(km.totalAmount)]],
      margin: { left: ML, right: MR },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: C.black, lineColor: C.grayL, lineWidth: 0.1 },
      headStyles: { fillColor: C.blue, textColor: C.white, fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18 },
        3: { cellWidth: 26, halign: "right" },
        4: { cellWidth: 26, halign: "right" },
      },
    });
    y = ((doc as unknown as { lastAutoTable: Table }).lastAutoTable?.finalY ?? y) + 4;
  }

  // ── TOTAUX ─────────────────────────────────────────────────────────────
  // Assez d'espace sur la page ?
  if (y > 230) { doc.addPage(); y = 20; }

  const totX = W - MR - 80;
  const totW = 80;

  doc.setFillColor(...C.light);
  const totH = tvaRate > 0 ? 32 : 22;
  doc.roundedRect(totX, y, totW, totH, 3, 3, "F");

  const totRight = W - MR - 2;
  let tY = y + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.gray);
  doc.text("Sous-total HT :", totX + 5, tY);
  doc.setTextColor(...C.black);
  doc.text(fmtEuro(totalHT), totRight, tY, { align: "right" }); tY += 7;

  if (tvaRate > 0) {
    doc.setTextColor(...C.gray);
    doc.setFont("helvetica", "normal");
    doc.text(`TVA (${tvaRate}%) :`, totX + 5, tY);
    doc.setTextColor(...C.black);
    doc.text(fmtEuro(tvaAmt), totRight, tY, { align: "right" }); tY += 2;

    doc.setDrawColor(...C.blueB);
    doc.setLineWidth(0.5);
    doc.line(totX + 4, tY, totRight, tY); tY += 6;
  }

  // Total TTC
  doc.setFillColor(...C.navy);
  doc.roundedRect(totX, tY - 5, totW, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("TOTAL TTC :", totX + 5, tY + 3);
  doc.setTextColor(...C.gold);
  doc.text(fmtEuro(totalTTC), totRight, tY + 3, { align: "right" });

  y = tY + 16;

  // ── TAMPON PAYÉ ────────────────────────────────────────────────────────
  if (bilanContent?.bilanPaye) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(52);
    doc.setTextColor(...(C.red.map((v) => Math.min(255, v + 40)) as [number, number, number]));
    doc.setGState(doc.GState({ opacity: 0.18 }));
    doc.text("PAYÉ", W / 2, 160, { align: "center", angle: -35 });
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // ── PIED DE PAGE ───────────────────────────────────────────────────────
  const pgH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);

  const footLines = [
    "Conditions de paiement : 30 jours à réception de facture.",
    tvaRate > 0
      ? `TVA calculée au taux de ${tvaRate}% (${entry?.label || pays}).`
      : "TVA non applicable — article 293 B du CGI.",
  ];
  let fY = pgH - 14;
  doc.setDrawColor(...C.grayL);
  doc.line(ML, fY - 3, W - MR, fY - 3);
  footLines.forEach((l) => { doc.text(l, ML, fY); fY += 4.5; });
  doc.text(`Facture N° ${numFacture} — Émise le ${dateStr}`, W - MR, pgH - 10, { align: "right" });

  // ── SAUVEGARDE ─────────────────────────────────────────────────────────
  const patronName = (patron?.nom || bilanContent?.selectedPatronNom || "Client")
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  doc.save(`Facture_${numFacture}_${patronName}.pdf`);

  // Incrémenter compteur en base
  await saveProfile({
    features: {
      ...features,
      facture_counter: newCounter,
      facture_year:    year,
    },
  });
}

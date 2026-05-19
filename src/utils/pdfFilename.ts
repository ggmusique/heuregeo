/**
 * Génère un nom de fichier PDF humain et professionnel.
 *
 * Exemples :
 *   buildPdfFilename("Geoffrey", null, "semaine", "19") → "Geoffrey semaine 19.pdf"
 *   buildPdfFilename("Annie",    null, "mois",    "2026-05") → "Annie mai 2026.pdf"
 *   buildPdfFilename(null, "Dupont", "annee", "2026") → "Dupont 2026.pdf"
 *
 * Utilisé par :
 *   - export PDF normal (exportToPDFPro)
 *   - export PDF sécurisé WhatsApp (handleSecureWhatsAppShare dans BilanTab)
 */

const MOIS_FR = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

/** Sanitise un nom propre pour usage dans un nom de fichier. */
function sanitizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // supprime les accents
    .replace(/[^\w\s]/g, "")           // garde lettres, chiffres, espaces
    .trim();
}

/** Formate le libellé de la période pour le nom de fichier. */
function formatPeriod(periodType: string, periodValue: string): string {
  if (periodType === "semaine") {
    return `semaine ${periodValue}`;
  }
  if (periodType === "mois") {
    const [year, month] = (periodValue || "").split("-");
    const label = MOIS_FR[parseInt(month ?? "0", 10) - 1] ?? month ?? "";
    return `${label} ${year}`.trim();
  }
  // annee ou fallback
  return periodValue;
}

/**
 * Construit un nom de fichier PDF humain.
 *
 * @param prenom  Prénom de l'utilisateur (profile.prenom)
 * @param nom     Nom de famille (profile.nom) — utilisé en fallback si pas de prénom
 * @param periodType  "semaine" | "mois" | "annee"
 * @param periodValue Valeur de la période ("19", "2026-05", "2026")
 */
export function buildPdfFilename(
  prenom: string | null | undefined,
  nom: string | null | undefined,
  periodType: string,
  periodValue: string,
): string {
  const name = sanitizeName(prenom || nom || "bilan");
  const period = formatPeriod(periodType, periodValue);
  return `${name} ${period}.pdf`.replace(/\s+/g, " ").trim();
}

/**
 * Utilitaires de gestion des dates
 * => ici, on fait tout ce qui touche aux dates :
 * - afficher proprement
 * - vérifier si une date est valide
 * - calculer le numéro de semaine
 * - trouver le lundi d'une semaine (super important pour ton bilan)
 */

const MS_PER_DAY = 86400000;

/**
 * ==========================================================
 * 1) getDateParts(iso)
 * ==========================================================
 * Rôle dans l'app :
 * - Quand tu affiches une mission, tu veux souvent :
 *   jour (ex: "05"), mois ("FÉVRIER"), année (2026)
 * - Ça sert à faire de jolies cartes UI avec "jour + mois" etc.
 *
 * Entrée : "YYYY-MM-DD"
 * Sortie : { day, month, year }
 */
export const getDateParts = (iso: string): { day: string; month: string; year: number } => {
  if (!iso) {
    console.warn("getDateParts: date ISO manquante");
    return { day: "01", month: "JANVIER", year: new Date().getFullYear() };
  }

  const d = new Date(iso);

  // Si la date est invalide => on renvoie une valeur "safe" (pas de crash)
  if (isNaN(d.getTime())) {
    console.warn("getDateParts: date ISO invalide:", iso);
    return { day: "01", month: "JANVIER", year: new Date().getFullYear() };
  }

  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: d.toLocaleString("fr-FR", { month: "long" }).toUpperCase(),
    year: d.getFullYear(),
  };
};

/**
 * ==========================================================
 * 2) getWeekNumber(date)
 * ==========================================================
 * Rôle dans l'app :
 * - C'est ce qui te dit "Semaine 6", "Semaine 12", etc.
 * - Utilisé dans :
 *   - onglet "bilan"
 *   - regroupements
 *   - calcul des périodes disponibles
 *
 * Important :
 * - C'est la norme ISO 8601 : la semaine commence lundi
 * - Et la semaine 1 est celle qui contient le 4 janvier
 */
export const getWeekNumber = (date: Date): number => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("getWeekNumber: date invalide");
    return 1;
  }

  // Copie UTC pour éviter les bugs de fuseau horaire
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );

  // ISO: on se cale sur le jeudi de la semaine courante
  // (astuce standard ISO 8601)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  // Premier jour de l'année ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Calcul du numéro de semaine (1 à 53)
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);

  return weekNumber;
};

/**
 * ==========================================================
 * 3) getWeekStartDate(weekNumber, year)
 * ==========================================================
 * Rôle dans l'app :
 * - SUPER IMPORTANT pour ton bilan :
 *   tu as besoin d'un "début de semaine" (lundi) pour :
 *   - calculer debutPeriode
 *   - calculer finPeriode (lundi + 6 jours)
 *   - savoir quels acomptes sont dans la semaine
 *
 * Retour : "YYYY-MM-DD" (le lundi de la semaine)
 */
export const getWeekStartDate = (
  weekNumber: number,
  year: number = new Date().getFullYear()
): string => {
  // Sécurités pour éviter les crashes
  if (!weekNumber || weekNumber < 1 || weekNumber > 53) {
    console.warn("getWeekStartDate: numéro de semaine invalide:", weekNumber);
    return new Date().toISOString().split("T")[0];
  }

  if (!year || year < 1900 || year > 2100) {
    console.warn("getWeekStartDate: année invalide:", year);
    year = new Date().getFullYear();
  }

  // ISO: le 4 janvier est toujours dans la semaine 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // dimanche = 7

  // Lundi de la semaine 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(4 - (dayOfWeek - 1));

  // Lundi de la semaine demandée
  const mondayTargetWeek = new Date(mondayWeek1);
  mondayTargetWeek.setUTCDate(mondayWeek1.getUTCDate() + (weekNumber - 1) * 7);

  return mondayTargetWeek.toISOString().split("T")[0];
};

/**
 * ==========================================================
 * 4) formatDateFr(iso)
 * ==========================================================
 * Rôle dans l'app :
 * - Afficher une date propre en français :
 *   "2026-02-13" => "13 février 2026"
 * - Utilisé dans l'UI (ex: missions, modals, historique)
 */
export const formatDateFr = (iso: string): string => {
  if (!iso) return "";

  const d = new Date(iso);

  if (isNaN(d.getTime())) {
    console.warn("formatDateFr: date invalide:", iso);
    return "";
  }

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * ==========================================================
 * 5) isValidDateIso(iso)
 * ==========================================================
 * Rôle dans l'app :
 * - Petit "contrôle qualité" :
 *   vérifie que c'est bien "YYYY-MM-DD"
 * - Utile avant d'enregistrer en base ou faire des calculs
 */
export const isValidDateIso = (iso: string): boolean => {
  if (!iso || typeof iso !== "string") return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(iso)) return false;

  const d = new Date(iso);
  return !isNaN(d.getTime());
};

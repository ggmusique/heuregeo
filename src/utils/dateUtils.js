/**
 * Utilitaires de gestion des dates
 */

/**
 * Extrait les parties d'une date ISO
 * @param {string} iso - Date au format ISO (YYYY-MM-DD)
 * @returns {Object} - { day, month, year }
 */
export const getDateParts = (iso) => {
  if (!iso) {
    console.warn("getDateParts: date ISO manquante");
    return { day: "01", month: "JANVIER", year: new Date().getFullYear() };
  }

  const d = new Date(iso);

  // Vérifier si la date est valide
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
 * Calcule le numéro de semaine ISO d'une date
 * @param {Date} date - Objet Date
 * @returns {number} - Numéro de semaine (1-53)
 */
export const getWeekNumber = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("getWeekNumber: date invalide");
    return 1;
  }

  // Créer une copie pour ne pas modifier l'original
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );

  // Définir au jeudi de la semaine courante (ISO 8601)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  // Premier jour de l'année
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Calculer le numéro de semaine
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

  return weekNumber;
};

/**
 * Calcule la date de début (lundi) d'une semaine donnée
 * @param {number} weekNumber - Numéro de semaine (1-53)
 * @param {number} year - Année (défaut: année courante)
 * @returns {string} - Date ISO du lundi de la semaine (YYYY-MM-DD)
 */
export const getWeekStartDate = (
  weekNumber,
  year = new Date().getFullYear()
) => {
  // Validation des entrées
  if (!weekNumber || weekNumber < 1 || weekNumber > 53) {
    console.warn("getWeekStartDate: numéro de semaine invalide:", weekNumber);
    return new Date().toISOString().split("T")[0];
  }

  if (!year || year < 1900 || year > 2100) {
    console.warn("getWeekStartDate: année invalide:", year);
    year = new Date().getFullYear();
  }

  // Le 4 janvier est toujours dans la semaine 1 (ISO 8601)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Dimanche = 7

  // Trouver le lundi de la semaine 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(4 - (dayOfWeek - 1));

  // Calculer le lundi de la semaine cible
  const mondayTargetWeek = new Date(mondayWeek1);
  mondayTargetWeek.setUTCDate(mondayWeek1.getUTCDate() + (weekNumber - 1) * 7);

  return mondayTargetWeek.toISOString().split("T")[0];
};

/**
 * Formate une date ISO en format français lisible
 * @param {string} iso - Date au format ISO (YYYY-MM-DD)
 * @returns {string} - Date formatée (ex: "15 janvier 2024")
 */
export const formatDateFr = (iso) => {
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
 * Vérifie si une date ISO est valide
 * @param {string} iso - Date au format ISO (YYYY-MM-DD)
 * @returns {boolean}
 */
export const isValidDateIso = (iso) => {
  if (!iso || typeof iso !== "string") return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(iso)) return false;

  const d = new Date(iso);
  return !isNaN(d.getTime());
};

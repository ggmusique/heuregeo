/**
 * Fonctions de formatage
 * => Ici : on transforme des valeurs "brutes" (number, date ISO, minutes)
 * en texte joli à afficher dans l’interface.
 *
 * IMPORTANT :
 * - Ce fichier ne modifie pas la base de données
 * - Il ne fait pas de calculs “métier”
 * - Il sert seulement à AFFICHER.
 */

/**
 * ==========================================================
 * 1) formatEuro(num)
 * ==========================================================
 * Rôle dans l’app :
 * - Afficher tous les montants en € (missions, frais, bilans, impayés…)
 * Exemple :
 *   1234.5 => "1 234,50 €"
 */
export const formatEuro = (num) => {
  // Si ce n’est pas un vrai nombre => on évite le crash et on affiche 0
  if (typeof num !== "number" || isNaN(num)) {
    return "0,00 €";
  }

  return (
    num.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
};

/**
 * ==========================================================
 * 2) formatHeures(num)
 * ==========================================================
 * Rôle dans l’app :
 * - Afficher les heures travaillées (bilan, regroupements, missions…)
 * Exemple :
 *   8.5 => "8,50 h"
 */
export const formatHeures = (num) => {
  if (typeof num !== "number" || isNaN(num)) {
    return "0,00 h";
  }

  return (
    num.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " h"
  );
};

/**
 * ==========================================================
 * 3) formatDateFR(iso)
 * ==========================================================
 * Rôle dans l’app :
 * - Affiche une date ISO (YYYY-MM-DD) en version française simple JJ/MM/AAAA
 * Exemple :
 *   "2026-02-13" => "13/02/2026"
 *
 * Note :
 * - Ici c’est un format “rapide” (pas "13 février 2026")
 * - Pour une version longue, tu as formatDateFr dans dateUtils (autre fichier)
 */
export const formatDateFR = (iso) => {
  if (!iso || typeof iso !== "string") {
    return "-";
  }

  const parts = iso.split("-");

  // Vérifie que ça ressemble bien à YYYY-MM-DD
  if (parts.length !== 3) {
    return "-";
  }

  // reverse => [DD, MM, YYYY]
  return parts.reverse().join("/");
};

/**
 * ==========================================================
 * 4) formatDuree(minutes)
 * ==========================================================
 * Rôle dans l’app :
 * - Convertit une durée en minutes en texte lisible
 * Exemple :
 *   90 => "1h30"
 *   45 => "45min"
 *   120 => "2h"
 */
export const formatDuree = (minutes) => {
  if (typeof minutes !== "number" || isNaN(minutes) || minutes < 0) {
    return "0min";
  }

  const heures = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (heures === 0) {
    return `${mins}min`;
  }

  if (mins === 0) {
    return `${heures}h`;
  }

  return `${heures}h${mins.toString().padStart(2, "0")}`;
};

/**
 * ==========================================================
 * 5) formatPourcent(num, decimals = 1)
 * ==========================================================
 * Rôle dans l’app :
 * - Afficher des pourcentages proprement
 * Exemple :
 *   75.456 => "75,5 %"
 */
export const formatPourcent = (num, decimals = 1) => {
  if (typeof num !== "number" || isNaN(num)) {
    return "0 %";
  }

  return (
    num.toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " %"
  );
};

/**
 * ==========================================================
 * 6) formatSemaine(weekNum)
 * ==========================================================
 * Rôle dans l’app :
 * - Afficher le numéro de semaine en texte lisible
 * Exemple :
 *   12 => "Semaine 12"
 */
export const formatSemaine = (weekNum) => {
  if (typeof weekNum !== "number" || isNaN(weekNum)) {
    return "Semaine -";
  }
  return `Semaine ${weekNum}`;
};

/**
 * ==========================================================
 * 7) capitalize(str)
 * ==========================================================
 * Rôle dans l’app :
 * - Met une chaîne en “Joli” :
 *   "pIERRE" => "Pierre"
 * - Peut servir pour noms, lieux, libellés...
 */
export const capitalize = (str) => {
  if (!str || typeof str !== "string") {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * ==========================================================
 * 8) truncate(str, maxLength = 30)
 * ==========================================================
 * Rôle dans l’app :
 * - Coupe un texte trop long pour éviter que l’UI déborde
 * Exemple :
 *   "Un texte très très très long..." => "Un texte très très très lo..."
 */
export const truncate = (str, maxLength = 30) => {
  if (!str || typeof str !== "string") {
    return "";
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
};

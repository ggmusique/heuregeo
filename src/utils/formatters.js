/**
 * Fonctions de formatage
 */

/**
 * Formate un nombre en euros (format français)
 * @param {number} num - Nombre à formater
 * @returns {string} - Montant formaté (ex: "1 234,56 €")
 */
export const formatEuro = (num) => {
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
 * Formate un nombre en heures (format français)
 * @param {number} num - Nombre d'heures à formater
 * @returns {string} - Heures formatées (ex: "8,50 h")
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
 * Formate une date ISO en format français (JJ/MM/AAAA)
 * @param {string} iso - Date au format ISO (YYYY-MM-DD)
 * @returns {string} - Date formatée (ex: "15/01/2024")
 */
export const formatDateFR = (iso) => {
  if (!iso || typeof iso !== "string") {
    return "-";
  }

  const parts = iso.split("-");

  // Vérifier que c'est bien une date ISO valide
  if (parts.length !== 3) {
    return "-";
  }

  return parts.reverse().join("/");
};

/**
 * Formate une durée en minutes en format lisible
 * @param {number} minutes - Durée en minutes
 * @returns {string} - Durée formatée (ex: "1h30" ou "45min")
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
 * Formate un pourcentage
 * @param {number} num - Nombre à formater en pourcentage
 * @param {number} decimals - Nombre de décimales (défaut: 1)
 * @returns {string} - Pourcentage formaté (ex: "75,5 %")
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
 * Formate un numéro de semaine
 * @param {number} weekNum - Numéro de semaine
 * @returns {string} - Semaine formatée (ex: "Semaine 12")
 */
export const formatSemaine = (weekNum) => {
  if (typeof weekNum !== "number" || isNaN(weekNum)) {
    return "Semaine -";
  }
  return `Semaine ${weekNum}`;
};

/**
 * Capitalise la première lettre d'une chaîne
 * @param {string} str - Chaîne à capitaliser
 * @returns {string} - Chaîne avec première lettre en majuscule
 */
export const capitalize = (str) => {
  if (!str || typeof str !== "string") {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Tronque une chaîne si elle dépasse une longueur maximale
 * @param {string} str - Chaîne à tronquer
 * @param {number} maxLength - Longueur maximale (défaut: 30)
 * @returns {string} - Chaîne tronquée avec "..." si nécessaire
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


/**
 * Fonctions de calcul métier
 */

/**
 * Calcule la durée de travail en heures
 * @param {string} debut - Heure de début (format "HH:MM")
 * @param {string} fin - Heure de fin (format "HH:MM")
 * @param {number} pause - Durée de pause en minutes
 * @returns {number} - Durée en heures
 */
export const calculerDuree = (debut, fin, pause = 0) => {
  // Validation des entrées
  if (!debut || !fin) {
    console.warn("calculerDuree: debut ou fin manquant");
    return 0;
  }

  const debutParts = debut.split(":");
  const finParts = fin.split(":");

  if (debutParts.length !== 2 || finParts.length !== 2) {
    console.warn("calculerDuree: format d'heure invalide");
    return 0;
  }

  const [hD, mD] = debutParts.map(Number);
  const [hF, mF] = finParts.map(Number);

  // Vérification que les valeurs sont des nombres valides
  if (isNaN(hD) || isNaN(mD) || isNaN(hF) || isNaN(mF)) {
    console.warn("calculerDuree: valeurs d'heure non numériques");
    return 0;
  }

  let minutesDebut = hD * 60 + mD;
  let minutesFin = hF * 60 + mF;

  // Gestion du passage à minuit
  if (minutesFin < minutesDebut) {
    minutesFin += 1440; // 24 * 60
  }

  const pauseMinutes = Number(pause) || 0;
  const dureeMinutes = minutesFin - minutesDebut - pauseMinutes;

  return Math.max(0, dureeMinutes / 60);
};

/**
 * Calcule le solde des acomptes avant une date de référence
 * @param {string} dateReferenceIso - Date de référence au format ISO (YYYY-MM-DD)
 * @param {Array} listeAcomptes - Liste des acomptes
 * @param {Array} missions - Liste des missions
 * @param {Array} fraisDivers - Liste des frais divers
 * @returns {number} - Solde des acomptes
 */
export const calculerSoldeAcomptesAvant = (
  dateReferenceIso,
  listeAcomptes = [],
  missions = [],
  fraisDivers = []
) => {
  if (!dateReferenceIso) return 0;

  // Construire la liste des événements
  const events = [];

  // Ajouter les acomptes (crédit)
  listeAcomptes.forEach((ac) => {
    if (ac?.date_acompte && ac.date_acompte < dateReferenceIso) {
      events.push({
        type: "acompte",
        date: ac.date_acompte,
        montant: parseFloat(ac.montant) || 0,
      });
    }
  });

  // Ajouter les missions (débit du solde acompte)
  missions.forEach((m) => {
    if (m?.date_iso && m.date_iso < dateReferenceIso) {
      events.push({
        type: "mission",
        date: m.date_iso,
        montant: m.montant || 0,
      });
    }
  });

  // Ajouter les frais (débit du solde acompte)
  fraisDivers.forEach((f) => {
    const dateFrais = f?.date_frais;
    if (dateFrais && dateFrais < dateReferenceIso) {
      events.push({
        type: "frais",
        date: dateFrais,
        montant: parseFloat(f.montant) || 0,
      });
    }
  });

  // Trier par date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Calculer le solde
  let solde = 0;

  for (const evt of events) {
    if (evt.type === "acompte") {
      // Les acomptes augmentent le solde
      solde += evt.montant;
    } else {
      // Les missions et frais consomment le solde disponible
      const consomme = Math.min(solde, evt.montant);
      solde -= consomme;
    }
  }

  return Math.max(0, solde);
};

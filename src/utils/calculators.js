/**
 * Fonctions de calcul métier
 * => ici, on ne touche PAS à l’interface (boutons, écran),
 * => c’est juste des calculs réutilisables partout.
 */

/**
 * ==========================================================
 * 1) calculerDuree(debut, fin, pause)
 * ==========================================================
 * Rôle dans l'app :
 * - Quand tu enregistres une mission, on calcule automatiquement la durée (heures)
 * - Exemple : 08:00 → 17:00 avec 30 min de pause => 8h30 (8.5)
 *
 * Important :
 * - Gère le passage à minuit (ex: 22:00 → 02:00)
 * - Empêche les résultats négatifs (retourne minimum 0)
 */
export const calculerDuree = (debut, fin, pause = 0) => {
  // Sécurité : si on n’a pas les 2 heures, on ne peut pas calculer
  if (!debut || !fin) {
    console.warn("calculerDuree: debut ou fin manquant");
    return 0;
  }

  // On découpe "HH:MM" en ["HH","MM"]
  const debutParts = debut.split(":");
  const finParts = fin.split(":");

  // Vérifie que le format est bien HH:MM
  if (debutParts.length !== 2 || finParts.length !== 2) {
    console.warn("calculerDuree: format d'heure invalide");
    return 0;
  }

  // Transforme les strings en nombres
  const [hD, mD] = debutParts.map(Number);
  const [hF, mF] = finParts.map(Number);

  // Vérifie que ce sont bien des chiffres
  if (isNaN(hD) || isNaN(mD) || isNaN(hF) || isNaN(mF)) {
    console.warn("calculerDuree: valeurs d'heure non numériques");
    return 0;
  }

  // Convertit en minutes totales depuis 00:00
  let minutesDebut = hD * 60 + mD;
  let minutesFin = hF * 60 + mF;

  // Cas "on finit après minuit" (ex: 22:00 -> 02:00)
  if (minutesFin < minutesDebut) {
    minutesFin += 1440; // 24h = 1440 minutes
  }

  // Pause (minutes)
  const pauseMinutes = Number(pause) || 0;

  // Durée en minutes = fin - début - pause
  const dureeMinutes = minutesFin - minutesDebut - pauseMinutes;

  // Retourne en heures (ex: 510 min => 8.5 h)
  return Math.max(0, dureeMinutes / 60);
};

/**
 * ==========================================================
 * 3) calculerAcomptesBilan(acomptes, missions, frais, debutPeriode, finPeriode, patronId)
 * ==========================================================
 * Pure function for computing acompte values for a billing period.
 * Returns:
 *   - acomptes_verses:    acomptes received during [debutPeriode, finPeriode]
 *   - acomptes_consommes: portion of available acomptes consumed by ca_brut
 *   - solde_avant:        acompte balance before debutPeriode (wallet simulation)
 *   - solde_apres:        remaining balance after this period
 *
 * Used by useBilan to replace the bilans_status_v2-based approach.
 */
export const calculerAcomptesBilan = (
  acomptes = [],
  missions = [],
  frais = [],
  debutPeriode,
  finPeriode,
  patronId = null
) => {
  if (!debutPeriode || !finPeriode) {
    return { acomptes_verses: 0, acomptes_consommes: 0, solde_avant: 0, solde_apres: 0 };
  }

  const filteredAcomptes = patronId
    ? acomptes.filter((a) => a?.patron_id === patronId)
    : acomptes;
  const filteredMissions = patronId
    ? missions.filter((m) => m?.patron_id === patronId)
    : missions;
  const filteredFrais = patronId
    ? frais.filter((f) => f?.patron_id === patronId)
    : frais;

  // Wallet simulation (strictly before debutPeriode)
  const solde_avant = calculerSoldeAcomptesAvant(
    debutPeriode,
    filteredAcomptes,
    filteredMissions,
    filteredFrais
  );

  // Acomptes received during the period [debutPeriode, finPeriode]
  const acomptes_verses = filteredAcomptes
    .filter(
      (a) =>
        a?.date_acompte &&
        a.date_acompte >= debutPeriode &&
        a.date_acompte <= finPeriode
    )
    .reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);

  // CA brut for the period
  const ca_brut = filteredMissions
    .filter(
      (m) =>
        m?.date_iso &&
        m.date_iso >= debutPeriode &&
        m.date_iso <= finPeriode
    )
    .reduce((sum, m) => sum + (m.montant || 0), 0);

  const disponible = solde_avant + acomptes_verses;
  const acomptes_consommes = Math.min(disponible, ca_brut);
  const solde_apres = Math.max(0, disponible - acomptes_consommes);

  return { acomptes_verses, acomptes_consommes, solde_avant, solde_apres };
};

/**
 * ==========================================================
 * 4) haversineKm(lat1, lon1, lat2, lon2)
 * ==========================================================
 * Calcule la distance à vol d'oiseau entre deux coordonnées GPS (en km).
 */
export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * getLieuLabel(lieu, mission)
 * Returns the display label for a KM item based on lieu resolution status:
 * - lieu found: use lieu.nom (or mission client as fallback)
 * - lieu not found but mission has a lieu text: "KM indisponible (lieu non lié)"
 * - no lieu info at all: mission client name
 */
export const getLieuLabel = (lieu, mission) => {
  if (lieu) return lieu.nom || mission.client || "";
  if (mission.lieu) return "KM indisponible (lieu non lié)";
  return mission.client || "";
};

/**
 * ==========================================================
 * 2) calculerSoldeAcomptesAvant(dateReferenceIso, acomptes, missions, frais)
 * ==========================================================================================================
 * Rôle dans l’app :
 * - Sert au bilan pour savoir : "Combien d’acompte RESTE avant telle date ?"
 * - Donc : on prend les acomptes reçus avant la date,
 *   puis on déduit les missions et frais qui sont avant la date,
 *   MAIS uniquement tant qu’il reste du solde (jamais négatif).
 *
 * Exemple simple :
 * - Acompte 300€ (avant la date)
 * - Mission 200€ (avant la date) => solde 100€
 * - Mission 150€ (avant la date) => consomme 100€, solde 0€ (et pas -50)
 *
 * Important :
 * - On ignore tout ce qui est le jour même ou après (strictement < dateReferenceIso)
 */
export const calculerSoldeAcomptesAvant = (
  dateReferenceIso,
  listeAcomptes = [],
  missions = [],
  fraisDivers = []
) => {
  if (!dateReferenceIso) return 0;

  // On construit une liste d' "événements" triés par date :
  // - acompte = + (crédit)
  // - mission/frais = - (débit)
  const events = [];

  // 1) Acomptes (argent qui entre)
  listeAcomptes.forEach((ac) => {
    if (ac?.date_acompte && ac.date_acompte < dateReferenceIso) {
      events.push({
        type: "acompte",
        date: ac.date_acompte,
        montant: parseFloat(ac.montant) || 0,
      });
    }
  });

  // 2) Missions (argent "consommé" par l’acompte)
  missions.forEach((m) => {
    if (m?.date_iso && m.date_iso < dateReferenceIso) {
      events.push({
        type: "mission",
        date: m.date_iso,
        montant: m.montant || 0,
      });
    }
  });

  // 3) Frais (consomment aussi l’acompte)
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

  // 4) On trie tout par date (ordre chrono)
  events.sort((a, b) => a.date.localeCompare(b.date));

  // 5) On simule un "porte-monnaie" : solde
  let solde = 0;

  for (const evt of events) {
    if (evt.type === "acompte") {
      // acompte = on ajoute de l'argent
      solde += evt.montant;
    } else {
      // mission/frais = on consomme si possible
      // Si solde = 50 et mission = 120 => on consomme 50 (solde devient 0)
      const consomme = Math.min(solde, evt.montant);
      solde -= consomme;
    }
  }

  // solde ne peut pas être négatif
  return Math.max(0, solde);
};

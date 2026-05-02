/** Labels d'interface configurables par l'utilisateur.
 *  Stockés dans profile.features.labels (JSON).
 *  Chaque clé a une valeur par défaut en français.
 */

export const DEFAULT_LABELS = {
  // Singulier
  patron:  "Patron",
  client:  "Client",
  lieu:    "Lieu",
  mission: "Mission",
  // Pluriel
  patrons:  "Patrons",
  clients:  "Clients",
  lieux:    "Lieux",
  missions: "Missions",
};

/**
 * Retourne les labels résolus depuis le profil.
 * Les valeurs manquantes tombent sur DEFAULT_LABELS.
 * @param {object|null} profile
 * @returns {typeof DEFAULT_LABELS}
 */
export function getLabels(profile: any): typeof DEFAULT_LABELS {
  const custom = profile?.features?.labels ?? {};
  return {
    patron:   custom.patron   ?? DEFAULT_LABELS.patron,
    client:   custom.client   ?? DEFAULT_LABELS.client,
    lieu:     custom.lieu     ?? DEFAULT_LABELS.lieu,
    mission:  custom.mission  ?? DEFAULT_LABELS.mission,
    patrons:  custom.patrons  ?? DEFAULT_LABELS.patrons,
    clients:  custom.clients  ?? DEFAULT_LABELS.clients,
    lieux:    custom.lieux    ?? DEFAULT_LABELS.lieux,
    missions: custom.missions ?? DEFAULT_LABELS.missions,
  };
}

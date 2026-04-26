/**
 * lieuUtils.js — Utilitaires partagés pour la résolution de lieux.
 *
 * Centralise le pattern "chercher un lieu par ID puis par nom"
 * qui était dupliqué dans useBilanKm et useBilanWeather.
 */

/**
 * Résout un lieu depuis la liste des lieux à partir d'une mission.
 * Cherche d'abord par ID, puis par nom (fallback insensible à la casse).
 *
 * @param {Array} lieux - Liste complète des lieux
 * @param {object} mission - Mission avec lieu_id et lieu (nom)
 * @returns {object|null} Lieu trouvé ou null
 */
export const resolveLieu = (lieux, mission) => {
  if (!lieux || !mission) return null;

  const lieuById = lieux.find((l) => l.id === mission.lieu_id);
  if (lieuById) return lieuById;

  if (mission.lieu) {
    return (
      lieux.find(
        (l) =>
          l.nom?.toLowerCase().trim() === mission.lieu?.toLowerCase().trim()
      ) || null
    );
  }

  return null;
};

import { haversineKm } from "./calculators.ts";

/**
 * Seuil de distance (km) en-dessous duquel un lieu est considéré "suspect"
 * (coordonnées trop proches du domicile)
 */
const SUSPECT_DISTANCE_KM = 0.5;

/**
 * Détecte si un lieu a des coordonnées suspectes (copiées du domicile).
 *
 * Conditions :
 *  - Les coordonnées du domicile sont connues (domicileLat/Lng)
 *  - Le lieu a des coordonnées (latitude/longitude non nulles)
 *  - Le nom du lieu est différent de "Domicile"
 *  - ET : distance < 0.5 km du domicile
 *  - OU : adresse_complete contient le homeLabel du domicile
 *
 * @param {object} lieu
 * @param {number|null} domicileLat
 * @param {number|null} domicileLng
 * @param {string|null} homeLabel
 * @returns {boolean}
 */
export function isSuspectLieu(lieu: any, domicileLat: number | null, domicileLng: number | null, homeLabel: string | null): boolean {
  if (!Number.isFinite(domicileLat) || !Number.isFinite(domicileLng)) return false;
  if (!Number.isFinite(lieu?.latitude) || !Number.isFinite(lieu?.longitude)) return false;

  const nomLower = (lieu.nom || "").toLowerCase().trim();
  if (nomLower === "domicile") return false;

  const dist = haversineKm(domicileLat as number, domicileLng as number, lieu.latitude, lieu.longitude);
  if (dist < SUSPECT_DISTANCE_KM) return true;

  if (homeLabel) {
    const labelLower = homeLabel.toLowerCase().trim();
    if (labelLower && (lieu.adresse_complete || "").toLowerCase().includes(labelLower)) return true;
  }

  return false;
}

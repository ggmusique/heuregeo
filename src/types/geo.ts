/**
 * Types géographiques partagés.
 */

// ─── Position ─────────────────────────────────────────────────────────────────

/**
 * Coordonnées géographiques WGS-84.
 * lat/lng sont null tant que la géolocalisation n'a pas encore abouti.
 */
export interface GeoPosition {
  lat: number | null;
  lng: number | null;
}

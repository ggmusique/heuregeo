export const EUROPE_COUNTRIES = [
  { code: "AT", label: "Autriche" },
  { code: "BE", label: "Belgique" },
  { code: "BG", label: "Bulgarie" },
  { code: "CH", label: "Suisse" },
  { code: "CY", label: "Chypre" },
  { code: "CZ", label: "Tchéquie" },
  { code: "DE", label: "Allemagne" },
  { code: "DK", label: "Danemark" },
  { code: "EE", label: "Estonie" },
  { code: "ES", label: "Espagne" },
  { code: "FI", label: "Finlande" },
  { code: "FR", label: "France" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "GR", label: "Grèce" },
  { code: "HR", label: "Croatie" },
  { code: "HU", label: "Hongrie" },
  { code: "IE", label: "Irlande" },
  { code: "IT", label: "Italie" },
  { code: "LT", label: "Lituanie" },
  { code: "LU", label: "Luxembourg" },
  { code: "LV", label: "Lettonie" },
  { code: "MT", label: "Malte" },
  { code: "NL", label: "Pays-Bas" },
  { code: "NO", label: "Norvège" },
  { code: "PL", label: "Pologne" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Roumanie" },
  { code: "SE", label: "Suède" },
  { code: "SI", label: "Slovénie" },
  { code: "SK", label: "Slovaquie" },
];

// Bounding boxes (lat/lng) pour détecter le pays automatiquement depuis des coordonnées GPS.
// Ordre : des plus petits pays aux plus grands pour limiter les faux positifs sur les zones
// frontalières.
const COUNTRY_BOUNDS = [
  // Îles / micro-États (pas de chevauchement continental)
  { code: "MT", latMin: 35.80, latMax: 36.10, lngMin: 14.18, lngMax: 14.58 },
  { code: "CY", latMin: 34.55, latMax: 35.72, lngMin: 32.25, lngMax: 34.62 },
  { code: "IE", latMin: 51.40, latMax: 55.40, lngMin: -10.50, lngMax: -5.95 },
  // Petits pays continentaux
  { code: "LU", latMin: 49.44, latMax: 50.18, lngMin: 5.73, lngMax: 6.53 },
  { code: "SI", latMin: 45.42, latMax: 46.89, lngMin: 13.38, lngMax: 16.61 },
  { code: "SK", latMin: 47.73, latMax: 49.61, lngMin: 16.84, lngMax: 22.56 },
  { code: "HU", latMin: 45.74, latMax: 48.58, lngMin: 16.11, lngMax: 22.90 },
  { code: "AT", latMin: 46.37, latMax: 49.02, lngMin: 9.53, lngMax: 17.16 },
  { code: "CH", latMin: 45.82, latMax: 47.81, lngMin: 6.02, lngMax: 10.49 },
  { code: "BE", latMin: 49.50, latMax: 51.51, lngMin: 2.54, lngMax: 6.41 },
  { code: "NL", latMin: 50.75, latMax: 53.55, lngMin: 3.36, lngMax: 7.23 },
  { code: "DK", latMin: 54.56, latMax: 57.75, lngMin: 8.07, lngMax: 15.20 },
  // Pays méditerranéens / Est
  { code: "PT", latMin: 36.84, latMax: 42.15, lngMin: -9.53, lngMax: -6.19 },
  { code: "GR", latMin: 34.80, latMax: 41.75, lngMin: 19.37, lngMax: 29.64 },
  { code: "HR", latMin: 42.39, latMax: 46.55, lngMin: 13.49, lngMax: 19.45 },
  { code: "BG", latMin: 41.23, latMax: 44.22, lngMin: 22.36, lngMax: 28.61 },
  { code: "RO", latMin: 43.62, latMax: 48.27, lngMin: 20.26, lngMax: 29.74 },
  // Pays baltes
  { code: "EE", latMin: 57.51, latMax: 59.68, lngMin: 21.76, lngMax: 28.21 },
  { code: "LV", latMin: 55.67, latMax: 57.97, lngMin: 20.97, lngMax: 28.24 },
  { code: "LT", latMin: 53.90, latMax: 56.45, lngMin: 20.94, lngMax: 26.84 },
  // Grands pays (en dernier pour ne pas écraser les petits voisins)
  { code: "CZ", latMin: 48.55, latMax: 51.06, lngMin: 12.09, lngMax: 18.86 },
  { code: "PL", latMin: 49.00, latMax: 54.84, lngMin: 14.12, lngMax: 24.15 },
  { code: "ES", latMin: 35.17, latMax: 43.79, lngMin: -9.30, lngMax: 4.59 },
  { code: "IT", latMin: 35.49, latMax: 47.09, lngMin: 6.63, lngMax: 18.52 },
  { code: "DE", latMin: 47.27, latMax: 55.06, lngMin: 5.87, lngMax: 15.04 },
  { code: "GB", latMin: 49.88, latMax: 58.64, lngMin: -7.57, lngMax: 1.77 },
  { code: "SE", latMin: 55.34, latMax: 69.06, lngMin: 11.12, lngMax: 24.16 },
  { code: "FI", latMin: 59.80, latMax: 70.09, lngMin: 19.32, lngMax: 31.59 },
  { code: "NO", latMin: 57.96, latMax: 71.19, lngMin: 4.45, lngMax: 31.22 },
  { code: "FR", latMin: 41.33, latMax: 51.12, lngMin: -5.14, lngMax: 9.56 },
];

/** Retourne le code pays (ex: "BE", "FR") depuis des coordonnées GPS, ou null si inconnu. */
export function detectCountryFromLatLng(lat, lng) {
  for (const b of COUNTRY_BOUNDS) {
    if (lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax) {
      return b.code;
    }
  }
  return null;
}

// Taux kilométriques recommandés par pays (€/km, véhicule léger)
export const KM_RATES = {
  AT: 0.42,
  BE: 0.42,
  BG: 0.20,
  CH: 0.70,
  CY: 0.25,
  CZ: 0.25,
  DE: 0.30,
  DK: 0.52,
  EE: 0.30,
  ES: 0.26,
  FI: 0.44,
  FR: 0.42,
  GB: 0.45,
  GR: 0.25,
  HR: 0.25,
  HU: 0.18,
  IE: 0.39,
  IT: 0.25,
  LT: 0.25,
  LU: 0.39,
  LV: 0.25,
  MT: 0.25,
  NL: 0.23,
  NO: 0.46,
  PL: 0.25,
  PT: 0.36,
  RO: 0.20,
  SE: 0.25,
  SI: 0.37,
  SK: 0.25,
};

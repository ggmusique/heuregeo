/**
 * useBilanWeather.js — Récupération météo historique pour les bilans.
 *
 * Extrait de useBilan.js : isole la logique d'appel à l'API Open-Meteo
 * et l'enrichissement des missions avec les données météo.
 *
 * La résolution de lieu utilise le utilitaire partagé lieuUtils.
 */

import { resolveLieu } from "../../utils/lieuUtils";

/**
 * Appelle l'API Open-Meteo Archive pour une date et des coordonnées données.
 * @param {string} dateIso - Date au format YYYY-MM-DD
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{tempMax: number, tempMin: number, icon: string, desc: string}|null>}
 */
export const fetchHistoricalWeather = async (
  dateIso,
  lat = 50.63,
  lon = 5.58
) => {
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateIso}&end_date=${dateIso}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur API météo");
    const data = await res.json();
    if (data.daily && data.daily.time.length > 0) {
      const code = data.daily.weathercode[0];
      let icon = "01d";
      let desc = "Ensoleillé";
      if (code >= 61 && code <= 67) {
        icon = "09d";
        desc = "Pluie";
      } else if (code >= 71 && code <= 77) {
        icon = "13d";
        desc = "Neige";
      } else if (code >= 80 && code <= 86) {
        icon = "09d";
        desc = "Averses";
      } else if (code >= 95) {
        icon = "11d";
        desc = "Orage";
      } else if (code >= 2 && code <= 3) {
        icon = "02d";
        desc = "Nuageux";
      }
      return {
        tempMax: Math.round(data.daily.temperature_2m_max[0]),
        tempMin: Math.round(data.daily.temperature_2m_min[0]),
        icon,
        desc,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Enrichit une liste de missions avec les données météo.
 * Ne fonctionne que pour les bilans hebdomadaires.
 *
 * @param {object} params
 * @param {Array} params.missions - Missions filtrées pour la période
 * @param {Array} params.lieux - Liste des lieux
 * @param {object|null} params.domicileLatLng - Coordonnées du domicile {lat, lng}
 * @returns {Promise<Array>} Missions enrichies avec la propriété `weather`
 */
export const enrichMissionsWithWeather = async ({
  missions,
  lieux,
  domicileLatLng,
}) => {
  if (!missions || missions.length === 0) return missions;

  const uniqueDates = [...new Set(missions.map((m) => m.date_iso))];
  const weatherCache = {};

  await Promise.all(
    uniqueDates.map(async (date) => {
      if (!weatherCache[date]) {
        const missionDuJour = missions.find((m) => m.date_iso === date);
        const lieu = resolveLieu(lieux, missionDuJour);
        const latLieu = Number(lieu?.latitude);
        const lngLieu = Number(lieu?.longitude);
        const weatherLat =
          Number.isFinite(latLieu) && Number.isFinite(lngLieu)
            ? latLieu
            : domicileLatLng?.lat ?? 50.63;
        const weatherLon =
          Number.isFinite(latLieu) && Number.isFinite(lngLieu)
            ? lngLieu
            : domicileLatLng?.lng ?? 5.58;
        weatherCache[date] = await fetchHistoricalWeather(
          date,
          weatherLat,
          weatherLon
        );
      }
    })
  );

  return missions.map((m) => ({
    ...m,
    weather: weatherCache[m.date_iso],
  }));
};

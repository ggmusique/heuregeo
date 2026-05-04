import { fetchHistoricalWeather } from "../services/weatherService";
import type { Mission, Lieu } from "../types/entities";
import type { MissionWithWeather, WeatherData } from "../types/bilan";

// ─── Fonction pure ────────────────────────────────────────────────────────────

/**
 * Enrichit une liste de missions avec les données météo historiques.
 * Pour chaque date unique, interroge fetchHistoricalWeather en utilisant
 * les coordonnées du lieu de mission (ou du domicile par défaut).
 */
export async function enrichWithWeather(
  missions: Mission[],
  lieux: Lieu[],
  domicileLatLng: { lat: number; lng: number } | null
): Promise<MissionWithWeather[]> {
  if (missions.length === 0) return missions as MissionWithWeather[];

  const uniqueDates = [...new Set(missions.map((m) => m.date_iso))];
  const weatherCache: Record<string, WeatherData | null> = {};

  await Promise.all(
    uniqueDates.map(async (date) => {
      if (!date || weatherCache[date]) return;
      const missionDuJour = missions.find((m) => m.date_iso === date);
      const lieuById = missionDuJour && lieux.find((l) => l.id === missionDuJour.lieu_id);
      const lieuByName =
        !lieuById && missionDuJour?.lieu
          ? lieux.find(
              (l) =>
                l.nom?.toLowerCase().trim() === missionDuJour.lieu?.toLowerCase().trim()
            )
          : null;
      const lieu = lieuById || lieuByName;
      const latLieu = Number(lieu?.latitude);
      const lngLieu = Number(lieu?.longitude);
      const weatherLat =
        Number.isFinite(latLieu) && Number.isFinite(lngLieu)
          ? latLieu
          : (domicileLatLng?.lat ?? 50.63);
      const weatherLon =
        Number.isFinite(latLieu) && Number.isFinite(lngLieu)
          ? lngLieu
          : (domicileLatLng?.lng ?? 5.58);
      weatherCache[date] = await fetchHistoricalWeather(date, weatherLat, weatherLon);
    })
  );

  return missions.map((m) => ({
    ...m,
    weather: m.date_iso ? (weatherCache[m.date_iso] ?? undefined) : undefined,
  }));
}

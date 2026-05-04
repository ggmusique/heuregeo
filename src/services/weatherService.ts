import type { WeatherData } from "../types/bilan.ts";
export { mapWeatherCode } from "../utils/weatherCode";
import { mapWeatherCode } from "../utils/weatherCode";

const weatherCache = new Map<string, WeatherData | null>();

export async function fetchHistoricalWeather(dateIso: string, lat = 50.63, lon = 5.58): Promise<WeatherData | null> {
  const key = `${dateIso}:${lat}:${lon}`;
  if (weatherCache.has(key)) return weatherCache.get(key) ?? null;

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateIso}&end_date=${dateIso}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur API météo");

    const data = await res.json() as {
      daily?: {
        time: string[];
        weathercode: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    };
    if (!data.daily || data.daily.time.length === 0) return null;

    const code = data.daily.weathercode[0];
    const { icon, desc } = mapWeatherCode(code);
    const weather: WeatherData = {
      tempMax: Math.round(data.daily.temperature_2m_max[0]),
      tempMin: Math.round(data.daily.temperature_2m_min[0]),
      icon,
      desc,
    };
    weatherCache.set(key, weather);
    return weather;
  } catch {
    return null;
  }
}

export function clearWeatherCache() {
  weatherCache.clear();
}

import type { WeatherData } from "../types/bilan.ts";

const weatherCache = new Map<string, WeatherData | null>();

export function mapWeatherCode(code: number): { icon: string; desc: string } {
  if (code >= 61 && code <= 67) return { icon: "09d", desc: "Pluie" };
  if (code >= 71 && code <= 77) return { icon: "13d", desc: "Neige" };
  if (code >= 80 && code <= 86) return { icon: "09d", desc: "Averses" };
  if (code >= 95) return { icon: "11d", desc: "Orage" };
  if (code >= 2 && code <= 3) return { icon: "02d", desc: "Nuageux" };
  return { icon: "01d", desc: "Ensoleillé" };
}

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

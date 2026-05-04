import { useState, useEffect } from "react";
import { mapWeatherCode } from "../utils/weatherCode";

export interface WeatherState {
  temp: number;
  icon: string;
  desc: string;
}

export function useWeather(dateMission: string): {
  weather: WeatherState | null;
  weatherCity: string;
  loading: boolean;
} {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherCity, setWeatherCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateMission) return;
    let alive = true;
    setLoading(true);

    const loadWeatherAndCity = async () => {
      if (!navigator.geolocation) {
        if (!alive) return;
        setWeatherCity("Géolocalisation non supportée");
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`
            );
            if (!weatherRes.ok) throw new Error("Météo HTTP error");
            const weatherData = await weatherRes.json() as {
              current?: { weathercode: number; temperature_2m: number };
            };
            if (!alive) return;
            if (weatherData?.current) {
              const code = weatherData.current.weathercode;
              const { icon, desc } = mapWeatherCode(code);
              setWeather({ temp: Math.round(weatherData.current.temperature_2m), icon, desc });
            } else {
              setWeather(null);
            }
          } catch {
            if (!alive) return;
            setWeather(null);
          }
          try {
            const cityRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
            );
            if (!cityRes.ok) throw new Error("Ville HTTP error");
            const cityData = await cityRes.json() as {
              address?: {
                city?: string;
                town?: string;
                village?: string;
                municipality?: string;
              };
            };
            if (!alive) return;
            const city =
              cityData?.address?.city ||
              cityData?.address?.town ||
              cityData?.address?.village ||
              cityData?.address?.municipality ||
              "Position actuelle";
            setWeatherCity(city);
          } catch {
            if (!alive) return;
            setWeatherCity("Position actuelle");
          }
          if (alive) setLoading(false);
        },
        () => {
          if (!alive) return;
          setWeatherCity("Localisation indisponible");
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    loadWeatherAndCity();
    return () => { alive = false; };
  }, [dateMission]);

  return { weather, weatherCity, loading };
}

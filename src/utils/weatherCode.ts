export function mapWeatherCode(code: number): { icon: string; desc: string } {
  if (code >= 61 && code <= 67) return { icon: "09d", desc: "Pluie" };
  if (code >= 71 && code <= 77) return { icon: "13d", desc: "Neige" };
  if (code >= 80 && code <= 86) return { icon: "09d", desc: "Averses" };
  if (code >= 95) return { icon: "11d", desc: "Orage" };
  if (code >= 2 && code <= 3) return { icon: "02d", desc: "Nuageux" };
  return { icon: "01d", desc: "Ensoleillé" };
}

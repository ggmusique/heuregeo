import React from "react";

interface WeatherIconProps {
  code: string;
  className?: string;
}

/**
 * Icônes météo SVG inline basées sur les codes OpenWeatherMap.
 * Remplace les images externes openweathermap.org/img/wn/*.
 * Codes supportés : 01d (soleil), 02d (nuageux), 09d (pluie), 11d (orage), 13d (neige).
 */
export function WeatherIcon({ code, className = "w-8 h-8" }: WeatherIconProps) {
  // Soleil
  if (code === "01d") return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="4.5" stroke="#FCD34D" strokeWidth="1.8" fill="#FCD34D" fillOpacity="0.25" />
      <line x1="12"   y1="2"    x2="12"   y2="4.5"  stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12"   y1="19.5" x2="12"   y2="22"   stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2"    y1="12"   x2="4.5"  y2="12"   stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.5" y1="12"   x2="22"   y2="12"   stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4.93"  y1="4.93"  x2="6.64"  y2="6.64"  stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17.36" y1="17.36" x2="19.07" y2="19.07" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.07" y1="4.93"  x2="17.36" y2="6.64"  stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6.64"  y1="17.36" x2="4.93"  y2="19.07" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  // Nuageux (soleil partiellement couvert)
  if (code === "02d") return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="8" r="3" stroke="#FCD34D" strokeWidth="1.5" fill="#FCD34D" fillOpacity="0.2" />
      <line x1="8"    y1="3"    x2="8"    y2="4.5"  stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3"    y1="8"    x2="4.5"  y2="8"    stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.93" y1="4.93" x2="5.87" y2="5.87" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.07" y1="4.93" x2="10.13" y2="5.87" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 17H17a4 4 0 000-8 4 4 0 00-7.5 2A3 3 0 007 17z" stroke="#93C5FD" strokeWidth="1.6" fill="#93C5FD" fillOpacity="0.15" strokeLinejoin="round" />
    </svg>
  );

  // Pluie / Averses
  if (code === "09d") return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 16H17a4 4 0 000-8 4 4 0 00-7.5 2A3 3 0 005 16z" stroke="#60A5FA" strokeWidth="1.6" fill="#60A5FA" fillOpacity="0.15" strokeLinejoin="round" />
      <line x1="8"  y1="18" x2="7"  y2="21" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="11" y2="21" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="18" x2="15" y2="21" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  // Orage
  if (code === "11d") return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 15H17a4 4 0 000-8 4 4 0 00-7.5 2A3 3 0 005 15z" stroke="#A78BFA" strokeWidth="1.6" fill="#A78BFA" fillOpacity="0.15" strokeLinejoin="round" />
      <polyline points="13,15 10,20 13,20 10,24" stroke="#FCD34D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  // Neige
  if (code === "13d") return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 15H17a4 4 0 000-8 4 4 0 00-7.5 2A3 3 0 005 15z" stroke="#BAE6FD" strokeWidth="1.6" fill="#BAE6FD" fillOpacity="0.15" strokeLinejoin="round" />
      <line x1="8"     y1="18" x2="8"     y2="22" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.27"  y1="19" x2="9.73"  y2="21" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.73"  y1="19" x2="6.27"  y2="21" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16"    y1="18" x2="16"    y2="22" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.27" y1="19" x2="17.73" y2="21" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17.73" y1="19" x2="14.27" y2="21" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return <span className="text-white/30 text-xs flex items-center justify-center w-8 h-8">?</span>;
}

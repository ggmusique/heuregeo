import React, { useRef, useMemo, useCallback } from "react";
import { getDateParts } from "../../utils/dateUtils";

interface DateSelectorProps {
  dateMission: string;
  setDateMission: (v: string) => void;
  isIOS?: boolean;
}

/**
 * DateSelector
 * ✅ Composant UI qui affiche une date en "carte" stylée
 * ✅ Au clic, ouvre le picker natif (<input type="date">) mais sans le montrer
 */
export const DateSelector = React.memo(
  ({ dateMission, setDateMission, isIOS }: DateSelectorProps) => {
    // ✅ Référence vers l'input date caché (pour pouvoir le focus/click programmatiquement)
    const dateInputRef = useRef<HTMLInputElement>(null);

    // ✅ On transforme "YYYY-MM-DD" en { day, month, year } pour l'affichage
    // useMemo = recalcul seulement quand dateMission change (optimisation)
    const { day, month, year } = useMemo(
      () => getDateParts(dateMission),
      [dateMission]
    );

    /**
     * handleCalendarClick
     * ✅ Quand on clique sur la carte, on ouvre le sélecteur de date natif
     * - showPicker() (Chrome récent) si dispo
     * - sinon .click() en fallback
     */
    const handleCalendarClick = useCallback(() => {
      if (dateInputRef.current) {
        dateInputRef.current.focus();

        // ✅ showPicker: plus "propre" sur certains navigateurs
        if (typeof (dateInputRef.current as unknown as { showPicker?: () => void }).showPicker === "function") {
          try {
            (dateInputRef.current as unknown as { showPicker: () => void }).showPicker();
          } catch (e) {
            // ✅ si showPicker échoue (certaines plateformes), fallback click
            dateInputRef.current.click();
          }
        } else {
          // ✅ fallback général
          dateInputRef.current.click();
        }
      }
    }, []);

    return (
      // ✅ Container cliquable (toute la carte ouvre le calendrier)
      <div
        onClick={handleCalendarClick}
        className="relative active:scale-[0.98] transition-transform cursor-pointer w-full"
      >
        {/* ✅ Carte visuelle (fond gradient + style) */}
        <div
          className={`
            flex items-center justify-between
            bg-gradient-to-r from-indigo-700/80 to-purple-800/80
            backdrop-blur-md rounded-xl shadow-[0_8px_25px_color-mix(in_srgb,var(--color-accent-violet)_35%,transparent)]
            border border-indigo-400/30 overflow-hidden
            h-20 px-8
          `}
        >
          {/* ✅ Couche de fond sombre pour rendre le texte plus lisible */}
          <div className="absolute inset-0 bg-black/20" />

          {/* ✅ Bloc gauche: affichage du mois + jour + année */}
          <div className="flex flex-col items-start z-10">
            <span className="text-[10px] font-black text-indigo-200/90 uppercase tracking-wider mb-0.5 drop-shadow">
              {month}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-xl">
                {day}
              </span>
              <span className="text-[10px] font-bold text-white/70">
                {year}
              </span>
            </div>
          </div>

          {/* ✅ Bloc droite: icône calendrier (juste décoratif) */}
          <div className="z-10 pointer-events-none">
            <svg
              className="w-6 h-6 text-cyan-300 opacity-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

        
          <input
            ref={dateInputRef}
            type="date"
            value={dateMission}
            onChange={(e) => setDateMission(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
          />
        </div>

        {/* ✅ Petit texte en dessous de la carte */}
        <div className="mt-1 text-[9px] font-black uppercase text-indigo-400/70 text-center tracking-[0.12em] opacity-90 drop-shadow">
          Changer Date
        </div>
      </div>
    );
  }
);

DateSelector.displayName = "DateSelector";

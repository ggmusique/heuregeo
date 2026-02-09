import React, { useMemo } from "react";
import { getDateParts } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";

/**
 * Carte mission avec boutons d'action - Multi-Patrons
 */
export const MissionCard = React.memo(({
  mission,
  onEdit,
  onDelete,
  patronNom = null, // NOUVEAU
  patronColor = null, // NOUVEAU
}) => {
  const { day, month } = useMemo(
    () => getDateParts(mission.date_iso),
    [mission.date_iso]
  );

  return (
    <div className="relative p-5 bg-gradient-to-br from-[#1a0f2e]/80 to-[#0f0b1a]/80 backdrop-blur-xl rounded-[35px] border border-indigo-500/30 shadow-[0_15px_40px_rgba(79,70,229,0.3)] text-white flex items-center gap-4 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-transparent to-indigo-900/10 pointer-events-none" />
      
      <div className="flex flex-col items-center justify-center min-w-[65px] h-[65px] bg-gradient-to-br from-indigo-600/40 to-purple-700/40 rounded-2xl border border-indigo-400/30 backdrop-blur-md">
        <span className="text-[11px] font-black text-indigo-200 leading-none mb-1 drop-shadow">
          {month.substring(0, 3)}
        </span>
        <span className="text-2xl font-black drop-shadow-lg">{day}</span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <p className="font-black uppercase text-[14px] text-white truncate mb-0.5 drop-shadow">
          {mission.client}
        </p>
        <p className="text-[11px] opacity-80 uppercase font-bold tracking-tight drop-shadow-sm">
          {formatHeures(mission.duree || 0)} • {mission.debut}-{mission.fin}
        </p>
        
        {/* NOUVEAU : Affichage du patron avec pastille couleur */}
        {patronNom && (
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: patronColor || "#8b5cf6" }}
            />
            <span className="text-[10px] opacity-60 uppercase tracking-wide font-bold">
              {patronNom}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-[16px] font-black text-green-400 drop-shadow-lg">
          {formatEuro(mission.montant)}
        </span>
        <div className="flex flex-col gap-3">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(mission);
            }}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl active:bg-indigo-600/70 active:scale-110 transition-all shadow-lg cursor-pointer"
          >
            ✏️
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(mission.id);
            }}
            className="w-11 h-11 rounded-full bg-red-600/30 backdrop-blur-md border border-red-500/40 flex items-center justify-center text-xl active:bg-red-700/70 active:scale-110 transition-all shadow-lg cursor-pointer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
});

MissionCard.displayName = "MissionCard";
import React, { useMemo, useCallback } from "react";
import { getDateParts } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";

/**
 * ✅ Carte mission avec actions - Multi-Patrons
 * + ✅ Badge "⏱ pause" si pause > 0
 * + ✅ Texte heures affiche la pause
 */
export const MissionCard = React.memo(
  ({ mission, onEdit, onDelete, patronNom = null, patronColor = null }) => {
    if (!mission) return null;

    const dateIso = mission?.date_iso || "";
    const { day, month } = useMemo(() => getDateParts(dateIso), [dateIso]);

    const clientLabel = (mission?.client || "Client").toString();
    const debut = mission?.debut || "--:--";
    const fin = mission?.fin || "--:--";
    const duree = Number(mission?.duree) || 0;
    const montant = Number(mission?.montant) || 0;

    // ✅ Pause (minutes)
    const pauseMin = Number(mission?.pause) || 0;
    const hasPause = pauseMin > 0;

    const handleEdit = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit?.(mission);
      },
      [onEdit, mission]
    );

    const handleDelete = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(mission?.id);
      },
      [onDelete, mission]
    );

    const monthShort = (month || "JAN").substring(0, 3);
    const safePatronColor = patronColor || "#8b5cf6";

    return (
      <div className="relative p-5 bg-gradient-to-br from-[#1a0f2e]/80 to-[#0f0b1a]/80 backdrop-blur-xl rounded-[35px] border border-indigo-500/30 shadow-[0_15px_40px_rgba(79,70,229,0.3)] text-white flex items-center gap-4 mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-transparent to-indigo-900/10 pointer-events-none" />

        {/* Date */}
        <div className="flex flex-col items-center justify-center min-w-[65px] h-[65px] bg-gradient-to-br from-indigo-600/40 to-purple-700/40 rounded-2xl border border-indigo-400/30 backdrop-blur-md">
          <span className="text-[11px] font-black text-indigo-200 leading-none mb-1 drop-shadow">
            {monthShort}
          </span>
          <span className="text-2xl font-black drop-shadow-lg">{day}</span>
        </div>

        {/* Infos */}
        <div className="flex-1 overflow-hidden">
          <p className="font-black uppercase text-[14px] text-white truncate mb-0.5 drop-shadow">
            {clientLabel}
          </p>

          {/* ✅ Ligne heures + badge pause */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] opacity-80 uppercase font-bold tracking-tight drop-shadow-sm">
              {formatHeures(duree)}
              {hasPause ? ` (pause ${pauseMin} min)` : ""} • {debut}-{fin}
            </p>

            {hasPause && (
              <span className="px-2 py-1 rounded-full bg-amber-600/20 border border-amber-500/30 text-[9px] font-black uppercase text-amber-300 tracking-wider">
                ⏱ pause
              </span>
            )}
          </div>

          {/* Patron */}
          {patronNom && (
            <div
              className="flex items-center gap-2 mt-2"
              title={`Patron: ${patronNom}`}
            >
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: safePatronColor }}
              />
              <span className="text-[10px] opacity-60 uppercase tracking-wide font-bold">
                {patronNom}
              </span>
            </div>
          )}
        </div>

        {/* Montant + actions */}
        <div className="flex items-center gap-4">
          <span className="text-[16px] font-black text-green-400 drop-shadow-lg">
            {formatEuro(montant)}
          </span>

          {(onEdit || onDelete) && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onPointerDown={handleEdit}
              onClick={handleEdit}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl active:bg-indigo-600/70 active:scale-110 transition-all shadow-lg cursor-pointer"
              aria-label="Modifier mission"
              title="Modifier"
            >
              ✏️
            </button>

            <button
              type="button"
              onPointerDown={handleDelete}
              onClick={handleDelete}
              className="w-11 h-11 rounded-full bg-red-600/30 backdrop-blur-md border border-red-500/40 flex items-center justify-center text-xl active:bg-red-700/70 active:scale-110 transition-all shadow-lg cursor-pointer"
              aria-label="Supprimer mission"
              title="Supprimer"
            >
              🗑️
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }
);

MissionCard.displayName = "MissionCard";

import React, { useMemo } from "react";
import { formatEuro, formatHeures, formatDateFR } from "../utils/formatters";
import { getWeekNumber } from "../utils/dateUtils";
import { exportToExcel, exportToCSV } from "../utils/exportUtils";
import { exportToPDFPro } from "../utils/exportPDF_Pro";
import { MissionCard } from "../components/mission/MissionCard";
import { WeekPicker } from "../components/common/bilan/WeekPicker";

/**
 * ✅ BilanTab
 * Onglet pour afficher et exporter les bilans
 */
export const BilanTab = ({
  // État bilan
  bilan,
  bilanPatronId,
  currentWeek,
  missionsThisWeek,
  darkMode,
  
  // Données
  patrons,
  getPatronNom,
  getPatronColor,
  
  // Handlers
  onMarquerCommePaye,
  onFraisEdit,
  onFraisDelete,
  onMissionEdit,      // ← AJOUTE CETTE LIGNE
  onMissionDelete,    // ← AJOUTE CETTE LIGNE
}) => {
  // ✅ Memoization des missions triées
  const sortedBilanMissions = useMemo(() => {
    if (!bilan.bilanContent?.filteredData) return [];
    return [...bilan.bilanContent.filteredData].sort(
      (a, b) => new Date(a.date_iso) - new Date(b.date_iso)
    );
  }, [bilan.bilanContent?.filteredData]);

  // ✅ Vue avant le bilan (bouton + semaine en cours)
  if (!bilan.showBilan) {
    return (
      <div className="animate-in slide-in-from-right duration-400">
        <div className="mb-12 space-y-4">
          <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center">
            Rapports & Bilans
          </p>
          <button
            onClick={() => {
              bilan.setShowBilan(false);
              bilan.setShowPeriodModal(true);
            }}
            className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl font-black text-white text-[14px] uppercase shadow-xl active:scale-95 transition-all"
          >
            Rapport bilan
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em]">
            Semaine en cours (S{currentWeek})
          </p>

          {missionsThisWeek.length === 0 ? (
            <p className="text-center text-[13px] opacity-60 py-8">
              Aucune mission cette semaine...
            </p>
          ) : (
            [...missionsThisWeek]
              .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso))
              .map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  onEdit={onMissionEdit}
                  onDelete={onMissionDelete}
                  patronNom={getPatronNom(m.patron_id)}
                  patronColor={getPatronColor(m.patron_id)}
                />
              ))
          )}
        </div>
      </div>
    );
  }

  // ✅ Vue DU bilan (détails + exports)
  return (
    <div className="animate-in fade-in duration-500">
      <button
        onClick={() => bilan.setShowBilan(false)}
        className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase opacity-50"
      >
        ← Retour
      </button>

      {/* HEADER BILAN */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-8 rounded-[45px] shadow-2xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em] mb-1">
              {bilan.bilanContent.titre}
            </p>
            <h2 className="text-4xl font-black text-white italic">BILAN</h2>
          </div>
          <WeekPicker
            value={bilan.bilanPeriodValue}
            weeks={bilan.availablePeriods}
            onChange={bilan.handleWeekChange}
            onPrevious={bilan.gotoPreviousWeek}
            onNext={bilan.gotoNextWeek}
            hasPrevious={bilan.hasPreviousWeek}
            hasNext={bilan.hasNextWeek}
          />
        </div>

        <p className="text-center text-sm opacity-80 mb-4">
          Pour : {bilan.bilanContent.selectedPatronNom}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4 rounded-3xl">
            <p className="text-[9px] font-black text-white/50 uppercase mb-1">
              Heures
            </p>
            <p className="text-xl font-black text-white">
              {formatHeures(bilan.bilanContent.totalH)}
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-3xl">
            <p className="text-[9px] font-black text-white/50 uppercase mb-1">
              Total Brut
            </p>
            <p className="text-xl font-black text-green-300">
              {formatEuro(bilan.bilanContent.totalE)}
            </p>
          </div>

          {bilan.bilanContent.impayePrecedent > 0 && (
            <div className="col-span-2 bg-white/10 p-4 rounded-3xl flex justify-between items-center">
              <p className="text-[9px] font-black text-white/50 uppercase">
                Impayé précédent
              </p>
              <p className="text-xl font-black text-orange-300">
                +{formatEuro(bilan.bilanContent.impayePrecedent)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SUIVI FRAIS / ACOMPTES */}
      {bilan.bilanPeriodType === "semaine" &&
        (bilan.bilanContent.fraisDivers.length > 0 ||
          bilan.bilanContent.acomptesDansPeriode > 0 ||
          bilan.bilanContent.soldeAcomptesApres > 0) && (
          <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-[35px] border border-indigo-500/30 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">
              {bilan.bilanContent.fraisDivers.length > 0
                ? "Frais & Acomptes"
                : "Suivi des acomptes & impayés"}
            </p>

            {bilan.bilanContent.fraisDivers.length > 0 && (
              <>
                {[...bilan.bilanContent.fraisDivers]
                  .sort((a, b) => new Date(a.date_frais) - new Date(b.date_frais))
                  .map((f) => (
                    <div
                      key={f.id}
                      className="flex justify-between items-center mb-3 gap-3"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-bold opacity-70 uppercase">
                          {f.description} – {formatDateFR(f.date_frais)}
                        </span>
                      </div>
                      <span className="text-sm font-black text-amber-500">
                        +{formatEuro(f.montant)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onFraisEdit(f)}
                          className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30 active:scale-90 transition-all"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onFraisDelete(f)}
                          className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center border border-red-500/30 active:scale-90 transition-all"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}

            <div className="mt-6 bg-black/30 rounded-3xl p-5 border border-cyan-500/20">
              <p className="text-[9px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">
                Suivi du solde acompte & impayés
              </p>

              <div className="space-y-3">
                {bilan.bilanContent.impayePrecedent !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Impayé précédent :</span>
                    <span className="font-bold text-orange-400">
                      +{formatEuro(bilan.bilanContent.impayePrecedent)}
                    </span>
                  </div>
                )}

                {bilan.bilanContent.soldeAcomptesAvant !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Solde avant période :</span>
                    <span className="font-bold text-white">
                      {formatEuro(bilan.bilanContent.soldeAcomptesAvant)}
                    </span>
                  </div>
                )}

                {bilan.bilanContent.acomptesDansPeriode !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Reçus cette période :</span>
                    <span className="font-bold text-cyan-300">
                      +{formatEuro(bilan.bilanContent.acomptesDansPeriode)}
                    </span>
                  </div>
                )}

                {bilan.bilanContent.totalAcomptes !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Consommé :</span>
                    <span className="font-bold text-cyan-300">
                      -{formatEuro(bilan.bilanContent.totalAcomptes)}
                    </span>
                  </div>
                )}

                {bilan.bilanContent.soldeAcomptesApres !== 0 && (
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-white/80">
                      Solde restant à reporter :
                    </span>
                    <span className="text-xl font-black text-green-400">
                      {formatEuro(bilan.bilanContent.soldeAcomptesApres)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* PAIEMENT */}
      {bilan.bilanPeriodType === "semaine" &&
        (!bilan.bilanPaye ? (
          <div className="mb-8 mt-2 p-5 bg-gradient-to-r from-orange-600 to-red-700 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-black uppercase text-white/80">
                Reste à percevoir (Net)
              </span>
              <span className="text-2xl font-black text-white">
                {formatEuro(bilan.bilanContent.resteAPercevoir || 0)}
              </span>
            </div>

            <button
              onClick={onMarquerCommePaye}
              className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-black uppercase text-[11px] text-white tracking-wider transition-all active:scale-95 backdrop-blur-md border border-white/30"
            >
              💰 MARQUER COMME PAYÉ
            </button>
          </div>
        ) : (
          <div className="mb-8 mt-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 animate-pulse"></div>
            <div className="relative p-6 bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-2xl border-2 border-green-400">
              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <span className="text-4xl">✓</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-white/80 tracking-wider">
                    Statut du paiement
                  </p>
                  <p className="text-3xl font-black text-white uppercase tracking-tight">
                    PAYÉ
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* EXPORTS */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() =>
            exportToExcel(
              bilan.bilanContent,
              bilan.bilanPeriodType,
              bilan.bilanPeriodValue,
              bilan.bilanContent.titre,
              bilan.bilanContent.fraisDivers
            )
          }
          className="flex-1 min-w-[120px] py-4 bg-green-600/20 text-green-400 rounded-2xl font-black text-[10px] uppercase border border-green-500/30 active:scale-95 transition-all backdrop-blur-md"
        >
          Excel
        </button>

        <button
          onClick={() =>
            exportToPDFPro(
              bilan.bilanContent,
              bilan.bilanPeriodType,
              bilan.bilanPaye,
              bilan.bilanPeriodValue
            )
          }
          className="flex-1 min-w-[120px] py-4 bg-red-600/20 text-red-400 rounded-2xl font-black text-[10px] uppercase border border-red-500/30 active:scale-95 transition-all backdrop-blur-md"
        >
          PDF
        </button>

        <button
          onClick={() =>
            exportToCSV(
              bilan.bilanContent,
              bilan.bilanPeriodType,
              bilan.bilanPeriodValue,
              false
            )
          }
          className="flex-1 min-w-[120px] py-4 bg-blue-600/20 text-blue-400 rounded-2xl font-black text-[10px] uppercase border border-blue-500/30 active:scale-95 transition-all backdrop-blur-md"
        >
          CSV Missions
        </button>

        {bilan.bilanPeriodType === "semaine" &&
          bilan.bilanContent.fraisDivers.length > 0 && (
            <button
              onClick={() =>
                exportToCSV(
                  bilan.bilanContent,
                  bilan.bilanPeriodType,
                  bilan.bilanPeriodValue,
                  true
                )
              }
              className="flex-1 min-w-[140px] py-4 bg-cyan-600/20 text-cyan-300 rounded-2xl font-black text-[10px] uppercase border border-cyan-500/30 active:scale-95 transition-all backdrop-blur-md"
            >
              CSV + Frais
            </button>
          )}
      </div>

      {/* DÉTAIL MISSIONS OU REGROUPEMENT */}
      {bilan.bilanPeriodType === "semaine" ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2">
            Détail des missions
          </p>

          {sortedBilanMissions.map((m, i) => {
            const date = new Date(m.date_iso);
            const day = date.getDate().toString().padStart(2, "0");
            const monthShort = date
              .toLocaleString("fr-FR", { month: "short" })
              .toUpperCase();

            return (
              <div
                key={i}
                className={`p-5 rounded-[25px] backdrop-blur-md border border-white/10 ${
                  darkMode ? "bg-white/5" : "bg-black/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-[50px]">
                      <div className="text-[10px] font-black uppercase text-indigo-300/90">
                        {monthShort}
                      </div>
                      <div className="w-10 h-10 bg-indigo-700 rounded-md flex items-center justify-center shadow-md border border-indigo-600/30">
                        <span className="text-white font-black text-xl">
                          {day}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase text-white truncate">
                        {m.client}
                      </p>
                      <p className="text-[11px] opacity-70 truncate">
                        {m.debut} → {m.fin}
                        {m.pause > 0 && ` (${m.pause} min)`}
                      </p>
                      {m.lieu && (
                        <p className="text-[11px] opacity-60 mt-1 truncate">
                          {m.lieu}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-indigo-300">
                        {formatHeures(m.duree || 0)}
                      </p>
                      <p className="text-lg font-black text-green-400">
                        {formatEuro(m.montant)}
                      </p>
                    </div>

                    {m.weather ? (
                      <div className="flex items-center gap-2 min-w-[90px] justify-end">
                        <img
                          src={`https://openweathermap.org/img/wn/${m.weather.icon}@2x.png`}
                          alt={m.weather.desc}
                          className="w-8 h-8 drop-shadow-sm opacity-90"
                          onError={(e) =>
                            (e.target.src =
                              "https://openweathermap.org/img/wn/01d@2x.png")
                          }
                        />
                        <div className="text-right text-xs leading-tight">
                          <div className="font-medium">
                            {m.weather.tempMin}–{m.weather.tempMax}°
                          </div>
                          <div className="opacity-70 capitalize truncate max-w-[60px]">
                            {m.weather.desc}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs opacity-40 italic text-right">
                        ?
                      </div>
                    )}
                {/* ✅ BOUTONS EDIT/DELETE */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onMissionEdit && onMissionEdit(m)}
                        className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30 active:scale-90 transition-all"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onMissionDelete && onMissionDelete(m.id)}
                        className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center border border-red-500/30 active:scale-90 transition-all"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-[10px] font-black uppercase opacity-60 px-2 mb-4 tracking-widest">
            Regroupement
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bilan.bilanContent.groupedData.map((group, index) => (
              <div
                key={index}
                className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 shadow-lg"
              >
                <p className="font-black text-lg text-white mb-2">
                  {group.label}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Heures :</span>
                  <span className="font-bold text-indigo-300">
                    {formatHeures(group.h)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Montant :</span>
                  <span className="font-bold text-green-400">
                    {formatEuro(group.e)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useMemo } from "react";
import { formatEuro, formatHeures, formatDateFR } from "../utils/formatters";
import { getWeekNumber } from "../utils/dateUtils";
import { exportToExcel, exportToCSV } from "../utils/exportUtils";
import { exportToPDFPro } from "../utils/exportPDF_Pro";
import { MissionCard } from "../components/mission/MissionCard";
import { WeekPicker } from "../components/common/bilan/WeekPicker";

export const BilanTab = ({
  bilan,
  bilanPatronId,
  currentWeek,
  missionsThisWeek,
  darkMode,
  patrons,
  getPatronNom,
  getPatronColor,
  onMarquerCommePaye,
  onFraisEdit,
  onFraisDelete,
  onMissionEdit,
  onMissionDelete,
  profile,
  isViewer,
  canBilanMois = true,
  canBilanAnnee = true,
  canExportPDF = true,
  canExportExcel = true,
  canExportCSV = true,
  kmSettings = null,
  kmFraisThisWeek = null,
  domicileLatLng = null,
  onRecalculerFraisKm = null,
}) => {
  const exportBilanContent = useMemo(() => {
    if (kmSettings?.km_enable === true) return bilan.bilanContent;
    return {
      ...bilan.bilanContent,
      fraisKilometriques: { items: [], totalKm: 0, totalAmount: 0 },
    };
  }, [bilan.bilanContent, kmSettings?.km_enable]);

  const sortedBilanMissions = useMemo(() => {
    console.log("RESTE RAW", {
  showBilan: bilan.showBilan,
  periodType: bilan.bilanPeriodType,
  periodValue: bilan.bilanPeriodValue,
  resteAPercevoir: bilan?.bilanContent?.resteAPercevoir,
  resteCettePeriode: bilan?.bilanContent?.resteCettePeriode,
});
    if (!bilan.bilanContent?.filteredData) return [];
    return [...bilan.bilanContent.filteredData].sort(
      (a, b) => new Date(a.date_iso) - new Date(b.date_iso)
    );
  }, [bilan.bilanContent?.filteredData]);

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
            className="w-full py-6 bg-gradient-to-r from-[#C9A84C] to-[#A07830] rounded-3xl font-black text-white text-[14px] uppercase shadow-xl active:scale-95 transition-all"
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
                  onEdit={isViewer ? null : onMissionEdit}
                  onDelete={isViewer ? null : onMissionDelete}
                  patronNom={getPatronNom(m.patron_id)}
                  patronColor={getPatronColor(m.patron_id)}
                />
              ))
          )}

          {/* ── BLOC FRAIS KM – Semaine en cours ── */}
          {kmSettings?.km_enable === true && missionsThisWeek.length > 0 && (
            kmFraisThisWeek?.items?.length > 0 ? (
              <div className="mt-2 p-4 bg-[#0A1628]/60 rounded-[25px] border border-blue-600/20 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase text-blue-400/70 mb-3 tracking-[0.2em]">
                  🚗 Frais kilométriques
                </p>
                <div className="space-y-2 mb-3">
                  {kmFraisThisWeek.items.filter((item) => item.amount !== null).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-white/80 font-bold">{formatDateFR(item.date)}</span>
                        <span className="text-white/50 ml-2">{item.labelLieuOuClient}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-300/80 text-xs">{Math.round(item.kmTotal * 10) / 10} km</span>
                        <span className="font-bold text-blue-300 ml-2">{formatEuro(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                  {kmFraisThisWeek.items.filter((item) => item.amount === null).map((item, i) => (
                    <div key={`missing-${i}`} className="text-sm text-white/40 italic">
                      {formatDateFR(item.date)} — {item.labelLieuOuClient}
                    </div>
                  ))}
                </div>
                {kmFraisThisWeek.totalAmount > 0 && (
                  <div className="pt-2 border-t border-white/10 flex justify-between">
                    <span className="text-white/60 text-sm">{Math.round(kmFraisThisWeek.totalKm * 10) / 10} km total</span>
                    <span className="font-black text-blue-300">{formatEuro(kmFraisThisWeek.totalAmount)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 p-4 bg-[#0A1628]/40 rounded-[25px] border border-blue-600/10 text-sm text-white/40 italic">
                🚗 Frais kilométriques —{" "}
                {!domicileLatLng
                  ? "adresse domicile manquante ou non géocodée (vérifiez Paramètres → Km)"
                  : "coordonnées GPS manquantes pour les lieux de mission"}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <button
        onClick={() => bilan.setShowBilan(false)}
        className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase opacity-50"
      >
        ← Retour
      </button>

      {/* HEADER BILAN */}
      <div className="bg-gradient-to-br from-[#0A1628] to-[#020818] p-8 rounded-[45px] shadow-2xl mb-8 border border-yellow-600/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase text-yellow-500/70 tracking-[0.3em] mb-1">
              {bilan.bilanContent.titre}
            </p>
            <h2 className="text-4xl font-black text-white italic font-['Playfair_Display']">Bilan</h2>
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

        <p className="text-center text-sm text-white/70 mb-4">
          Pour : {bilan.bilanContent.selectedPatronNom}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0A1628]/80 p-4 rounded-2xl border border-yellow-600/20">
            <p className="text-[9px] font-black text-yellow-500/70 uppercase mb-1">Heures</p>
            <p className="text-xl font-black text-white">{formatHeures(bilan.bilanContent.totalH)}</p>
          </div>

          <div className="bg-[#0A1628]/80 p-4 rounded-2xl border border-yellow-600/20">
            <p className="text-[9px] font-black text-yellow-500/70 uppercase mb-1">Total Brut</p>
            <p className="text-xl font-black text-emerald-400">{formatEuro(bilan.bilanContent.totalE)}</p>
          </div>

          {bilan.bilanContent.impayePrecedent > 0 && (
            <div className="col-span-2 bg-[#0A1628]/80 p-4 rounded-2xl border border-orange-500/30 flex justify-between items-center">
              <p className="text-[9px] font-black text-orange-400/70 uppercase">⏳ Impayé précédent</p>
              <p className="text-xl font-black text-orange-400">
                +{formatEuro(bilan.bilanContent.impayePrecedent)}
              </p>
            </div>
          )}
        </div>
      </div>

      {bilan.bilanPeriodType === "semaine" && (
  <>
    {/* ── BLOC 1 : FRAIS ── affiché uniquement si frais */}
    {bilan.bilanContent.fraisDivers.length > 0 && (
      <div className="mb-4 p-6 bg-[#0A1628]/60 rounded-[35px] border border-yellow-600/20 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase text-yellow-500/70 mb-4 tracking-[0.2em]">
          Frais
        </p>
        {[...bilan.bilanContent.fraisDivers]
          .sort((a, b) => new Date(a.date_frais) - new Date(b.date_frais))
          .map((f) => (
            <div key={f.id} className="flex justify-between items-center mb-3 gap-3">
              <div className="flex-1">
                <span className="text-sm font-bold opacity-70 uppercase">
                  {f.description} – {formatDateFR(f.date_frais)}
                </span>
              </div>
              <span className="text-sm font-black text-amber-500">
                +{formatEuro(f.montant)}
              </span>
              <div className="flex gap-2">
                {!isViewer && (
                  <>
                    <button
                      onClick={() => onFraisEdit(f)}
                      className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/30 active:scale-90 transition-all"
                    >✏️</button>
                    <button
                      onClick={() => onFraisDelete(f)}
                      className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center border border-red-500/30 active:scale-90 transition-all"
                    >🗑️</button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>
    )}

    {/* ── BLOC FRAIS KM ── */}
    {kmSettings?.km_enable === true && bilan.bilanContent.fraisKilometriques?.items?.length > 0 && bilan.bilanPeriodType === "semaine" && (
      <div className="mb-4 p-6 bg-[#0A1628]/60 rounded-[35px] border border-blue-600/20 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase text-blue-400/70 mb-4 tracking-[0.2em]">
          🚗 Frais kilométriques
        </p>
        <div className="space-y-2 mb-4">
          {bilan.bilanContent.fraisKilometriques.items
            .filter((item) => item.amount !== null)
            .map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white/80 font-bold">{formatDateFR(item.date)}</span>
                  <span className="text-white/50 ml-2">{item.labelLieuOuClient}</span>
                </div>
                <div className="text-right">
                  <span className="text-blue-300/80 text-xs">{Math.round(item.kmTotal * 10) / 10} km</span>
                  <span className="font-bold text-blue-300 ml-2">{formatEuro(item.amount)}</span>
                </div>
              </div>
            ))}
          {bilan.bilanContent.fraisKilometriques.items
            .filter((item) => item.amount === null)
            .map((item, i) => (
              <div key={`missing-${i}`} className="text-sm text-white/40 italic">
                {formatDateFR(item.date)} — {item.labelLieuOuClient}
              </div>
            ))}
        </div>
        <div className="pt-3 border-t border-white/10 flex justify-between">
          <span className="text-white/60 text-sm">{Math.round(bilan.bilanContent.fraisKilometriques.totalKm * 10) / 10} km total</span>
          <span className="font-black text-blue-300">{formatEuro(bilan.bilanContent.fraisKilometriques.totalAmount)}</span>
        </div>
      </div>
    )}

    {/* ── BLOC FRAIS KM – fallback domicile manquant ── */}
    {kmSettings?.km_enable === true && bilan.bilanPeriodType === "semaine" &&
      !bilan.bilanContent.fraisKilometriques?.items?.length && (
      <div className="mb-4 p-4 bg-[#0A1628]/40 rounded-[25px] border border-blue-600/10 text-sm text-white/40 italic">
        🚗 Frais kilométriques —{" "}
        {!domicileLatLng
          ? "adresse domicile manquante ou non géocodée (vérifiez Paramètres → Km)"
          : "coordonnées GPS manquantes pour les lieux de mission"}
      </div>
    )}

{/* ── BLOC 2 : SUIVI SOLDE ACOMPTE & IMPAYÉS ── */}
{/* ✅ N'afficher QUE si quelque chose s'est passé CETTE semaine */}
{bilan.bilanPeriodType === "semaine" && (
  bilan.bilanContent.acomptesDansPeriode > 0 || 
  bilan.bilanContent.soldeAcomptesAvant > 0
) && (
  <div className="mb-8 p-6 bg-[#0A1628]/60 rounded-[35px] border border-yellow-600/20 backdrop-blur-md">
    <p className="text-[10px] font-black uppercase text-yellow-500/70 mb-4 tracking-[0.2em]">
      Suivi du solde acompte & impayés
    </p>
    <div className="space-y-3">

      {bilan.bilanContent.soldeAcomptesAvant > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-white/60">💳 Acompte disponible précédent :</span>
          <span className="font-bold text-cyan-300">
            {formatEuro(bilan.bilanContent.soldeAcomptesAvant)}
          </span>
        </div>
      )}

      {bilan.bilanContent.acomptesDansPeriode > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-white/60">📥 Reçus cette période :</span>
          <span className="font-bold text-cyan-300">
            +{formatEuro(bilan.bilanContent.acomptesDansPeriode)}
          </span>
        </div>
      )}

      {/* ✅ Afficher "Consommé" uniquement si un acompte de CETTE semaine a été utilisé */}
      {bilan.bilanContent.acomptesDansPeriode > 0 && bilan.bilanContent.totalAcomptes > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-white/60">✂️ Consommé cette période :</span>
          <span className="font-bold text-red-400">
            -{formatEuro(bilan.bilanContent.totalAcomptes)}
          </span>
        </div>
      )}

      {/* Solde restant - affiché uniquement si > 0 */}
      {bilan.bilanContent.soldeAcomptesApres > 0 && (
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
)}
  </>
)}

      {/* PAIEMENT */}
      {bilan.bilanPeriodType === "semaine" &&
        (!bilan.bilanPaye ? (
          <div className="mb-8 mt-2 p-5 bg-gradient-to-r from-[#7B1A1A] to-[#5C1010] rounded-2xl shadow-lg border border-red-700/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-black uppercase text-white/70">
                Reste à percevoir (Net)
              </span>
              <span className="text-3xl font-black text-orange-400">
                {formatEuro(
  (bilan.bilanContent.resteAPercevoir ?? bilan.bilanContent.resteCettePeriode) || 0
)}
              </span>
            </div>
            {!isViewer && (
              <button
                onClick={onMarquerCommePaye}
                className="w-full py-3 bg-[#8B2020] hover:bg-[#A02525] rounded-xl font-black uppercase text-[11px] text-white tracking-wider transition-all active:scale-95 border border-red-500/50"
              >
                💰 MARQUER COMME PAYÉ
              </button>
            )}
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
                  <p className="text-3xl font-black text-white uppercase tracking-tight">PAYÉ</p>
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* EXPORTS */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => canExportExcel && exportToExcel(
            exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue,
            exportBilanContent.titre, exportBilanContent.fraisDivers, profile
          )}
          disabled={!canExportExcel}
          title={!canExportExcel ? "Fonctionnalité Pro" : undefined}
          className={"flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all backdrop-blur-md " +
            (canExportExcel ? "bg-green-600/20 text-green-400 border-yellow-600/20" : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed")}
        >
          {canExportExcel ? "Excel" : "🔒 Excel"}
        </button>

        <button
          onClick={() => canExportPDF && exportToPDFPro(
            exportBilanContent, bilan.bilanPeriodType, bilan.bilanPaye,
            bilan.bilanPeriodValue, profile
          )}
          disabled={!canExportPDF}
          title={!canExportPDF ? "Fonctionnalité Pro" : undefined}
          className={"flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all backdrop-blur-md " +
            (canExportPDF ? "bg-red-600/20 text-red-400 border-yellow-600/20" : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed")}
        >
          {canExportPDF ? "PDF" : "🔒 PDF"}
        </button>

        <button
          onClick={() => canExportCSV && exportToCSV(
            exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue, false
          )}
          disabled={!canExportCSV}
          title={!canExportCSV ? "Fonctionnalité Pro" : undefined}
          className={"flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all backdrop-blur-md " +
            (canExportCSV ? "bg-blue-600/20 text-blue-400 border-yellow-600/20" : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed")}
        >
          {canExportCSV ? "CSV Missions" : "🔒 CSV Missions"}
        </button>

        {bilan.bilanPeriodType === "semaine" && bilan.bilanContent.fraisDivers.length > 0 && (
          <button
            onClick={() => canExportCSV && exportToCSV(
              exportBilanContent, bilan.bilanPeriodType, bilan.bilanPeriodValue, true
            )}
            disabled={!canExportCSV}
            title={!canExportCSV ? "Fonctionnalité Pro" : undefined}
            className={"flex-1 min-w-[140px] py-4 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all backdrop-blur-md " +
              (canExportCSV ? "bg-cyan-600/20 text-cyan-300 border-yellow-600/20" : "bg-white/5 text-white/20 border-white/10 cursor-not-allowed")}
          >
            {canExportCSV ? "CSV + Frais" : "🔒 CSV + Frais"}
          </button>
        )}
      </div>

      {/* RECALCUL KM */}
      {kmSettings?.km_enable === true && !isViewer && onRecalculerFraisKm && (
        <div className="mb-8">
          <button
            onClick={onRecalculerFraisKm}
            disabled={bilan.isRecalculatingKm}
            className={"w-full py-4 rounded-2xl font-black text-[11px] uppercase border active:scale-95 transition-all backdrop-blur-md " +
              (bilan.isRecalculatingKm
                ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                : "bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30")}
          >
            {bilan.isRecalculatingKm ? "⏳ Recalcul en cours…" : "🚗 Recalculer KM"}
          </button>
        </div>
      )}

      {/* DÉTAIL MISSIONS OU REGROUPEMENT */}
      {bilan.bilanPeriodType === "semaine" ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest px-2">
            Détail des missions
          </p>

          {sortedBilanMissions.map((m, i) => {
            const date = new Date(m.date_iso);
            const day = date.getDate().toString().padStart(2, "0");
            const monthShort = date.toLocaleString("fr-FR", { month: "short" }).toUpperCase();

            return (
              <div key={i} className="p-5 rounded-[25px] backdrop-blur-md border border-yellow-600/15 bg-[#0A1628]/60">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-[50px]">
                      <div className="text-[10px] font-black uppercase text-[#D4AF37]/90">{monthShort}</div>
                      <div className="w-10 h-10 bg-[#0A1628] rounded-md flex items-center justify-center shadow-md border border-yellow-600/30">
                        <span className="text-white font-black text-xl">{day}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase text-white truncate">{m.client}</p>
                      <p className="text-[11px] opacity-70 truncate">
                        {m.debut} → {m.fin}{m.pause > 0 && ` (${m.pause} min)`}
                      </p>
                      {m.lieu && (
                        <p className="text-[11px] opacity-60 mt-1 truncate">{m.lieu}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-yellow-400/80">{formatHeures(m.duree || 0)}</p>
                      <p className="text-lg font-black text-emerald-400">{formatEuro(m.montant)}</p>
                    </div>

                    {m.weather ? (
                      <div className="flex items-center gap-2 min-w-[90px] justify-end">
                        <img
                          src={`https://openweathermap.org/img/wn/${m.weather.icon}@2x.png`}
                          alt={m.weather.desc}
                          className="w-8 h-8 drop-shadow-sm opacity-90"
                          crossOrigin="anonymous"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <div className="text-right text-xs leading-tight">
                          <div className="font-medium">{m.weather.tempMin}–{m.weather.tempMax}°</div>
                          <div className="opacity-70 capitalize truncate max-w-[60px]">{m.weather.desc}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs opacity-40 italic text-right">?</div>
                    )}
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
              <div key={index} className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 shadow-lg">
                <p className="font-black text-lg text-white mb-2">{group.label}</p>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Heures :</span>
                  <span className="font-bold text-yellow-400/80">{formatHeures(group.h)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Montant :</span>
                  <span className="font-bold text-green-400">{formatEuro(group.e)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
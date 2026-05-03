import React, { useMemo, useState } from "react";
import { formatEuro, formatDateFR } from "../utils/formatters";
import { getWeekNumber } from "../utils/dateUtils";
import { useLabels } from "../contexts/LabelsContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { StatsCharts } from "../components/stats/StatsCharts";
import type { Patron, Mission } from "../types/entities";

interface Props {
  // État
  historique: any;
  historiquePatronId: string | null;
  historiqueTab: string;
  loadingHistorique: boolean;

  // Données
  patrons: Patron[];
  missions: Mission[];
  listeAcomptes: any[];

  // Handlers
  onPatronFilterChange: (patronId: string | null) => void;
  onTabChange: (tab: string) => void;
  onLoadHistorique: (patronId?: string | null) => void;

  // Viewer (can also come from PermissionsContext)
  isViewer?: boolean;
  viewerPatronId?: string | null;
}

/**
 * ✅ HistoriqueTab
 * Tableau de bord avec résumés et historique des bilans
 */
export const HistoriqueTab = ({
  // État
  historique,
  historiquePatronId,
  historiqueTab,
  loadingHistorique,

  // Données
  patrons,
  missions,
  listeAcomptes,

  // Handlers
  onPatronFilterChange,
  onTabChange,
  onLoadHistorique,

  // Viewer (can also come from PermissionsContext)
  isViewer: isViewerProp,
  viewerPatronId: viewerPatronIdProp,
}: Props) => {
  const { darkMode } = useDarkMode();
  const { isViewer: isViewerCtx, viewerPatronId: viewerPatronIdCtx } = usePermissions();
  const isViewer = isViewerProp !== undefined ? isViewerProp : isViewerCtx;
  const viewerPatronId = viewerPatronIdProp !== undefined ? viewerPatronIdProp : viewerPatronIdCtx;
  const L = useLabels();

  // When viewer, use their fixed patron_id for all filtering
  const effectivePatronId = isViewer ? viewerPatronId : historiquePatronId;

  // ── Statistiques (local toggle) ───────────────────────────────────────────
  const [showStats, setShowStats] = useState(false);

  // ── Filtres onglet Missions ───────────────────────────────────────────────
  const [mDateFrom, setMDateFrom] = useState("");   // "YYYY-MM"
  const [mDateTo,   setMDateTo]   = useState("");   // "YYYY-MM"
  const [mClient,   setMClient]   = useState("");
  const [mPatronId, setMPatronId] = useState("");

  // ── Clients uniques (pour le filtre missions) ─────────────────────────────
  const clientsUniques = useMemo(
    () => [...new Set(missions.map((m) => m.client).filter((c): c is string => c !== null))].sort(),
    [missions]
  );

  // ── Mois disponibles (pour les selects De/À) ──────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set(missions.map((m) => m.date_iso?.slice(0, 7)).filter((m): m is string => m != null));
    return [...months].sort();
  }, [missions]);

  const MONTH_NAMES = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const formatMonthLabel = (ym: string | undefined) => {
    if (!ym) return "";
    const [y, m] = ym.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  };

  // Build a set of week numbers from existing missions (to filter deleted-mission rows)
  const validWeekNums = useMemo(() => {
    const set = new Set();
    missions.forEach((m) => {
      if (!m.date_iso) return;
      if (effectivePatronId && m.patron_id !== effectivePatronId) return;
      set.add(getWeekNumber(new Date(m.date_iso)));
    });
    return set;
  }, [missions, effectivePatronId]);

  // Filter historique rows: exclude periods where all missions have been deleted
  const filteredImpayes = useMemo(
    () =>
      missions.length > 0
        ? (historique.impayes || []).filter((row: any) => {
            const wk = parseInt(row.periode_value, 10);
            return Number.isFinite(wk) && validWeekNums.has(wk);
          })
        : historique.impayes || [],
    [historique.impayes, validWeekNums, missions.length]
  );
  const filteredPayes = useMemo(
    () =>
      missions.length > 0
        ? (historique.payes || []).filter((row: any) => {
            const wk = parseInt(row.periode_value, 10);
            return Number.isFinite(wk) && validWeekNums.has(wk);
          })
        : historique.payes || [],
    [historique.payes, validWeekNums, missions.length]
  );

  // ── Missions filtrées (onglet Missions) ───────────────────────────────────
  const missionsFiltrees = useMemo(() => {
    return missions
      .filter((m) => {
        if (effectivePatronId && m.patron_id !== effectivePatronId) return false;
        if (mPatronId && m.patron_id !== mPatronId) return false;
        if (mClient && m.client !== mClient) return false;
        const month = m.date_iso?.slice(0, 7) ?? "";
        if (mDateFrom && month < mDateFrom) return false;
        if (mDateTo   && month > mDateTo)   return false;
        return true;
      })
      .sort((a, b) => {
        const d = (b.date_iso ?? "").localeCompare(a.date_iso ?? "");
        if (d !== 0) return d;
        return (b.debut ?? "").localeCompare(a.debut ?? "");
      });
  }, [missions, effectivePatronId, mPatronId, mClient, mDateFrom, mDateTo]);
  return (
    <div className="animate-in fade-in duration-500 space-y-4 pb-4">
      {/* ── SÉLECTEUR PATRON ── */}
      {!isViewer && (
        <div
          className={`p-4 rounded-[25px] border ${
            darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
          } backdrop-blur-md`}
        >
          <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-3">
            Filtre {L.patron}
          </p>
          <select
            value={historiquePatronId || ""}
            onChange={(e) => onPatronFilterChange(e.target.value || null)}
            className={`w-full p-3 rounded-2xl border text-sm font-bold ${
              darkMode
                ? "bg-black/30 border-white/10 text-white"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="">Tous les {L.patrons}</option>
            {patrons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── STATS TOGGLE ── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowStats((v) => !v)}
          className={`px-4 py-2 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all ${
            showStats
              ? "bg-indigo-600/80 text-white"
              : darkMode
              ? "bg-white/5 text-white/50 border border-white/10"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          📈 Statistiques
        </button>
      </div>

      {/* ── SECTION STATISTIQUES (collapsible) ── */}
      {showStats && (
        <div
          className={`p-4 rounded-[25px] border ${
            darkMode ? "bg-white/3 border-white/8" : "bg-slate-50 border-slate-200"
          }`}
        >
          <StatsCharts
            missions={missions}
            patrons={patrons}
            effectivePatronId={effectivePatronId}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* ── TABLEAU DE BORD ── */}
      {(historique.all?.length > 0 ||
        historique.impayes?.length > 0 ||
        historique.payes?.length > 0) &&
        (() => {
          // Calculs dashboard
          const currentMonth = new Date().toISOString().substring(0, 7);
          const currentWeek = getWeekNumber(new Date());

          // CA ce mois
          const missionsMois = missions.filter((m) => {
            const patronOk =
              !effectivePatronId || m.patron_id === effectivePatronId;
            return patronOk && m.date_iso?.startsWith(currentMonth);
          });
          const caMois = missionsMois.reduce((s, m) => s + (m.montant || 0), 0);

          // CA total
          const missionsTotal = missions.filter(
            (m) => !effectivePatronId || m.patron_id === effectivePatronId
          );
          const caTotal = missionsTotal.reduce((s, m) => s + (m.montant || 0), 0);

          // Total impayés (using filtered list to exclude deleted-mission rows)
          const totalImpayes = filteredImpayes.reduce(
            (s: number, r: any) => s + (r.ca_brut_periode || 0),  // ✅ au lieu de reste_a_percevoir
            0
          );

          // Dernier acompte
          const acomptesFiltres = listeAcomptes.filter(
            (a) => !effectivePatronId || a.patron_id === effectivePatronId
          );
          const dernierAcompte = acomptesFiltres.sort((a, b) =>
            b.date_acompte?.localeCompare(a.date_acompte)
          )[0];

          return (
            <div className="space-y-3">
              {/* CA Mois + Total */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-4 rounded-[20px] border ${
                    darkMode
                      ? "bg-indigo-900/30 border-indigo-500/20"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest mb-1">
                    CA ce mois
                  </p>
                  <p className="text-xl font-black text-indigo-300">
                    {formatEuro(caMois)}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-[20px] border ${
                    darkMode
                      ? "bg-purple-900/30 border-purple-500/20"
                      : "bg-purple-50 border-purple-200"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest mb-1">
                    CA total
                  </p>
                  <p className="text-xl font-black text-purple-300">
                    {formatEuro(caTotal)}
                  </p>
                </div>
              </div>

              {/* Total impayés */}
              <div
                className={`p-4 rounded-[20px] border flex items-center justify-between ${
                  totalImpayes > 0
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-green-500/10 border-green-500/30"
                }`}
              >
                <div>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">
                    Total impayés
                  </p>
                  <p
                    className={`text-2xl font-black ${
                      totalImpayes > 0 ? "text-orange-300" : "text-green-300"
                    }`}
                  >
                    {formatEuro(totalImpayes)}
                  </p>
                </div>
                <div className="text-4xl">
                  {totalImpayes > 0 ? "🟠" : "✅"}
                </div>
              </div>

              {/* Semaines payées / impayées */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-4 rounded-[20px] border ${
                    darkMode
                      ? "bg-green-900/20 border-green-500/20"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest mb-1">
                    Semaines payées
                  </p>
                  <p className="text-2xl font-black text-green-300 amount-safe">
                    {filteredPayes.length} ✅
                  </p>
                </div>

                <div
                  className={`p-4 rounded-[20px] border ${
                    darkMode
                      ? "bg-orange-900/20 border-orange-500/20"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase opacity-50 tracking-widest mb-1">
                    Semaines impayées
                  </p>
                  <p className="text-2xl font-black text-orange-300">
                    {filteredImpayes.length} 🟠
                  </p>
                </div>
              </div>

              {/* Dernier acompte */}
              {dernierAcompte && (
                <div
                  className={`p-4 rounded-[20px] border flex items-center justify-between ${
                    darkMode
                      ? "bg-cyan-900/20 border-cyan-500/20"
                      : "bg-cyan-50 border-cyan-200"
                  }`}
                >
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-50 tracking-widest mb-1">
                      Dernier acompte reçu
                    </p>
                    <p className="text-xl font-black text-cyan-300 amount-safe">
                      {formatEuro(dernierAcompte.montant)}
                    </p>
                    <p className="text-[10px] opacity-50 mt-1">
                      {formatDateFR(dernierAcompte.date_acompte)}
                    </p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              )}
            </div>
          );
        })()}

      {/* ── BOUTON CHARGER ── */}
      {historique.all?.length === 0 && (
        <button
          onClick={() => onLoadHistorique(effectivePatronId)}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl font-black text-white text-[11px] uppercase active:scale-95 transition-all"
        >
          {loadingHistorique ? "Chargement..." : "📊 Charger le tableau de bord"}
        </button>
      )}

      {/* ── ONGLETS IMPAYÉS / PAYÉS / MISSIONS ── */}
      {(historique.all?.length > 0 || missions.length > 0) && (
        <>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onTabChange("impayes")}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                historiqueTab === "impayes"
                  ? "bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-lg"
                  : darkMode
                    ? "bg-white/5 text-white/40 border border-white/10"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              🟠 Impayés ({filteredImpayes.length})
            </button>

            <button
              onClick={() => onTabChange("payes")}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                historiqueTab === "payes"
                  ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-lg"
                  : darkMode
                    ? "bg-white/5 text-white/40 border border-white/10"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              ✅ Payés ({filteredPayes.length})
            </button>

            <button
              onClick={() => onTabChange("missions")}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                historiqueTab === "missions"
                  ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg"
                  : darkMode
                    ? "bg-white/5 text-white/40 border border-white/10"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              📋 Missions
            </button>
          </div>

          {/* Liste impayés */}
          {historiqueTab === "impayes" && (
            <div
              className={`p-4 rounded-[25px] border ${
                darkMode
                  ? "border-orange-500/20 bg-orange-500/5"
                  : "border-orange-200 bg-orange-50"
              } backdrop-blur-md`}
            >
              {filteredImpayes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🎉</p>
                  <p className="text-sm opacity-60 font-bold">Aucun impayé !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredImpayes.map((row: any) => (
                    <div
                      key={row.id}
                      className={`flex items-center justify-between p-4 rounded-2xl ${
                        darkMode
                          ? "bg-black/30 border border-white/10"
                          : "bg-white border border-orange-100"
                      }`}
                    >
                      <div>
                        <p className="font-black uppercase text-sm">
                          Semaine {row.periode_value}
                        </p>
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {row.patron_nom || "Global"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-orange-400 amount-safe">
                          {formatEuro(row.reste_a_percevoir || 0)}
                        </p>
                        <p className="text-[9px] uppercase opacity-40 tracking-wider">
                          non payé
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-orange-500/20 flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase opacity-60">
                      Total
                    </p>
                    <p className="text-xl font-black text-orange-400 amount-safe">
                      {formatEuro(
                        filteredImpayes.reduce(
                          (s: number, r: any) => s + (r.reste_a_percevoir || 0),
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Liste payés */}
          {historiqueTab === "payes" && (
            <div
              className={`p-4 rounded-[25px] border ${
                darkMode
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-green-200 bg-green-50"
              } backdrop-blur-md`}
            >
              {filteredPayes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm opacity-60 font-bold">
                    Aucun paiement enregistré.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPayes.map((row: any) => (
                    <div
                      key={row.id}
                      className={`flex items-center justify-between p-4 rounded-2xl ${
                        darkMode
                          ? "bg-black/30 border border-white/10"
                          : "bg-white border border-green-100"
                      }`}
                    >
                      <div>
                        <p className="font-black uppercase text-sm">
                          Semaine {row.periode_value}
                        </p>
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {row.patron_nom || "Global"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-green-400 amount-safe">
                          {formatEuro(row.ca_brut_periode || 0)}
                        </p>
                        <p className="text-[9px] opacity-40">
                          {row.date_paiement
                            ? formatDateFR(row.date_paiement)
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Liste missions avec filtres ── */}
          {historiqueTab === "missions" && (
            <div className="space-y-3">
              {/* Filtres */}
              <div
                className={`p-3 rounded-[20px] border grid grid-cols-2 gap-2 ${
                  darkMode ? "bg-white/4 border-white/8" : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Date de */}
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">De</p>
                  <select
                    value={mDateFrom}
                    onChange={(e) => setMDateFrom(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-[11px] font-bold focus:outline-none ${
                      darkMode ? "bg-black/30 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="">Début</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{formatMonthLabel(m)}</option>
                    ))}
                  </select>
                </div>

                {/* Date à */}
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">À</p>
                  <select
                    value={mDateTo}
                    onChange={(e) => setMDateTo(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-[11px] font-bold focus:outline-none ${
                      darkMode ? "bg-black/30 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="">Fin</option>
                    {[...availableMonths].reverse().map((m) => (
                      <option key={m} value={m}>{formatMonthLabel(m)}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre client */}
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">{L.client}</p>
                  <select
                    value={mClient}
                    onChange={(e) => setMClient(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-[11px] font-bold focus:outline-none ${
                      darkMode ? "bg-black/30 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="">Tous</option>
                    {clientsUniques.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Filtre patron (masqué si effectivePatronId) */}
                {!effectivePatronId && (
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-40 mb-1">{L.patron}</p>
                    <select
                      value={mPatronId}
                      onChange={(e) => setMPatronId(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-[11px] font-bold focus:outline-none ${
                        darkMode ? "bg-black/30 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="">Tous</option>
                      {patrons.map((p) => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reset */}
                {(mDateFrom || mDateTo || mClient || mPatronId) && (
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => { setMDateFrom(""); setMDateTo(""); setMClient(""); setMPatronId(""); }}
                      className={`text-[10px] font-black px-3 py-1 rounded-xl ${darkMode ? "text-white/50 hover:text-white/80" : "text-slate-400 hover:text-slate-700"}`}
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                )}
              </div>

              {/* Total filtré */}
              {missionsFiltrees.length > 0 && (
                <div className="flex justify-between items-center px-2 py-1">
                  <p className="text-[10px] font-black opacity-60 uppercase">
                    {missionsFiltrees.length} mission(s)
                  </p>
                  <p className="text-[11px] font-black text-indigo-400">
                    {formatEuro(missionsFiltrees.reduce((s, m) => s + (m.montant || 0), 0))}
                    {" · "}
                    {missionsFiltrees.reduce((s, m) => s + (m.duree || 0), 0).toFixed(1)} h
                  </p>
                </div>
              )}

              {/* Liste */}
              {missionsFiltrees.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm font-bold">Aucune mission trouvée.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {missionsFiltrees.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 ${
                        darkMode ? "bg-black/20 border-white/8" : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Date */}
                      <div className="shrink-0 text-center w-8">
                        <p className="text-[18px] font-black leading-none">
                          {m.date_iso?.slice(8)}
                        </p>
                        <p className="text-[8px] font-black uppercase opacity-40">
                          {new Date(m.date_iso + "T12:00:00").toLocaleString("fr-FR", { month: "short" })}
                        </p>
                      </div>

                      {/* Détails */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[11px] truncate">
                          {m.client || "—"} · {m.lieu || "—"}
                        </p>
                        <p className="text-[9px] opacity-50 mt-0.5">
                          {m.debut?.slice(0, 5)} → {m.fin?.slice(0, 5)}
                          {m.pause > 0 ? ` (pause ${m.pause}min)` : ""}
                        </p>
                      </div>

                      {/* Montant + heures */}
                      <div className="shrink-0 text-right">
                        <p className="font-black text-sm text-indigo-400 amount-safe">
                          {formatEuro(m.montant || 0)}
                        </p>
                        <p className="text-[9px] opacity-40">
                          {(m.duree || 0).toFixed(1)} h
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

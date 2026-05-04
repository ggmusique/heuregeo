import React, { useState } from "react";
import { isSuspectLieu } from "../utils/suspectCoords";
import { getKmEnabled } from "../utils/kmSettings";
import { supabase } from "../services/supabase";
import { DIAGNOSTICS_MESSAGES } from "../constants/messages";
import { runAsyncAction } from "../utils/asyncAction";
import type { UserProfile } from "../types/profile";
import type { Mission, Patron, Lieu } from "../types/entities";
import type { KmFraisResult, KmSettings } from "../hooks/useKmDomicile";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface DiagData {
  bilan: {
    paye: boolean;
    reste_a_percevoir: number | null;
    ca_brut_periode: number | null;
    acompte_consomme: number | null;
    date_paiement: string | null;
    periode_index: number;
    id: string;
  } | null;
  impayePrecedent: number;
  acomptes: { id: string; montant: number; date_acompte: string }[];
  allocations: { acompte_id: string; amount: number; periode_index: number }[];
  fraisKm: { date_frais: string; distance_km: number; rate_per_km: number; amount: number; mission_id: string }[];
  queryErrors: string[];
}

interface RepairResult {
  success: boolean;
  message: string;
  fixed: number;
  skipped: number;
}

interface Anomaly {
  severity: "critical" | "warning";
  message: string;
}

interface DiagArgs {
  kmEnabled: boolean;
  domLat: number | null;
  domLng: number | null;
  lieuxSansCoords: Lieu[];
  lieuxSuspects: Lieu[];
  nbSansFraisKm: number;
}

interface DiagnosticsPageProps {
  profile: UserProfile | null;
  kmSettings: KmSettings | null;
  domicileLatLng: { lat: number; lng: number } | null;
  lieux?: Lieu[];
  missionsThisWeek?: Mission[];
  kmFraisThisWeek?: KmFraisResult;
  onRegeocoderBatch?: ((lieux: Lieu[]) => Promise<unknown>) | null;
  onRecalculerKmSemaine?: (() => Promise<unknown>) | null;
  onRebuildBilans?: ((patronId: string | null, start: number, end: number) => Promise<unknown>) | null;
  onRepairBilans?: ((patronId: string | null) => Promise<unknown>) | null;
  patrons?: Patron[];
}

/**
 * DiagnosticsPage — Vue admin pour diagnostiquer l'ensemble du système :
 * GPS/KM, bilans, acomptes, allocations, rebuild.
 *
 * Sécurité : accessible uniquement si isAdmin === true (vérifié dans ParametresTab).
 * Le viewer ne peut jamais y accéder (il est bloqué hors de l'onglet Paramètres).
 */
export const DiagnosticsPage = ({
  profile,
  kmSettings,
  domicileLatLng,
  lieux = [],
  missionsThisWeek = [],
  kmFraisThisWeek = { items: [], totalKm: 0, totalAmount: 0 },
  onRegeocoderBatch = null,
  onRecalculerKmSemaine = null,
  onRebuildBilans = null,
  onRepairBilans = null,
  patrons = [],
}: DiagnosticsPageProps) => {
  const [regeoLoading, setRegeoLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildPatronId, setRebuildPatronId] = useState("");
  const [rebuildStart, setRebuildStart] = useState("1");
  const [rebuildEnd, setRebuildEnd] = useState("20");
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [repairPatronId, setRepairPatronId] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionIsError, setActionIsError] = useState(false);

  // --- Diagnostic financier ---
  const [diagPatronId, setDiagPatronId] = useState("");
  const [diagWeek, setDiagWeek] = useState("");
  const [diagData, setDiagData] = useState<DiagData | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [clipboardFeedback, setClipboardFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const features = profile?.features ?? {};

  // 1. kmEnabled
  const kmEnabled = getKmEnabled(features);

  // 2. Domicile coords
  const domLat = domicileLatLng?.lat ?? kmSettings?.km_domicile_lat ?? null;
  const domLng = domicileLatLng?.lng ?? kmSettings?.km_domicile_lng ?? null;
  const domLabel = kmSettings?.km_domicile_adresse || "";

  // 3. Lieux sans coords
  const lieuxSansCoords = lieux.filter(
    (l) => !Number.isFinite(Number(l.latitude)) || !Number.isFinite(Number(l.longitude))
  );

  // 4. Lieux suspects (coords proches du domicile)
  const lieuxSuspects = lieux.filter((l) =>
    isSuspectLieu(l, domLat, domLng, domLabel)
  );

  // 5. Semaine courante
  const nbMissions = missionsThisWeek.length;
  const fraisItems = kmFraisThisWeek.items || [];
  const missionsSansFraisKm = fraisItems.filter((f) => f.kmTotal === null);
  const nbSansFraisKm = missionsSansFraisKm.length;

  // ── Synthèse & anomalies ─────────────────────────────────────────────────
  const staticAnomalies = getStaticAnomalies({
    kmEnabled,
    domLat,
    domLng,
    lieuxSansCoords,
    lieuxSuspects,
    nbSansFraisKm,
  });
  const diagDataAnomalies = diagData ? getDiagDataAnomalies(diagData, diagWeek) : [];

  const globalStatus = getDiagnosticStatus({
    kmEnabled,
    domLat,
    domLng,
    lieuxSansCoords,
    lieuxSuspects,
    nbSansFraisKm,
  });
  const globalSummary = getDiagnosticSummary({
    kmEnabled,
    domLat,
    domLng,
    lieuxSansCoords,
    lieuxSuspects,
    nbSansFraisKm,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const showMsg = (msg: string, isError = false) => {
    setActionMsg(msg);
    setActionIsError(isError);
  };

  const handleRebuildBilans = async () => {
    const fn = onRebuildBilans;
    if (!fn) return;
    const start = parseInt(rebuildStart, 10);
    const end = parseInt(rebuildEnd, 10);
    if (!start || !end || start > end) {
      showMsg(DIAGNOSTICS_MESSAGES.INVALID_WEEK_RANGE, true);
      return;
    }
setRebuildLoading(true);
    setActionMsg(null);
    try {
      await runAsyncAction({
        run: () => fn(rebuildPatronId || null, start, end),
        onSuccess: (result) => showMsg(result?.message || DIAGNOSTICS_MESSAGES.REBUILD_DONE, !result?.success),
        onError: (msg) => showMsg(msg, true),
        fallbackErrorMessage: DIAGNOSTICS_MESSAGES.REBUILD_FAILED,
      });
    } finally {
      setRebuildLoading(false);
    }
  };

  const handleRepairBilans = async () => {
    const fn = onRepairBilans;
    if (!fn) return;
    setRepairLoading(true);
    setRepairResult(null);
    try {
      await runAsyncAction({
        run: () => fn(repairPatronId || null),
        onSuccess: (result: RepairResult) => {
          setRepairResult(result);
          showMsg(result.message, !result.success);
        },
        onError: (msg) => showMsg(msg, true),
        fallbackErrorMessage: DIAGNOSTICS_MESSAGES.REPAIR_FAILED,
      });
    } finally {
      setRepairLoading(false);
    }
  };

  const handleRegeocoderBatch = async () => {
    const fn = onRegeocoderBatch;
    if (!fn || lieuxSansCoords.length === 0) return;
    setRegeoLoading(true);
    setActionMsg(null);
    try {
      await runAsyncAction({
        run: () => fn(lieuxSansCoords),
        onSuccess: (result) => showMsg(result?.message || DIAGNOSTICS_MESSAGES.GEOCODE_DONE),
        onError: (msg) => showMsg(msg, true),
        fallbackErrorMessage: DIAGNOSTICS_MESSAGES.GEOCODE_FAILED,
      });
    } finally {
      setRegeoLoading(false);
    }
  };

  const handleRecalculerKm = async () => {
    const fn = onRecalculerKmSemaine;
    if (!fn || nbMissions === 0) return;
    setRecalcLoading(true);
    setActionMsg(null);
    try {
      await runAsyncAction({
        run: () => fn(),
        onSuccess: (result) => showMsg(result?.message || DIAGNOSTICS_MESSAGES.RECALC_KM_DONE),
        onError: (msg) => showMsg(msg, true),
        fallbackErrorMessage: DIAGNOSTICS_MESSAGES.RECALC_KM_FAILED,
      });
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleCopyDiagnostic = async () => {
    if (!diagData) return;
    const patronNom = patrons.find((p) => p.id === diagPatronId)?.nom || diagPatronId;
    const text = buildDiagnosticClipboardText(diagData, diagWeek, patronNom);
    try {
      await navigator.clipboard.writeText(text);
      setClipboardFeedback({ ok: true, msg: DIAGNOSTICS_MESSAGES.COPY_DIAG_OK });
    } catch {
      setClipboardFeedback({ ok: false, msg: DIAGNOSTICS_MESSAGES.COPY_DIAG_FAILED });
    }
    setTimeout(() => setClipboardFeedback(null), 2500);
  };

  const loadDiagnostique = async () => {
    if (!diagPatronId || !diagWeek) return;
    const wk = parseInt(diagWeek, 10);
    if (!wk || wk < 1 || wk > 53) return;

    setDiagLoading(true);
    setDiagError(null);
    setDiagData(null);
    try {
      const [bilanRes, precedentsRes, acomptesRes, allocRes, fraisRes] =
        await Promise.all([
          supabase.from("bilans_status_v2")
            .select("ca_brut_periode, acompte_consomme, reste_a_percevoir, paye, date_paiement, periode_index, id")
            .eq("patron_id", diagPatronId).eq("periode_type", "semaine").eq("periode_index", wk)
            .maybeSingle(),

          supabase.from("bilans_status_v2")
            .select("periode_index, reste_a_percevoir, paye")
            .eq("patron_id", diagPatronId).eq("periode_type", "semaine").lt("periode_index", wk)
            .or("paye.eq.false,reste_a_percevoir.gt.0"),

          supabase.from("acomptes")
            .select("id, montant, date_acompte")
            .eq("patron_id", diagPatronId).order("date_acompte"),

          supabase.from("acompte_allocations")
            .select("acompte_id, amount, periode_index")
            .eq("patron_id", diagPatronId).order("periode_index"),

          supabase.from("frais_km")
            .select("date_frais, distance_km, rate_per_km, amount, mission_id")
            .eq("patron_id", diagPatronId)
            .gte("date_frais", isoWeekStart(wk))
            .lte("date_frais", isoWeekEnd(wk))
            .order("date_frais"),
        ]);

      // Capturer les erreurs individuelles (Supabase ne throw pas)
      const queryErrors = [
        bilanRes.error && `Bilan: ${bilanRes.error.message}`,
        precedentsRes.error && `Précédents: ${precedentsRes.error.message}`,
        acomptesRes.error && `Acomptes: ${acomptesRes.error.message}`,
        allocRes.error && `Allocations: ${allocRes.error.message}`,
        fraisRes.error && `Frais KM: ${fraisRes.error.message}`,
      ].filter(Boolean);

      const impayePrecedent = (precedentsRes.data || []).reduce(
        (sum, r) => sum + Math.max(0, parseFloat(String(r.reste_a_percevoir)) || 0), 0
      );

      setDiagData({
        bilan: bilanRes.data ?? null,
        impayePrecedent,
        acomptes: (acomptesRes.data || []) as DiagData["acomptes"],
        allocations: (allocRes.data || []) as DiagData["allocations"],
        fraisKm: (fraisRes.data || []) as DiagData["fraisKm"],
        queryErrors: queryErrors as string[],
      });
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in slide-in-from-right duration-400 space-y-4">

      {/* Header */}
      <div className="mb-2 text-center">
        <p className="text-[11px] font-black uppercase opacity-40 tracking-[0.25em] mb-2">
          Admin / Dev
        </p>
        <h2 className="text-2xl font-black text-[#C9A84C] italic font-['Playfair_Display'] mb-1">
          Diagnostics avancés
        </h2>
        <p className="text-[10px] opacity-30 mt-0.5">Vue réservée admin · non visible des viewers</p>
      </div>

      {/* BLOC 1 — Statut global */}
      <GlobalStatusCard status={globalStatus} summary={globalSummary} />

      {/* Feedback actions */}
      {actionMsg && (
        <div
          className={`p-3 rounded-2xl text-sm text-center border ${
            actionIsError
              ? "bg-red-600/20 border-red-500/40 text-red-400"
              : "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {/* BLOC 2 — Points à corriger */}
      {staticAnomalies.length === 0 ? (
        <div className="p-4 rounded-[20px] border border-emerald-500/30 bg-emerald-600/10 backdrop-blur-md flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50 shrink-0" />
          <p className="text-[13px] text-emerald-300 font-black">Aucun problème détecté ✓</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng)) && (
            <AnomalyCard
              severity="critical"
              title="Domicile non localisé"
              description="Les frais kilométriques sont activés mais les coordonnées de votre domicile sont manquantes — le calcul des distances est impossible."
            />
          )}
          {lieuxSansCoords.length > 0 && (
            <AnomalyCard
              severity={lieuxSansCoords.length >= 3 ? "critical" : "warning"}
              title={`${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")} sans coordonnées GPS`}
              description={
                lieuxSansCoords.length === 1
                  ? "Ce lieu ne génère pas de frais kilométriques car ses coordonnées GPS sont manquantes."
                  : "Ces lieux ne génèrent pas de frais kilométriques car leurs coordonnées GPS sont manquantes."
              }
              list={lieuxSansCoords.map((l) => l.nom || "—")}
              action={
                onRegeocoderBatch
                  ? {
                      label: regeoLoading
                        ? "Géocodage en cours…"
                        : `Re-géocoder ${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")}`,
                      loading: regeoLoading,
                      onClick: handleRegeocoderBatch,
                    }
                  : undefined
              }
            />
          )}
          {lieuxSuspects.length > 0 && (
            <AnomalyCard
              severity="warning"
              title={`${lieuxSuspects.length} lieu${pluralFr(lieuxSuspects.length, "", "x")} suspect${pluralFr(lieuxSuspects.length, "", "s")}`}
              description="Ces lieux ont des coordonnées très proches de votre domicile — ils ont peut-être été géocodés par erreur sur votre adresse."
              list={lieuxSuspects.map((l) => l.nom || "—")}
            />
          )}
          {kmEnabled && nbSansFraisKm > 0 && (
            <AnomalyCard
              severity="warning"
              title={`${nbSansFraisKm} mission${pluralFr(nbSansFraisKm, "", "s")} sans frais kilométriques`}
              description={
                nbSansFraisKm > 1
                  ? "Ces missions de la semaine en cours n'ont pas de frais km associés — vérifiez les lieux."
                  : "Cette mission de la semaine en cours n'a pas de frais km associés — vérifiez les lieux."
              }
              list={missionsSansFraisKm.map((f) =>
                [f.labelLieuOuClient || "—", f.date || ""].filter(Boolean).join(" · ")
              )}
              action={
                onRecalculerKmSemaine
                  ? {
                      label: recalcLoading ? "Recalcul en cours…" : "Recalculer KM",
                      loading: recalcLoading,
                      onClick: handleRecalculerKm,
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* BLOC 3 — Analyser une semaine spécifique */}
      <details className="rounded-[20px] border border-white/10 bg-[#0A1628]/40 backdrop-blur-md overflow-hidden">
        <summary className="p-4 cursor-pointer select-none flex items-center justify-between">
          <span className="text-[12px] font-black text-white/70">🔍 Analyser une semaine spécifique</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {/* Sélecteur patron + semaine */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase text-white/40 tracking-wider">Patron</label>
              <select
                value={diagPatronId}
                onChange={(e) => { setDiagPatronId(e.target.value); setDiagData(null); }}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono"
              >
                <option value="">— choisir —</option>
                {patrons.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="text-[10px] uppercase text-white/40 tracking-wider">Semaine n°</label>
              <input
                type="number" min="1" max="53"
                value={diagWeek}
                onChange={(e) => { setDiagWeek(e.target.value); setDiagData(null); }}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono text-center"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={loadDiagnostique}
            disabled={diagLoading || !diagPatronId || !diagWeek}
            className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 border-cyan-500/40 text-cyan-300 bg-cyan-600/10 hover:bg-cyan-600/20 ${diagLoading || !diagPatronId || !diagWeek ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {diagLoading ? "Chargement…" : "Charger"}
          </button>
          {diagError && (
            <p className="text-red-400 text-[11px] text-center">❌ {diagError}</p>
          )}

          {/* Résultats */}
          {diagData && (
            <div className="space-y-3">
              {/* Alertes dynamiques en langage humain */}
              {diagDataAnomalies.length > 0 && (
                <div className="space-y-2">
                  {diagDataAnomalies.map((a, i) => (
                    <AnomalyCard key={i} severity={a.severity} title={a.message} description="" />
                  ))}
                </div>
              )}

              {/* Résumé principal en langage humain */}
              <HumanSummaryCard diagData={diagData} diagWeek={diagWeek} />

              {/* Trajets KM — résumé humain */}
              {diagData.fraisKm.length > 0 && (
                <div className="p-4 rounded-[20px] border border-white/10 bg-[#0A1628]/50 backdrop-blur-md">
                  <p className="text-[13px] text-white/80 leading-relaxed">
                    {diagData.fraisKm.length} trajet{pluralFr(diagData.fraisKm.length, "", "s")} km enregistré{pluralFr(diagData.fraisKm.length, "", "s")} cette semaine — total{" "}
                    <span className="font-black text-white">
                      {diagData.fraisKm.reduce((s, f) => s + f.distance_km, 0).toFixed(1)} km
                    </span>
                    {" / "}
                    <span className="font-black text-yellow-300">
                      {diagData.fraisKm.reduce((s, f) => s + f.amount, 0).toFixed(2)} €
                    </span>
                  </p>
                </div>
              )}

              {/* Bouton Copier le diagnostic */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDiagnostic}
                  className="flex-1 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 border-white/15 text-white/50 bg-white/5 hover:bg-white/10 hover:text-white/70"
                >
                  Copier le diagnostic
                </button>
                {clipboardFeedback && (
                  <span className={`text-[11px] font-black shrink-0 ${clipboardFeedback.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {clipboardFeedback.msg}
                  </span>
                )}
              </div>

              {/* Données techniques (accordéon secondaire) */}
              <details className="rounded-[16px] border border-white/10 bg-white/5 overflow-hidden">
                <summary className="p-3 cursor-pointer select-none text-[10px] font-black uppercase tracking-widest text-white/40">
                  Données techniques
                </summary>
                <pre className="px-3 pb-3 text-[10px] text-white/40 font-mono whitespace-pre-wrap overflow-auto max-h-72 leading-relaxed">
                  {JSON.stringify(
                    {
                      bilan: diagData.bilan,
                      impaye_anterieur: diagData.impayePrecedent,
                      avances: diagData.acomptes,
                      allocations: diagData.allocations,
                      frais_km: diagData.fraisKm,
                      erreurs: diagData.queryErrors,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          )}
        </div>
      </details>

      {/* BLOC 4 — Outils avancés */}
      <details className="rounded-[20px] border border-white/10 bg-[#0A1628]/40 backdrop-blur-md overflow-hidden">
        <summary className="p-4 cursor-pointer select-none flex items-center justify-between">
          <span className="text-[12px] font-black text-white/50">⚙️ Outils avancés</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[10px] text-white/30 italic">
            Ces outils modifient des données en base. Utiliser avec précaution.
          </p>

          {/* Reconstruire les bilans */}
          {onRebuildBilans && (
            <Card title="Reconstruire les bilans">
              <p className="text-[10px] text-white/40 mb-2">
                <span className="font-black text-white/60">À utiliser si :</span> des montants restants sont incohérents après une correction.<br />
                <span className="font-black text-white/60">Effet :</span> recalcule les bilans en ordre croissant (règle glissante semaine N-1).
              </p>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-white/40 tracking-wider">Patron</label>
                  <select
                    value={rebuildPatronId}
                    onChange={(e) => setRebuildPatronId(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono"
                  >
                    <option value="">Global</option>
                    {patrons.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="w-16">
                  <label className="text-[10px] uppercase text-white/40 tracking-wider">De S</label>
                  <input
                    type="number" min="1" max="53"
                    value={rebuildStart}
                    onChange={(e) => setRebuildStart(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono text-center"
                  />
                </div>
                <div className="w-16">
                  <label className="text-[10px] uppercase text-white/40 tracking-wider">À S</label>
                  <input
                    type="number" min="1" max="53"
                    value={rebuildEnd}
                    onChange={(e) => setRebuildEnd(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono text-center"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRebuildBilans}
                disabled={rebuildLoading}
                className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 border-orange-500/40 text-orange-300 bg-orange-600/10 hover:bg-orange-600/20 ${rebuildLoading ? "opacity-50 cursor-wait" : ""}`}
              >
                {rebuildLoading ? "Reconstruction en cours…" : "🔧 Reconstruire les bilans"}
              </button>
            </Card>
          )}

          {/* Réparer les bilans corrompus */}
          <Card title="Réparer les bilans corrompus">
            <p className="text-[10px] text-white/40 mb-2">
              <span className="font-black text-white/60">À utiliser si :</span> des montants "avance déduite" ou "à recevoir" sont incohérents.<br />
              <span className="font-black text-white/60">Effet :</span> recalcule depuis les allocations d&apos;acomptes (source de vérité), sans toucher aux données correctes.
            </p>
            <div className="mb-2">
              <label className="text-[10px] uppercase text-white/40 tracking-wider">Patron</label>
              <select
                value={repairPatronId}
                onChange={(e) => setRepairPatronId(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[12px] font-mono"
              >
                <option value="">Tous les patrons</option>
                {patrons.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            {repairResult && (
              <div className={`mb-2 p-2 rounded-xl text-[10px] font-black ${
                repairResult.success
                  ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-300"
                  : "bg-red-600/20 border border-red-500/30 text-red-400"
              }`}>
                {repairResult.message}
                {repairResult.success && (
                  <span className="ml-2 opacity-60">
                    ({repairResult.fixed} corrigée(s) / {repairResult.skipped} ok)
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleRepairBilans}
              disabled={repairLoading || !onRepairBilans}
              className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 border-emerald-500/40 text-emerald-300 bg-emerald-600/10 hover:bg-emerald-600/20 ${repairLoading ? "opacity-50 cursor-wait" : ""}`}
            >
              {repairLoading ? "Réparation en cours…" : "🔧 Réparer les bilans corrompus"}
            </button>
          </Card>
        </div>
      </details>
    </div>
  );
};

// ── Sous-composants UI ─────────────────────────────────────────────────────

function GlobalStatusCard({ status, summary }: { status: "ok" | "warning" | "critical"; summary: string }) {
  const cfg = {
    ok:       { dot: "bg-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-600/10", label: "Cohérent", labelClass: "text-emerald-400" },
    warning:  { dot: "bg-orange-400",  border: "border-orange-500/30",  bg: "bg-orange-600/10",  label: "Vigilance", labelClass: "text-orange-400" },
    critical: { dot: "bg-red-400",     border: "border-red-500/30",     bg: "bg-red-600/10",     label: "Critique",  labelClass: "text-red-400" },
  }[status] ?? {};

  return (
    <div className={`p-4 rounded-[20px] border ${cfg.border} ${cfg.bg} backdrop-blur-md`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Statut global</p>
        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.labelClass}`}>
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot} shadow-lg`} />
        <p className="text-[13px] text-white/80 leading-snug">{summary}</p>
      </div>
    </div>
  );
}

interface AnomalyCardAction {
  label: string;
  loading: boolean;
  onClick: () => void;
}

function AnomalyCard({ severity, title, description, list, action }: {
  severity: "critical" | "warning";
  title: string;
  description: string;
  list?: string[];
  action?: AnomalyCardAction;
}) {
  const isCritical = severity === "critical";
  const borderCls = isCritical ? "border-red-500/30" : "border-orange-500/30";
  const bgCls = isCritical ? "bg-red-600/10" : "bg-orange-600/10";
  const badgeCls = isCritical
    ? "text-red-400 border-red-500/30 bg-red-600/20"
    : "text-orange-400 border-orange-500/30 bg-orange-600/20";
  const badgeLabel = isCritical ? "Critique" : "Vigilance";
  const btnCls = isCritical
    ? "border-red-500/40 text-red-300 bg-red-600/10 hover:bg-red-600/20"
    : "border-yellow-500/40 text-yellow-300 bg-yellow-600/10 hover:bg-yellow-600/20";

  return (
    <div className={`p-4 rounded-[20px] border ${borderCls} ${bgCls} backdrop-blur-md space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-black text-white/90 leading-snug">{title}</p>
        <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>
      {description ? (
        <p className="text-[11px] text-white/55 leading-relaxed">{description}</p>
      ) : null}
      {list && list.length > 0 && (
        <ul className="space-y-0.5 max-h-32 overflow-y-auto">
          {list.map((item, i) => (
            <li key={i} className="text-[11px] text-white/40 pl-2">· {item}</li>
          ))}
        </ul>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.loading}
          className={`w-full mt-1 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 ${btnCls} ${action.loading ? "opacity-50 cursor-wait" : ""}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function HumanSummaryCard({ diagData, diagWeek }: { diagData: DiagData; diagWeek: number | string }) {
  const sentences = getHumanDiagnosticSummary(diagData, diagWeek);
  if (!sentences || sentences.length === 0) return null;

  return (
    <div className="p-4 rounded-[20px] border border-[#C9A84C]/25 bg-[#C9A84C]/5 backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]/60 mb-3">Résumé</p>
      <div className="space-y-2">
        {sentences.map((s, i) => (
          <p key={i} className="text-[13px] text-white/85 leading-relaxed">{s}</p>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-[20px] border border-yellow-600/20 bg-[#0A1628]/60 backdrop-blur-md space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/70 mb-1">{title}</p>
      {children}
    </div>
  );
}


// ── Utilitaires de diagnostic ─────────────────────────────────────────────

function getDiagnosticStatus({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }: DiagArgs): "ok" | "warning" | "critical" {
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) return "critical";
  if (lieuxSansCoords.length >= 3) return "critical";
  if (lieuxSansCoords.length > 0 || lieuxSuspects.length > 0) return "warning";
  if (kmEnabled && nbSansFraisKm > 0) return "warning";
  return "ok";
}

function getDiagnosticSummary({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }: DiagArgs): string {
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) {
    return "Incohérence critique : coordonnées domicile manquantes — calcul KM impossible.";
  }
  const issues = [];
  if (lieuxSansCoords.length > 0)
    issues.push(`${lieuxSansCoords.length} lieu${lieuxSansCoords.length > 1 ? "x" : ""} sans coordonnées GPS`);
  if (lieuxSuspects.length > 0)
    issues.push(`${lieuxSuspects.length} lieu${lieuxSuspects.length > 1 ? "x suspects" : " suspect"}`);
  if (kmEnabled && nbSansFraisKm > 0)
    issues.push(`${nbSansFraisKm} mission${nbSansFraisKm > 1 ? "s" : ""} sans frais km`);
  if (issues.length === 0) return "Aucune incohérence détectée.";
  if (issues.length === 1) return `Point de vigilance : ${issues[0]}.`;
  return `${issues.length} points de vigilance : ${issues.join(", ")}.`;
}

function getStaticAnomalies({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }: DiagArgs): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) {
    anomalies.push({
      severity: "critical",
      message: "Coordonnées domicile manquantes — les frais KM ne peuvent pas être calculés.",
    });
  }
  if (lieuxSansCoords.length > 0) {
    anomalies.push({
      severity: lieuxSansCoords.length >= 3 ? "critical" : "warning",
      message: `${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")} sans coordonnées GPS exploitables.`,
    });
  }
  if (lieuxSuspects.length > 0) {
    anomalies.push({
      severity: "warning",
      message: `${lieuxSuspects.length} lieu${pluralFr(lieuxSuspects.length, "", "x")} ${lieuxSuspects.length > 1 ? "ont des" : "a des"} coordonnées suspectes (trop proches du domicile).`,
    });
  }
  if (kmEnabled && nbSansFraisKm > 0) {
    anomalies.push({
      severity: "warning",
      message: `${nbSansFraisKm} mission${pluralFr(nbSansFraisKm, "", "s")} de la semaine en cours n'${nbSansFraisKm > 1 ? "ont" : "a"} pas de frais km associé${pluralFr(nbSansFraisKm, "", "s")}.`,
    });
  }
  return anomalies;
}

function getDiagDataAnomalies(diagData: DiagData, diagWeek: number | string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const bilan = diagData.bilan;

  // Semaine payée avec reste > 0
  if (bilan?.paye && (bilan.reste_a_percevoir ?? 0) > 0.01) {
    anomalies.push({
      severity: "critical",
      message: `Semaine n° ${diagWeek} marquée payée mais un montant de ${(bilan.reste_a_percevoir ?? 0).toFixed(2)} € reste à recevoir.`,
    });
  }

  // Acomptes sans allocation
  const acomptesSansAlloc = diagData.acomptes.filter(
    (ac) => !diagData.allocations.some((al) => al.acompte_id === ac.id)
  );
  if (acomptesSansAlloc.length > 0) {
    anomalies.push({
      severity: "warning",
      message: `${acomptesSansAlloc.length} avance${pluralFr(acomptesSansAlloc.length, "", "s")} sans aucune allocation associée.`,
    });
  }

  // Acomptes sur-alloués
  const acomptesOverAlloues = diagData.acomptes.filter((ac) => {
    const totalAlloue = diagData.allocations
      .filter((al) => al.acompte_id === ac.id)
      .reduce((s, al) => s + al.amount, 0);
    return totalAlloue > ac.montant + 0.01;
  });
  if (acomptesOverAlloues.length > 0) {
    anomalies.push({
      severity: "critical",
      message: `${acomptesOverAlloues.length} avance${pluralFr(acomptesOverAlloues.length, "", "s")} sur-allouée${pluralFr(acomptesOverAlloues.length, "", "s")} — le total des allocations dépasse le montant de l'avance.`,
    });
  }

  // Impayé reporté
  if (diagData.impayePrecedent > 0.01) {
    anomalies.push({
      severity: "warning",
      message: `Impayé antérieur de ${diagData.impayePrecedent.toFixed(2)} € reporté sur cette période.`,
    });
  }

  return anomalies;
}

function getHumanDiagnosticSummary(diagData: DiagData | null, diagWeek: number | string): string[] {
  if (!diagData) return [];
  const sentences = [];
  const bilan = diagData.bilan;
  const wk = parseInt(String(diagWeek), 10);

  // Phrase 1 : état du bilan
  if (!bilan) {
    sentences.push(`Aucun bilan enregistré pour la semaine n° ${diagWeek}.`);
  } else if (bilan.paye) {
    const dateStr = bilan.date_paiement
      ? new Date(bilan.date_paiement).toLocaleDateString("fr-FR")
      : null;
    sentences.push(`La semaine n° ${diagWeek} est soldée${dateStr ? ` le ${dateStr}` : ""}.`);
    if ((bilan.reste_a_percevoir ?? 0) > 0.01) {
      sentences.push(
        `Attention : elle est marquée payée mais un montant de ${(bilan.reste_a_percevoir ?? 0).toFixed(2)} € reste à recevoir.`
      );
    }
  } else {
    const reste = (bilan.reste_a_percevoir ?? 0);
    if (reste > 0.01) {
      sentences.push(`La semaine n° ${diagWeek} reste impayée — montant encore dû : ${reste.toFixed(2)} €.`);
    } else {
      sentences.push(`La semaine n° ${diagWeek} n'est pas marquée payée mais le montant à recevoir est nul.`);
    }
  }

  // Phrase 2 : acomptes & allocations sur cette semaine
  const allocsThisWeek = diagData.allocations.filter((al) => al.periode_index === wk);
  if (allocsThisWeek.length > 0) {
    const acompteIds = [...new Set(allocsThisWeek.map((al) => al.acompte_id))];
    if (acompteIds.length === 1) {
      const ac = diagData.acomptes.find((a) => a.id === acompteIds[0]);
      if (ac) {
        const allAllocsForAc = diagData.allocations.filter((al) => al.acompte_id === ac.id);
        const semaines = allAllocsForAc.map((al) => `semaine n° ${al.periode_index}`).join(", ");
        sentences.push(
          `Une avance de ${ac.montant.toFixed(2)} € a été allouée sur ${semaines}.`
        );
      }
    } else {
      const totalCouvert = allocsThisWeek.reduce((s, al) => s + al.amount, 0);
      sentences.push(
        `${acompteIds.length} avances couvrent ${totalCouvert.toFixed(2)} € sur la semaine n° ${diagWeek}.`
      );
    }
  } else if (diagData.acomptes.length > 0) {
    sentences.push(`Aucune avance n'est allouée à la semaine n° ${diagWeek}.`);
  } else {
    sentences.push("Aucune avance enregistrée pour ce patron.");
  }

  // Phrase 3 : impayé précédent
  if (diagData.impayePrecedent > 0.01) {
    sentences.push(
      `Un impayé antérieur de ${diagData.impayePrecedent.toFixed(2)} € est reporté sur cette période.`
    );
  }

  return sentences;
}

function buildDiagnosticClipboardText(diagData: DiagData, diagWeek: number | string, patronNom: string): string {
  const lines = [];
  lines.push(`Patron : ${patronNom || "—"}`);
  lines.push(`Semaine : ${diagWeek}`);
  lines.push("");

  if (diagData.bilan) {
    lines.push(`Total de la période : ${(diagData.bilan.ca_brut_periode ?? 0).toFixed(2)} €`);
    lines.push(`Impayé antérieur : ${diagData.impayePrecedent.toFixed(2)} €`);
    lines.push(`Statut : ${diagData.bilan.paye ? "Payé" : "Non payé"}`);
    lines.push(`À recevoir : ${(diagData.bilan.reste_a_percevoir ?? 0).toFixed(2)} €`);
  } else {
    lines.push("Bilan : absent");
  }

  lines.push("");
  lines.push("Avances :");
  if (diagData.acomptes.length === 0) {
    lines.push("- Aucune avance");
  } else {
    diagData.acomptes.forEach((ac) => {
      lines.push(
        `- ${new Date(ac.date_acompte).toLocaleDateString("fr-FR")} : ${ac.montant.toFixed(2)} €`
      );
    });
  }

  lines.push("");
  lines.push("Allocations :");
  if (diagData.allocations.length === 0) {
    lines.push("- Aucune allocation");
  } else {
    diagData.allocations.forEach((al) => {
      lines.push(`- Semaine n° ${al.periode_index} : ${al.amount.toFixed(2)} €`);
    });
  }

  lines.push("");
  lines.push("Frais KM :");
  if (diagData.fraisKm.length === 0) {
    lines.push("- 0 ligne");
  } else {
    diagData.fraisKm.forEach((f) => {
      lines.push(
        `- ${new Date(f.date_frais).toLocaleDateString("fr-FR")} : ${f.distance_km.toFixed(1)} km — ${f.amount.toFixed(2)} €`
      );
    });
  }

  const anomalies = getDiagDataAnomalies(diagData, diagWeek);
  if (anomalies.length > 0) {
    lines.push("");
    lines.push("Anomalies :");
    anomalies.forEach((a) => {
      lines.push(`- [${a.severity === "critical" ? "Critique" : "Vigilance"}] ${a.message}`);
    });
  }

  return lines.join("\n");
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns singular suffix when count === 1, plural suffix otherwise. */
function pluralFr(count: number, singular: string, plural: string): string {
  return count !== 1 ? plural : singular;
}

/** ISO week number → Monday date string (YYYY-MM-DD). */
function isoWeekStart(wk: number, year: number = new Date().getFullYear()): string {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - (dow - 1) + (wk - 1) * 7);
  return d.toISOString().slice(0, 10);
}

/** ISO week number → Sunday date string (YYYY-MM-DD). */
function isoWeekEnd(wk: number, year: number = new Date().getFullYear()): string {
  const d = new Date(isoWeekStart(wk, year));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

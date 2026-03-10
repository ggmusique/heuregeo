import React, { useState } from "react";
import { isSuspectLieu } from "../utils/suspectCoords";
import { getKmEnabled } from "../utils/kmSettings";
import { supabase } from "../services/supabase";

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
  patrons = [],
}) => {
  const [regeoLoading, setRegeoLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildPatronId, setRebuildPatronId] = useState("");
  const [rebuildStart, setRebuildStart] = useState("1");
  const [rebuildEnd, setRebuildEnd] = useState("20");
  const [actionMsg, setActionMsg] = useState(null);
  const [actionIsError, setActionIsError] = useState(false);

  // --- Diagnostic financier ---
  const [diagPatronId, setDiagPatronId] = useState("");
  const [diagWeek, setDiagWeek] = useState("");
  const [diagData, setDiagData] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState(null);
  const [clipboardFeedback, setClipboardFeedback] = useState(null);

  const features = profile?.features ?? {};

  // 1. kmEnabled value + source
  const kmEnabled = getKmEnabled(features);
  const ks = features.km_settings ?? {};
  const kmEnabledSource =
    typeof ks.enabled === "boolean"
      ? "km_settings.enabled"
      : typeof features.km_enabled === "boolean"
        ? "km_enabled (legacy)"
        : "absent (false par défaut)";

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
  const fraisKmLies = fraisItems.filter((f) => f.kmTotal !== null);
  const missionsSansFraisKm = fraisItems.filter((f) => f.kmTotal === null);
  const nbFraisKmLies = fraisKmLies.length;
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
  const showMsg = (msg, isError = false) => {
    setActionMsg(msg);
    setActionIsError(isError);
  };

  const handleRebuildBilans = async () => {
    if (!onRebuildBilans) return;
    const start = parseInt(rebuildStart, 10);
    const end = parseInt(rebuildEnd, 10);
    if (!start || !end || start > end) {
      showMsg("Plage de semaines invalide (ex: 3 → 15)", true);
      return;
    }
    setRebuildLoading(true);
    setActionMsg(null);
    try {
      const result = await onRebuildBilans(rebuildPatronId || null, start, end);
      showMsg(result?.message || "Rebuild terminé", !result?.success);
    } catch (err) {
      showMsg("Erreur : " + (err?.message || "Rebuild échoué"), true);
    } finally {
      setRebuildLoading(false);
    }
  };

  const handleRegeocoderBatch = async () => {
    if (!onRegeocoderBatch || lieuxSansCoords.length === 0) return;
    setRegeoLoading(true);
    setActionMsg(null);
    try {
      const result = await onRegeocoderBatch(lieuxSansCoords);
      showMsg(result?.message || "Géocodage batch terminé");
    } catch (err) {
      showMsg("Erreur : " + (err?.message || "Géocodage échoué"), true);
    } finally {
      setRegeoLoading(false);
    }
  };

  const handleRecalculerKm = async () => {
    if (!onRecalculerKmSemaine || nbMissions === 0) return;
    setRecalcLoading(true);
    setActionMsg(null);
    try {
      const result = await onRecalculerKmSemaine();
      showMsg(result?.message || "KM recalculés pour la semaine courante");
    } catch (err) {
      showMsg("Erreur : " + (err?.message || "Recalcul échoué"), true);
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
      setClipboardFeedback({ ok: true, msg: "Diagnostic copié" });
    } catch {
      setClipboardFeedback({ ok: false, msg: "Impossible d'accéder au presse-papiers" });
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
        (sum, r) => sum + Math.max(0, parseFloat(r.reste_a_percevoir) || 0), 0
      );

      setDiagData({
        bilan: bilanRes.data,
        impayePrecedent,
        acomptes: acomptesRes.data || [],
        allocations: allocRes.data || [],
        fraisKm: fraisRes.data || [],
        queryErrors,
      });
    } catch (err) {
      setDiagError(err.message);
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
        <p className="text-[11px] opacity-40">
          GPS · bilans · acomptes · allocations · rebuild · erreurs
        </p>
        <p className="text-[10px] opacity-30 mt-0.5">Vue réservée admin · non visible des viewers</p>
      </div>

      {/* ── Bloc statut global ─────────────────────────────────────── */}
      <GlobalStatusCard status={globalStatus} summary={globalSummary} />

      {/* ── Anomalies détectées ────────────────────────────────────── */}
      <AnomaliesCard anomalies={staticAnomalies} />

      {/* Message d'action (feedback boutons) */}
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

      {/* ── Section : GPS & Frais kilométriques ──────────────────── */}
      <SectionLabel>GPS &amp; Frais kilométriques</SectionLabel>

      {/* KM Enabled */}
      <Card title="Frais kilométriques">
        <Row
          label="kmEnabled"
          value={String(kmEnabled)}
          valueClass={kmEnabled ? "text-emerald-400" : "text-red-400"}
        />
        <Row label="Source" value={kmEnabledSource} valueClass="text-white/60 text-xs" />
        <Hint>
          {kmEnabled
            ? `Frais KM actifs. ${nbFraisKmLies} entrée${pluralFr(nbFraisKmLies, "", "s")} calculée${pluralFr(nbFraisKmLies, "", "s")} cette semaine.`
            : "Frais KM désactivés — aucun calcul de distance n'est effectué."}
        </Hint>
      </Card>

      {/* Domicile */}
      <Card title="Domicile">
        <Row
          label="lat"
          value={Number.isFinite(domLat) ? String(domLat) : "—"}
          valueClass={Number.isFinite(domLat) ? "text-white" : "text-red-400"}
        />
        <Row
          label="lng"
          value={Number.isFinite(domLng) ? String(domLng) : "—"}
          valueClass={Number.isFinite(domLng) ? "text-white" : "text-red-400"}
        />
        <Row label="label" value={domLabel || "—"} valueClass="text-white/60 text-xs" />
        <Hint>
          {Number.isFinite(domLat) && Number.isFinite(domLng)
            ? `Domicile localisé${domLabel ? ` (${domLabel})` : ""}.`
            : kmEnabled
              ? "Coordonnées manquantes — le calcul des distances KM est impossible."
              : "Coordonnées non renseignées (frais KM désactivés)."}
        </Hint>
      </Card>

      {/* Lieux sans coords */}
      <Card
        title="Lieux sans coordonnées GPS"
        badge={lieuxSansCoords.length}
        badgeClass={lieuxSansCoords.length > 0 ? "text-red-400" : "text-emerald-400"}
      >
        <Hint>
          {lieuxSansCoords.length === 0
            ? "Tous les lieux ont des coordonnées GPS."
            : `${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")} sans coordonnées — ils ne génèrent pas de frais km.`}
        </Hint>
        {lieuxSansCoords.length > 0 && (
          <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {lieuxSansCoords.map((l) => (
              <li key={l.id} className="text-[11px] text-white/60 flex justify-between gap-2">
                <span className="truncate">{l.nom || "—"}</span>
                <span className="text-white/30 font-mono shrink-0">{String(l.id).substring(0, 8)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Lieux suspects */}
      <Card
        title="Lieux suspects (proches domicile)"
        badge={lieuxSuspects.length}
        badgeClass={lieuxSuspects.length > 0 ? "text-orange-400" : "text-emerald-400"}
      >
        <Hint>
          {lieuxSuspects.length === 0
            ? "Aucun lieu n'a de coordonnées anormalement proches du domicile."
            : `${lieuxSuspects.length} lieu${pluralFr(lieuxSuspects.length, "", "x")} avec coordonnées possiblement copiées du domicile.`}
        </Hint>
        {lieuxSuspects.length > 0 && (
          <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {lieuxSuspects.map((l) => (
              <li key={l.id} className="text-[11px] text-white/60 flex justify-between gap-2">
                <span className="truncate">{l.nom || "—"}</span>
                <span className="text-white/30 font-mono shrink-0">{String(l.id).substring(0, 8)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Semaine courante */}
      <Card title="Semaine courante">
        <Row label="Missions" value={String(nbMissions)} />
        <Row
          label="Frais km liés (mission_id)"
          value={String(nbFraisKmLies)}
          valueClass={nbFraisKmLies > 0 ? "text-emerald-400" : "text-white/60"}
        />
        <Row
          label="Missions sans frais km"
          value={String(nbSansFraisKm)}
          valueClass={nbSansFraisKm > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <Hint>
          {!kmEnabled
            ? "Frais KM désactivés sur ce profil."
            : nbSansFraisKm > 0
              ? `${nbSansFraisKm} mission${pluralFr(nbSansFraisKm, "", "s")} sans frais km — vérifier les lieux associés.`
              : nbMissions === 0
                ? "Aucune mission cette semaine."
                : "Toutes les missions ont des frais km associés."}
        </Hint>
        {missionsSansFraisKm.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto border-t border-white/10 pt-2">
            {missionsSansFraisKm.map((f) => (
              <li key={f.missionId} className="text-[11px] text-white/60 flex justify-between gap-2">
                <span className="truncate">{f.labelLieuOuClient || "—"}</span>
                <span className="text-white/30 shrink-0">{f.date || ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Section : Actions & Rebuild ───────────────────────────── */}
      <SectionLabel>Actions &amp; Rebuild</SectionLabel>

      {/* Rebuild Bilans semaines */}
      {onRebuildBilans && (
        <Card title="Rebuild bilans semaines">
          <p className="text-[10px] text-white/40 mb-2">
            Reconstruit les bilans en DB dans l&apos;ordre croissant (règle glissante N-1).
            Utile pour corriger des restes incohérents après un fix.
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
            {rebuildLoading ? "Rebuild en cours…" : "🔧 Reconstruire bilans"}
          </button>
        </Card>
      )}

      {/* Actions GPS */}
      <Card title="Actions GPS">
        <button
          type="button"
          onClick={handleRegeocoderBatch}
          disabled={regeoLoading || lieuxSansCoords.length === 0}
          className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 ${
            lieuxSansCoords.length === 0
              ? "opacity-30 cursor-not-allowed border-white/10 text-white/30"
              : "border-yellow-500/40 text-yellow-300 bg-yellow-600/10 hover:bg-yellow-600/20"
          } ${regeoLoading ? "opacity-50 cursor-wait" : ""}`}
        >
          {regeoLoading
            ? "Géocodage en cours…"
            : `Re-géocoder ${lieuxSansCoords.length} lieu${pluralFr(lieuxSansCoords.length, "", "x")} manquant${pluralFr(lieuxSansCoords.length, "", "s")}`}
        </button>

        <button
          type="button"
          onClick={handleRecalculerKm}
          disabled={recalcLoading || nbMissions === 0}
          className={`w-full px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border transition-all active:scale-95 ${
            nbMissions === 0
              ? "opacity-30 cursor-not-allowed border-white/10 text-white/30"
              : "border-blue-500/40 text-blue-300 bg-blue-600/10 hover:bg-blue-600/20"
          } ${recalcLoading ? "opacity-50 cursor-wait" : ""}`}
        >
          {recalcLoading ? "Recalcul en cours…" : "Recalculer KM semaine"}
        </button>
      </Card>

      {/* ── Section : Diagnostic financier ───────────────────────── */}
      <SectionLabel>Diagnostic financier</SectionLabel>

      {/* Sélecteur patron + semaine */}
      <Card title="Sélection">
        <div className="flex gap-2 mb-2">
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
            <label className="text-[10px] uppercase text-white/40 tracking-wider">Semaine S</label>
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
          {diagLoading ? "Chargement…" : "🔍 Charger le diagnostic"}
        </button>
        {diagError && (
          <p className="mt-2 text-red-400 text-[11px] text-center">❌ {diagError}</p>
        )}
      </Card>

      {/* Résultats financiers */}
      {diagData && (
        <>
          {/* Anomalies dynamiques (diagData) */}
          {diagDataAnomalies.length > 0 && (
            <AnomaliesCard anomalies={diagDataAnomalies} title={`Anomalies détectées — S${diagWeek}`} />
          )}

          {/* Résumé humain */}
          <HumanSummaryCard diagData={diagData} diagWeek={diagWeek} />

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

          {/* Erreurs de requête */}
          {diagData.queryErrors?.length > 0 && (
            <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 space-y-1">
              <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">Erreurs de requête</p>
              {diagData.queryErrors.map((e, i) => (
                <p key={i} className="text-[11px] text-red-300 font-mono">{e}</p>
              ))}
            </div>
          )}

          {/* Card 1 — Bilan */}
          <Card title={`🔎 Bilan S${diagWeek}`} statusBadge={getBilanCardStatus(diagData)}>
            {diagData.bilan ? (
              <>
                <Row label="CA brut" value={`${parseFloat(diagData.bilan.ca_brut_periode || 0).toFixed(2)} €`} />
                <Row
                  label="Impayé précédent"
                  value={`${diagData.impayePrecedent.toFixed(2)} €`}
                  valueClass={diagData.impayePrecedent > 0.01 ? "text-red-400" : "text-emerald-400"}
                />
                <Row label="Acompte consommé (DB)" value={`${parseFloat(diagData.bilan.acompte_consomme || 0).toFixed(2)} €`} />
                <Row
                  label="Reste à percevoir (DB)"
                  value={`${parseFloat(diagData.bilan.reste_a_percevoir || 0).toFixed(2)} €`}
                  valueClass={parseFloat(diagData.bilan.reste_a_percevoir || 0) > 0.01 ? "text-red-400" : "text-emerald-400"}
                />
                <Row
                  label="Statut payé"
                  value={diagData.bilan.paye ? "✅ Payé" : "❌ Non payé"}
                  valueClass={diagData.bilan.paye ? "text-emerald-400" : "text-red-400"}
                />
                <Row
                  label="Date paiement"
                  value={diagData.bilan.date_paiement
                    ? new Date(diagData.bilan.date_paiement).toLocaleDateString("fr-FR")
                    : "—"}
                  valueClass="text-white/60"
                />
                <Hint>
                  {formatBilanSummary(diagData.bilan, diagWeek, diagData.impayePrecedent)}
                </Hint>
              </>
            ) : (
              <p className="text-[11px] text-white/40 text-center py-2">Aucun bilan en DB pour S{diagWeek}</p>
            )}
          </Card>

          {/* Card 2 — Acomptes & allocations */}
          <Card title="💳 Acomptes & allocations" statusBadge={getAcompteCardStatus(diagData)}>
            {diagData.acomptes.length === 0 ? (
              <p className="text-[11px] text-white/40 text-center py-2">Aucun acompte pour ce patron</p>
            ) : (
              <div className="space-y-3">
                {diagData.acomptes.map((ac) => {
                  const allocs = diagData.allocations.filter((a) => a.acompte_id === ac.id);
                  const totalAlloue = allocs.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
                  const solde = parseFloat(ac.montant || 0) - totalAlloue;
                  return (
                    <div key={ac.id} className="border-t border-white/10 pt-2 first:border-0 first:pt-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[12px] font-black text-white">
                          {new Date(ac.date_acompte).toLocaleDateString("fr-FR")}
                        </span>
                        <span className="text-[12px] font-black text-yellow-300 font-mono">
                          {parseFloat(ac.montant || 0).toFixed(2)} €
                        </span>
                      </div>
                      {allocs.length === 0 ? (
                        <p className="text-[10px] text-white/30 pl-3">Aucune allocation</p>
                      ) : (
                        allocs.map((al, i) => (
                          <div key={i} className="flex justify-between pl-3 text-[11px]">
                            <span className="text-white/50">↳ S{al.periode_index}</span>
                            <span className="font-mono text-white/70">{parseFloat(al.amount).toFixed(2)} €</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between pl-3 text-[11px] mt-0.5">
                        <span className="text-white/40">Solde non alloué</span>
                        <span className={`font-mono font-black ${Math.abs(solde) < 0.01 ? "text-emerald-400" : "text-yellow-300"}`}>
                          {solde.toFixed(2)} €
                        </span>
                      </div>
                      <Hint>{formatAcompteAllocationSummary(ac, diagData.allocations)}</Hint>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Card 3 — Frais KM détaillés */}
          <Card
            title={`🚗 Frais KM — S${diagWeek} (${isoWeekStart(parseInt(diagWeek))} → ${isoWeekEnd(parseInt(diagWeek))})`}
            statusBadge={getKmCardStatus(diagData)}
          >
            {diagData.fraisKm.length === 0 ? (
              <p className="text-[11px] text-white/40 text-center py-2">Aucun frais KM en DB pour cette semaine</p>
            ) : (
              <>
                {diagData.fraisKm.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-white/50 shrink-0">
                      {new Date(f.date_frais).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="text-white/60 font-mono">
                      {parseFloat(f.distance_km).toFixed(1)} km × {parseFloat(f.rate_per_km).toFixed(2)} €
                    </span>
                    <span className="font-black font-mono text-white shrink-0">
                      {parseFloat(f.amount).toFixed(2)} €
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-white/10 pt-2 mt-1 text-[11px]">
                  <span className="text-white/50 font-black uppercase tracking-wider">Total</span>
                  <span className="font-black font-mono text-yellow-300">
                    {diagData.fraisKm.reduce((s, f) => s + parseFloat(f.distance_km || 0), 0).toFixed(1)} km
                    {" · "}
                    {diagData.fraisKm.reduce((s, f) => s + parseFloat(f.amount || 0), 0).toFixed(2)} €
                  </span>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

// ── Sous-composants UI ─────────────────────────────────────────────────────

const STATUS_BADGE_CFG = {
  ok:       { label: "OK",        cls: "text-emerald-400 border-emerald-500/40 bg-emerald-600/10" },
  warning:  { label: "Vigilance", cls: "text-orange-400  border-orange-500/40  bg-orange-600/10" },
  critical: { label: "Critique",  cls: "text-red-400     border-red-500/40     bg-red-600/10"    },
};

function GlobalStatusCard({ status, summary }) {
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

function AnomaliesCard({ anomalies, title = "Anomalies détectées" }) {
  return (
    <div className="p-4 rounded-[20px] border border-yellow-600/20 bg-[#0A1628]/60 backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/70">{title}</p>
        <span className={`text-sm font-black ${anomalies.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
          {anomalies.length}
        </span>
      </div>
      {anomalies.length === 0 ? (
        <p className="text-[12px] text-emerald-400/80">Aucune anomalie détectée.</p>
      ) : (
        <ul className="space-y-1.5">
          {anomalies.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                a.severity === "critical"
                  ? "bg-red-600/20 text-red-400 border border-red-500/30"
                  : "bg-orange-600/20 text-orange-400 border border-orange-500/30"
              }`}>
                {a.severity === "critical" ? "Critique" : "Vigilance"}
              </span>
              <span className="text-[12px] text-white/70 leading-snug">{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HumanSummaryCard({ diagData, diagWeek }) {
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

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2 px-1">
      <div className="flex-1 h-px bg-white/10" />
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 shrink-0">{children}</p>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function Card({ title, badge, badgeClass = "text-white", statusBadge, children }) {
  const sbCfg = statusBadge ? STATUS_BADGE_CFG[statusBadge] : null;
  return (
    <div className="p-4 rounded-[20px] border border-yellow-600/20 bg-[#0A1628]/60 backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/70">{title}</p>
        <div className="flex items-center gap-2">
          {sbCfg && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${sbCfg.cls}`}>
              {sbCfg.label}
            </span>
          )}
          {badge !== undefined && (
            <span className={`text-sm font-black ${badgeClass}`}>{badge}</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, valueClass = "text-white" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/50 uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-mono font-black ${valueClass}`}>{value}</span>
    </div>
  );
}

function Hint({ children }) {
  return (
    <p className="text-[10px] text-white/35 italic leading-snug pt-0.5 border-t border-white/5 mt-1">
      {children}
    </p>
  );
}

// ── Utilitaires de diagnostic ─────────────────────────────────────────────

function getDiagnosticStatus({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
  if (kmEnabled && (!Number.isFinite(domLat) || !Number.isFinite(domLng))) return "critical";
  if (lieuxSansCoords.length >= 3) return "critical";
  if (lieuxSansCoords.length > 0 || lieuxSuspects.length > 0) return "warning";
  if (kmEnabled && nbSansFraisKm > 0) return "warning";
  return "ok";
}

function getDiagnosticSummary({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
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

function getStaticAnomalies({ kmEnabled, domLat, domLng, lieuxSansCoords, lieuxSuspects, nbSansFraisKm }) {
  const anomalies = [];
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

function getDiagDataAnomalies(diagData, diagWeek) {
  const anomalies = [];
  const bilan = diagData.bilan;

  // Semaine payée avec reste > 0
  if (bilan?.paye && parseFloat(bilan.reste_a_percevoir || 0) > 0.01) {
    anomalies.push({
      severity: "critical",
      message: `S${diagWeek} marquée payée mais reste à percevoir de ${parseFloat(bilan.reste_a_percevoir).toFixed(2)} € en base.`,
    });
  }

  // Acomptes sans allocation
  const acomptesSansAlloc = diagData.acomptes.filter(
    (ac) => !diagData.allocations.some((al) => al.acompte_id === ac.id)
  );
  if (acomptesSansAlloc.length > 0) {
    anomalies.push({
      severity: "warning",
      message: `${acomptesSansAlloc.length} acompte${pluralFr(acomptesSansAlloc.length, "", "s")} sans aucune allocation associée.`,
    });
  }

  // Acomptes sur-alloués
  const acomptesOverAlloues = diagData.acomptes.filter((ac) => {
    const totalAlloue = diagData.allocations
      .filter((al) => al.acompte_id === ac.id)
      .reduce((s, al) => s + parseFloat(al.amount || 0), 0);
    return totalAlloue > parseFloat(ac.montant || 0) + 0.01;
  });
  if (acomptesOverAlloues.length > 0) {
    anomalies.push({
      severity: "critical",
      message: `${acomptesOverAlloues.length} acompte${pluralFr(acomptesOverAlloues.length, "", "s")} sur-alloué${pluralFr(acomptesOverAlloues.length, "", "s")} (total allocations > montant).`,
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

function getBilanCardStatus(diagData) {
  if (diagData.queryErrors?.some((e) => e.startsWith("Bilan:"))) return "critical";
  if (!diagData.bilan) return "warning";
  if (diagData.bilan.paye && parseFloat(diagData.bilan.reste_a_percevoir || 0) > 0.01) return "critical";
  if (diagData.impayePrecedent > 0.01) return "warning";
  return "ok";
}

function getAcompteCardStatus(diagData) {
  if (diagData.queryErrors?.some((e) => e.startsWith("Acomptes:") || e.startsWith("Allocations:"))) return "critical";
  const overAlloue = diagData.acomptes.some((ac) => {
    const total = diagData.allocations
      .filter((al) => al.acompte_id === ac.id)
      .reduce((s, al) => s + parseFloat(al.amount || 0), 0);
    return total > parseFloat(ac.montant || 0) + 0.01;
  });
  if (overAlloue) return "critical";
  const sansAlloc = diagData.acomptes.some(
    (ac) => !diagData.allocations.some((al) => al.acompte_id === ac.id)
  );
  if (sansAlloc) return "warning";
  return "ok";
}

function getKmCardStatus(diagData) {
  if (diagData.queryErrors?.some((e) => e.startsWith("Frais KM:"))) return "critical";
  if (diagData.fraisKm.length === 0) return "warning";
  return "ok";
}

function getHumanDiagnosticSummary(diagData, diagWeek) {
  if (!diagData) return [];
  const sentences = [];
  const bilan = diagData.bilan;
  const wk = parseInt(diagWeek, 10);

  // Phrase 1 : état du bilan
  if (!bilan) {
    sentences.push(`Aucun bilan enregistré pour S${diagWeek}.`);
  } else if (bilan.paye) {
    const dateStr = bilan.date_paiement
      ? new Date(bilan.date_paiement).toLocaleDateString("fr-FR")
      : null;
    sentences.push(`La semaine S${diagWeek} est soldée${dateStr ? ` le ${dateStr}` : ""}.`);
    if (parseFloat(bilan.reste_a_percevoir || 0) > 0.01) {
      sentences.push(
        `Attention : elle est marquée payée mais un reste de ${parseFloat(bilan.reste_a_percevoir).toFixed(2)} € subsiste en base.`
      );
    }
  } else {
    const reste = parseFloat(bilan.reste_a_percevoir || 0);
    if (reste > 0.01) {
      sentences.push(`La semaine S${diagWeek} reste impayée (${reste.toFixed(2)} € à percevoir).`);
    } else {
      sentences.push(`S${diagWeek} n'est pas marquée payée mais le reste à percevoir est nul.`);
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
        const semaines = allAllocsForAc.map((al) => `S${al.periode_index}`).join(", ");
        sentences.push(
          `Un acompte de ${parseFloat(ac.montant || 0).toFixed(2)} € a été alloué sur ${semaines}.`
        );
      }
    } else {
      const totalCouvert = allocsThisWeek.reduce((s, al) => s + parseFloat(al.amount || 0), 0);
      sentences.push(
        `${acompteIds.length} acomptes couvrent ${totalCouvert.toFixed(2)} € sur S${diagWeek}.`
      );
    }
  } else if (diagData.acomptes.length > 0) {
    sentences.push(`Aucun acompte n'est alloué à S${diagWeek}.`);
  } else {
    sentences.push("Aucun acompte enregistré pour ce patron.");
  }

  // Phrase 3 : impayé précédent
  if (diagData.impayePrecedent > 0.01) {
    sentences.push(
      `Un impayé antérieur de ${diagData.impayePrecedent.toFixed(2)} € est reporté sur cette période.`
    );
  }

  return sentences;
}

function buildDiagnosticClipboardText(diagData, diagWeek, patronNom) {
  const lines = [];
  lines.push(`Patron : ${patronNom || "—"}`);
  lines.push(`Semaine : ${diagWeek}`);
  lines.push("");

  if (diagData.bilan) {
    lines.push(`CA brut : ${parseFloat(diagData.bilan.ca_brut_periode || 0).toFixed(2)} €`);
    lines.push(`Impayé précédent : ${diagData.impayePrecedent.toFixed(2)} €`);
    lines.push(`Statut payé : ${diagData.bilan.paye ? "Oui" : "Non"}`);
    lines.push(`Reste à percevoir : ${parseFloat(diagData.bilan.reste_a_percevoir || 0).toFixed(2)} €`);
  } else {
    lines.push("Bilan : absent");
  }

  lines.push("");
  lines.push("Acomptes :");
  if (diagData.acomptes.length === 0) {
    lines.push("- Aucun acompte");
  } else {
    diagData.acomptes.forEach((ac) => {
      lines.push(
        `- ${new Date(ac.date_acompte).toLocaleDateString("fr-FR")} : ${parseFloat(ac.montant || 0).toFixed(2)} €`
      );
    });
  }

  lines.push("");
  lines.push("Allocations :");
  if (diagData.allocations.length === 0) {
    lines.push("- Aucune allocation");
  } else {
    diagData.allocations.forEach((al) => {
      lines.push(`- S${al.periode_index} : ${parseFloat(al.amount || 0).toFixed(2)} €`);
    });
  }

  lines.push("");
  lines.push("Frais KM :");
  if (diagData.fraisKm.length === 0) {
    lines.push("- 0 ligne");
  } else {
    diagData.fraisKm.forEach((f) => {
      lines.push(
        `- ${new Date(f.date_frais).toLocaleDateString("fr-FR")} : ${parseFloat(f.distance_km).toFixed(1)} km — ${parseFloat(f.amount).toFixed(2)} €`
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

function formatAcompteAllocationSummary(acompte, allocations) {
  const allocs = allocations.filter((a) => a.acompte_id === acompte.id);
  if (allocs.length === 0) return "Aucune allocation — acompte non affecté à une semaine.";
  const semaines = allocs.map((a) => `S${a.periode_index}`).join(", ");
  const totalAlloue = allocs.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const montant = parseFloat(acompte.montant || 0);
  const solde = montant - totalAlloue;
  if (Math.abs(solde) < 0.01) return `Alloué intégralement sur ${semaines}.`;
  if (solde > 0) return `Alloué sur ${semaines} · solde non affecté : ${solde.toFixed(2)} €.`;
  return `Sur-alloué sur ${semaines} (dépassement de ${Math.abs(solde).toFixed(2)} €).`;
}

function formatBilanSummary(bilan, diagWeek, impayePrecedent) {
  if (!bilan) return `Aucun bilan enregistré pour S${diagWeek}.`;
  const reste = parseFloat(bilan.reste_a_percevoir || 0);
  if (bilan.paye) {
    const dateStr = bilan.date_paiement
      ? new Date(bilan.date_paiement).toLocaleDateString("fr-FR")
      : "date inconnue";
    return `S${diagWeek} soldée le ${dateStr}.`;
  }
  if (reste > 0.01) {
    const cause = impayePrecedent > 0.01
      ? `dont ${impayePrecedent.toFixed(2)} € d'impayé antérieur`
      : "aucun acompte ne couvre entièrement la semaine";
    return `S${diagWeek} reste impayée (${reste.toFixed(2)} € restants — ${cause}).`;
  }
  return `S${diagWeek} à jour, pas de reste à percevoir.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns singular suffix when count === 1, plural suffix otherwise. */
function pluralFr(count, singular, plural) {
  return count !== 1 ? plural : singular;
}

/** ISO week number → Monday date string (YYYY-MM-DD). */
function isoWeekStart(wk, year = new Date().getFullYear()) {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const d = new Date(jan4);
  d.setDate(jan4.getDate() - (dow - 1) + (wk - 1) * 7);
  return d.toISOString().slice(0, 10);
}

/** ISO week number → Sunday date string (YYYY-MM-DD). */
function isoWeekEnd(wk, year) {
  const d = new Date(isoWeekStart(wk, year));
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

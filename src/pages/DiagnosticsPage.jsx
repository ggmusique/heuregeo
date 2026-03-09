import React, { useState } from "react";
import { isSuspectLieu } from "../utils/suspectCoords";
import { getKmEnabled } from "../utils/kmSettings";
import { supabase } from "../services/supabase";

/**
 * DiagnosticsPage — Vue admin/dev pour diagnostiquer les problèmes KM/GPS.
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
            .select("id, montant, date_acompte, note")
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

      const impayePrecedent = (precedentsRes.data || []).reduce(
        (sum, r) => sum + Math.max(0, parseFloat(r.reste_a_percevoir) || 0), 0
      );

      setDiagData({
        bilan: bilanRes.data,
        impayePrecedent,
        acomptes: acomptesRes.data || [],
        allocations: allocRes.data || [],
        fraisKm: fraisRes.data || [],
      });
    } catch (err) {
      setDiagError(err.message);
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-400 space-y-4">
      <div className="mb-4 text-center">
        <p className="text-[11px] font-black uppercase opacity-40 tracking-[0.25em] mb-2">
          Admin / Dev
        </p>
        <h2 className="text-2xl font-black text-[#C9A84C] italic font-['Playfair_Display'] mb-1">
          Diagnostics KM / GPS
        </h2>
        <p className="text-[11px] opacity-50">Vue réservée admin · non visible des viewers</p>
      </div>

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

      {/* KM Enabled */}
      <Card title="Frais kilométriques">
        <Row label="kmEnabled" value={String(kmEnabled)} valueClass={kmEnabled ? "text-emerald-400" : "text-red-400"} />
        <Row label="Source" value={kmEnabledSource} valueClass="text-white/60 text-xs" />
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
      </Card>

      {/* Lieux sans coords */}
      <Card
        title="Lieux sans coordonnées GPS"
        badge={lieuxSansCoords.length}
        badgeClass={lieuxSansCoords.length > 0 ? "text-red-400" : "text-emerald-400"}
      >
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

      {/* Actions */}
      <Card title="Actions">
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

      {/* ── Diagnostic financier ─────────────────────── */}
      <p className="text-[11px] font-black uppercase opacity-40 px-2 tracking-[0.25em] text-center pt-2">
        Diagnostic financier
      </p>

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

      {/* Résultats */}
      {diagData && (
        <>
          {/* Card 1 — Bilan */}
          <Card title={`🔎 Bilan S${diagWeek}`}>
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
              </>
            ) : (
              <p className="text-[11px] text-white/40 text-center py-2">Aucun bilan en DB pour S{diagWeek}</p>
            )}
          </Card>

          {/* Card 2 — Acomptes & allocations */}
          <Card title="💳 Acomptes & allocations">
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
                          {ac.note ? <span className="font-normal text-white/50 ml-1 text-[10px]">{ac.note}</span> : null}
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
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Card 3 — Frais KM détaillés */}
          <Card title={`🚗 Frais KM — S${diagWeek} (${isoWeekStart(parseInt(diagWeek))} → ${isoWeekEnd(parseInt(diagWeek))})`}>
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

function Card({ title, badge, badgeClass = "text-white", children }) {
  return (
    <div className="p-4 rounded-[20px] border border-yellow-600/20 bg-[#0A1628]/60 backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/70">{title}</p>
        {badge !== undefined && (
          <span className={`text-sm font-black ${badgeClass}`}>{badge}</span>
        )}
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

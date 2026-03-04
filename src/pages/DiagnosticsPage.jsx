import React, { useState } from "react";
import { isSuspectLieu } from "../utils/suspectCoords";
import { getKmEnabled } from "../utils/kmSettings";

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

import React, { useEffect, useMemo, useState } from "react";
import { CompteTab } from "./CompteTab";
import { DonneesTab } from "./DonneesTab";
import { AdminPage } from "./AdminPage";
import { EUROPE_COUNTRIES, KM_RATES } from "../utils/kmRatesByCountry";
import { geocodeAddress } from "../utils/geocode";

export function ParametresTab({
  profile,
  profileSaving,
  saveProfile,
  userEmail,
  darkMode,
  isAdmin,
  isPro = false,
  patrons,
  clients,
  lieux,
  missions,
  fraisDivers,
  acomptes,
  onPatronEdit,
  onPatronDelete,
  onPatronAdd,
  onClientEdit,
  onClientDelete,
  onClientAdd,
  onLieuEdit,
  onLieuDelete,
  onLieuAdd,
  showMissionRateEditor = true,
  onToggleMissionRateEditor = () => {},
}) {
  const [activePanel, setActivePanel] = useState(null);

  const sections = useMemo(
    () => [
      {
        key: "profil",
        icon: "👤",
        title: "Profil",
        subtitle: "Identite, coordonnees et compte",
      },
      {
        key: "donnees",
        icon: "🗂️",
        title: "Donnees",
        subtitle: `${patrons.length} patrons • ${clients.length} clients • ${lieux.length} lieux`,
      },
      {
        key: "extra-pro",
        icon: "✨",
        title: "Extra option payante (Pro)",
        subtitle: "Fonctionnalites avancees reservees aux comptes Pro",
      },
      ...(isAdmin
        ? [
            {
              key: "admin",
              icon: "🛡️",
              title: "Admin",
              subtitle: "Configuration avancee et supervision",
            },
          ]
        : []),
    ],
    [isAdmin, patrons.length, clients.length, lieux.length]
  );

  const activeSection = sections.find((item) => item.key === activePanel) || null;

  useEffect(() => {
    if (activePanel && !sections.some((item) => item.key === activePanel)) {
      setActivePanel(null);
    }
  }, [sections, activePanel]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-4 items-start">
        <aside className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 px-2">Sections</p>
          {sections.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePanel(item.key)}
              aria-label={`Ouvrir section ${item.title}`}
              className="w-full text-left rounded-xl border px-3 py-3 transition-all bg-white/5 border-white/10 hover:border-white/25"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{item.icon}</span>
                <span className="text-[12px] font-black uppercase tracking-widest text-white">{item.title}</span>
              </div>
              <p className="text-[11px] text-white/60 leading-snug">{item.subtitle}</p>
            </button>
          ))}
        </aside>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3 min-h-[260px]">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">Parametres</h2>
          <p className="text-sm text-white/60">
            Hub central: choisissez une section dans le menu de gauche pour ouvrir une fenetre dediee.
          </p>
          <div className="rounded-xl border border-dashed border-white/20 p-4 text-white/55 text-sm">
            Exemples: Profil, Donnees, Extra option payante (Pro), Admin.
          </div>
        </div>
      </div>

      {activeSection && (
        <div className="fixed inset-0 z-[300] bg-black/65 backdrop-blur-sm p-3 sm:p-6">
          <div className="max-w-6xl mx-auto h-full rounded-2xl border border-white/15 bg-[#070d1c] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-2 text-white">
                <span>{activeSection.icon}</span>
                <p className="font-black uppercase tracking-wider text-sm">{activeSection.title}</p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-xs font-black uppercase tracking-widest"
              >
                Fermer
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-4">
              {activePanel === "profil" && (
                <div className="space-y-4">
                  <CompteTab profile={profile} saving={profileSaving} onSave={saveProfile} userEmail={userEmail} />
                </div>
              )}

              {activePanel === "extra-pro" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/80 mb-2">Extra option payante (Pro)</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/70">Afficher le sélecteur "taux du jour" dans Saisie</p>
                      <button
                        type="button"
                        onClick={() => onToggleMissionRateEditor((prev) => !prev)}
                        className={"px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " + (showMissionRateEditor ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-white/20 text-white/60") }
                      >
                        {showMissionRateEditor ? "Activé" : "Désactivé"}
                      </button>
                    </div>
                  </div>

                  {/* Frais kilométriques */}
                  <KmSettingsPanel profile={profile} saveProfile={saveProfile} isPro={isPro} />
                </div>
              )}

              {activePanel === "donnees" && (
                <DonneesTab
                  patrons={patrons}
                  clients={clients}
                  lieux={lieux}
                  missions={missions}
                  fraisDivers={fraisDivers}
                  acomptes={acomptes}
                  darkMode={darkMode}
                  onPatronEdit={onPatronEdit}
                  onPatronDelete={onPatronDelete}
                  onPatronAdd={onPatronAdd}
                  onClientEdit={onClientEdit}
                  onClientDelete={onClientDelete}
                  onClientAdd={onClientAdd}
                  onLieuEdit={onLieuEdit}
                  onLieuDelete={onLieuDelete}
                  onLieuAdd={onLieuAdd}
                  defaultOpenPatrons={false}
                  allowClientActions={false}
                  allowLieuActions={false}
                />
              )}

              {activePanel === "admin" && isAdmin && <AdminPage darkMode={darkMode} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function KmSettingsPanel({ profile, saveProfile, isPro }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [kmEnable, setKmEnable] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return ks.enabled ?? f.km_enabled ?? f.km_enable ?? false;
  });
  const [kmIncludeRetour, setKmIncludeRetour] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_include_retour ?? ks.roundTrip ?? false;
  });
  const [kmDomicileAdresse, setKmDomicileAdresse] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_domicile_address || ks.homeLabel || "";
  });
  const [kmCountryCode, setKmCountryCode] = useState(() => {
    const f = profile?.features ?? {};
    const ks = f.km_settings ?? {};
    return f.km_country || ks.countryCode || "FR";
  });
  const [kmRateMode, setKmRateMode] = useState(() => profile?.features?.km_rate_mode || "AUTO_BY_COUNTRY");
  const [kmRate, setKmRate] = useState(() => profile?.features?.km_rate_custom ?? "");

  useEffect(() => {
    if (!profile) return;
    const f = profile.features ?? {};
    const ks = f.km_settings ?? {};
    setKmEnable(ks.enabled ?? f.km_enabled ?? f.km_enable ?? false);
    setKmIncludeRetour(f.km_include_retour ?? ks.roundTrip ?? false);
    setKmDomicileAdresse(f.km_domicile_address || ks.homeLabel || "");
    setKmCountryCode(f.km_country || ks.countryCode || "FR");
    setKmRateMode(f.km_rate_mode || "AUTO_BY_COUNTRY");
    setKmRate(f.km_rate_custom ?? "");
  }, [profile]);

  const recommendedRate = KM_RATES[kmCountryCode] || 0.42;
  const countryLabel = EUROPE_COUNTRIES.find((c) => c.code === kmCountryCode)?.label || kmCountryCode;

  const hasDomicileInProfile = !!(profile?.adresse || profile?.ville);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const prevFeatures = profile?.features ?? {};

    // Geocode the domicile address and persist coords to avoid re-geocoding on every load
    let kmDomicileLat = prevFeatures.km_domicile_lat ?? null;
    let kmDomicileLng = prevFeatures.km_domicile_lng ?? null;
    const addr = (kmDomicileAdresse || "").trim() || [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ");
    if (addr) {
      const geoResult = await geocodeAddress(addr);
      if (geoResult) {
        kmDomicileLat = geoResult.lat;
        kmDomicileLng = geoResult.lng;
      }
    }

    const nextFeatures = {
      ...prevFeatures,
      km_enabled: kmEnable,
      km_enable: undefined, // remove legacy key
      km_country: kmCountryCode,
      km_rate_mode: kmRateMode,
      km_rate_custom: kmRateMode === "CUSTOM" ? parseFloat(kmRate) || null : null,
      km_include_retour: kmIncludeRetour,
      km_domicile_address: kmDomicileAdresse || null,
      km_domicile_lat: kmDomicileLat,
      km_domicile_lng: kmDomicileLng,
      km_settings: {
        ...(prevFeatures.km_settings ?? {}),
        enabled: kmEnable,
        homeLat: kmDomicileLat,
        homeLng: kmDomicileLng,
        homeLabel: kmDomicileAdresse || null,
        ratePerKm: kmRateMode === "CUSTOM" ? parseFloat(kmRate) || null : null,
        roundTrip: kmIncludeRetour,
        countryCode: kmCountryCode,
      },
    };
    const result = await saveProfile({ features: nextFeatures });
    if (result?.error) {
      setSaveError(result.error);
      // Revert toggle state to what was in profile
      setKmEnable(profile?.features?.km_settings?.enabled ?? profile?.features?.km_enabled ?? profile?.features?.km_enable ?? false);
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/80 mb-1">🚗 Frais kilométriques</p>
          {!isPro && (
            <p className="text-[10px] text-yellow-400/80">Fonctionnalité Pro</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setKmEnable((v) => !v)}
          disabled={!isPro}
          className={"px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " + (kmEnable ? "border-blue-400/40 text-blue-300 bg-blue-500/10" : "border-white/20 text-white/60") + (!isPro ? " opacity-50 cursor-not-allowed" : "")}
        >
          {kmEnable ? "Activé" : "Désactivé"}
        </button>
      </div>

      {kmEnable && isPro && (
        <div className="space-y-3">
          {/* Aller/Retour */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/70">Inclure le trajet retour (aller-retour)</p>
            <button
              type="button"
              onClick={() => setKmIncludeRetour((v) => !v)}
              className={"px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " + (kmIncludeRetour ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-white/20 text-white/60")}
            >
              {kmIncludeRetour ? "Aller-Retour" : "Aller seul"}
            </button>
          </div>

          {/* Domicile */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-blue-300/80 tracking-wider">
              Adresse domicile
            </label>
            <input
              type="text"
              value={kmDomicileAdresse}
              onChange={(e) => setKmDomicileAdresse(e.target.value)}
              placeholder={hasDomicileInProfile
                ? [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ")
                : "Ex: Rue de la Paix 1, 75001 Paris"}
              className="w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm bg-black/20 border-white/10 text-white focus:border-blue-500 backdrop-blur-md placeholder:text-white/30"
            />
            {hasDomicileInProfile && !kmDomicileAdresse && (
              <p className="text-[10px] text-white/40 mt-1 italic">
                Si vide, l&apos;adresse du profil sera utilisée.
              </p>
            )}
            {Number.isFinite(Number(profile?.features?.km_domicile_lat)) && Number.isFinite(Number(profile?.features?.km_domicile_lng)) ? (
              <p className="text-[10px] text-green-400 mt-1">✅ Coordonnées GPS enregistrées</p>
            ) : (
              <p className="text-[10px] text-yellow-400/80 mt-1">⚠️ Coordonnées non résolues — enregistrez pour les calculer</p>
            )}
          </div>

          {/* Pays */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-blue-300/80 tracking-wider">
              Pays
            </label>
            <select
              value={kmCountryCode}
              onChange={(e) => { setKmCountryCode(e.target.value); setKmRateMode("AUTO_BY_COUNTRY"); }}
              className="w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm bg-black/20 border-white/10 text-white focus:border-blue-500 backdrop-blur-md"
            >
              {EUROPE_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Taux */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-blue-300/80 tracking-wider">
              Taux kilométrique
            </label>
            {kmRateMode === "AUTO_BY_COUNTRY" ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/10">
                <span className="text-sm text-white/70">
                  Taux recommandé : <strong className="text-blue-300">{recommendedRate} €/km</strong> ({countryLabel})
                </span>
                <button
                  type="button"
                  onClick={() => { setKmRateMode("CUSTOM"); setKmRate(recommendedRate); }}
                  className="text-[10px] font-black uppercase text-purple-300 hover:text-purple-100 transition-all ml-2"
                >
                  Personnaliser
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={kmRate}
                  onChange={(e) => setKmRate(e.target.value)}
                  placeholder={`${recommendedRate}`}
                  className="flex-1 p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm bg-black/20 border-white/10 text-white focus:border-blue-500 backdrop-blur-md placeholder:text-white/30"
                />
                <span className="text-white/60 text-sm">€/km</span>
                <button
                  type="button"
                  onClick={() => setKmRateMode("AUTO_BY_COUNTRY")}
                  className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-all"
                >
                  Auto
                </button>
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-red-400 text-xs font-bold">{saveError}</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase text-[11px] text-white transition-all disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les réglages km"}
          </button>
        </div>
      )}
    </div>
  );
}

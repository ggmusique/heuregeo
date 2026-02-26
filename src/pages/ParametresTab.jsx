import React, { useEffect, useMemo, useState } from "react";
import { CompteTab } from "./CompteTab";
import { DonneesTab } from "./DonneesTab";
import { AdminPage } from "./AdminPage";
import { COUNTRY_RATE_PRESETS, normalizeKmSettings, serializeKmSettings } from "../utils/kmUtils";

export function ParametresTab({
  profile,
  profileSaving,
  saveProfile,
  userEmail,
  darkMode,
  isAdmin,
  isPro,
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
  const [kmSettings, setKmSettings] = useState(() => normalizeKmSettings(profile?.features));
  const [kmSaveMsg, setKmSaveMsg] = useState("");

  useEffect(() => {
    setKmSettings(normalizeKmSettings(profile?.features));
  }, [profile?.features]);

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

  const saveKmSettings = async () => {
    setKmSaveMsg("");
    const existingFeatures = profile?.features || {};
    const payload = {
      ...existingFeatures,
      km_settings: serializeKmSettings(kmSettings),
    };
    const res = await saveProfile({ features: payload });
    if (res?.error) {
      setKmSaveMsg(`❌ ${res.error}`);
      return;
    }
    setKmSaveMsg("✅ Paramètres kilométrage enregistrés.");
  };

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
                  {!isPro && (
                    <div className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4 text-sm text-orange-200">
                      🔒 Ces options sont prévues pour les comptes Pro. Tu peux les préparer maintenant.
                    </div>
                  )}

                  <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-4 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200/80">Extra option payante (Pro)</p>

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

                    <div className="pt-2 border-t border-yellow-400/15 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300/90">Kilométrage GPS (phase 1/2/3)</p>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-white/70">Activer le calcul auto des frais déplacement</p>
                        <button
                          type="button"
                          onClick={() => setKmSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                          className={"px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all " + (kmSettings.enabled ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-white/20 text-white/60") }
                        >
                          {kmSettings.enabled ? "Activé" : "Désactivé"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-xs text-white/70 space-y-1">
                          <span>Pays (phase 3)</span>
                          <select
                            value={kmSettings.countryCode}
                            onChange={(e) => {
                              const nextCountry = e.target.value;
                              setKmSettings((prev) => ({
                                ...prev,
                                countryCode: nextCountry,
                                ratePerKm: COUNTRY_RATE_PRESETS[nextCountry]?.ratePerKm ?? prev.ratePerKm,
                              }));
                            }}
                            className="w-full p-2 rounded-lg bg-black/30 border border-white/20 text-white"
                          >
                            {Object.entries(COUNTRY_RATE_PRESETS).map(([code, preset]) => (
                              <option key={code} value={code}>{preset.label}</option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs text-white/70 space-y-1">
                          <span>Taux €/km (modulable)</span>
                          <input
                            type="number"
                            step="0.0001"
                            value={kmSettings.ratePerKm}
                            onChange={(e) => setKmSettings((prev) => ({ ...prev, ratePerKm: e.target.value }))}
                            className="w-full p-2 rounded-lg bg-black/30 border border-white/20 text-white"
                          />
                        </label>
                      </div>

                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3">
                        <p className="text-[10px] uppercase tracking-widest font-black text-cyan-200/80 mb-2">Barème multi-pays (phase 3)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(COUNTRY_RATE_PRESETS).map(([code, preset]) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setKmSettings((prev) => ({ ...prev, countryCode: code, ratePerKm: preset.ratePerKm }))}
                              className="text-left px-2.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white/80"
                            >
                              <span className="font-black">{preset.label}</span>
                              <span className="opacity-70"> • {preset.ratePerKm.toFixed(4)} €/km</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="text-xs text-white/70 space-y-1 block">
                        <span>Adresse domicile (libellé)</span>
                        <input
                          type="text"
                          value={kmSettings.homeLabel}
                          onChange={(e) => setKmSettings((prev) => ({ ...prev, homeLabel: e.target.value }))}
                          placeholder="Ex: Rue de l'Exemple 12, Namur"
                          className="w-full p-2 rounded-lg bg-black/30 border border-white/20 text-white"
                        />
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-xs text-white/70 space-y-1">
                          <span>Latitude domicile</span>
                          <input
                            type="number"
                            step="any"
                            value={kmSettings.homeLat ?? ""}
                            onChange={(e) => setKmSettings((prev) => ({ ...prev, homeLat: e.target.value }))}
                            className="w-full p-2 rounded-lg bg-black/30 border border-white/20 text-white"
                          />
                        </label>
                        <label className="text-xs text-white/70 space-y-1">
                          <span>Longitude domicile</span>
                          <input
                            type="number"
                            step="any"
                            value={kmSettings.homeLng ?? ""}
                            onChange={(e) => setKmSettings((prev) => ({ ...prev, homeLng: e.target.value }))}
                            className="w-full p-2 rounded-lg bg-black/30 border border-white/20 text-white"
                          />
                        </label>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <input
                          type="checkbox"
                          checked={kmSettings.roundTrip}
                          onChange={(e) => setKmSettings((prev) => ({ ...prev, roundTrip: e.target.checked }))}
                        />
                        Aller-retour automatique (maison → travail → maison)
                      </label>

                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/55">Phase 2: visible dans les bilans • Phase 3: base multi-pays prête</p>
                        <button
                          type="button"
                          onClick={saveKmSettings}
                          className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-cyan-400/40 text-cyan-200 bg-cyan-500/10"
                        >
                          Enregistrer km
                        </button>
                      </div>
                      {!!kmSaveMsg && <p className="text-xs text-white/80">{kmSaveMsg}</p>}
                    </div>
                  </div>
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

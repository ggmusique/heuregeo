import React, { useEffect, useMemo, useState } from "react";
import { CompteTab } from "./CompteTab";
import { DonneesTab } from "./DonneesTab";
import { AdminPage } from "./AdminPage";

export function ParametresTab({
  profile,
  profileSaving,
  saveProfile,
  userEmail,
  darkMode,
  isAdmin,
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
            Exemples: Profil, Donnees, Admin.
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Saisie mission</p>
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
                  <CompteTab profile={profile} saving={profileSaving} onSave={saveProfile} userEmail={userEmail} />
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

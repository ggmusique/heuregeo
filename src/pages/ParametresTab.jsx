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
}) {
  const [section, setSection] = useState("profil");

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

  const activeSection = sections.find((item) => item.key === section);

  useEffect(() => {
    if (!sections.some((item) => item.key === section)) {
      setSection("profil");
    }
  }, [sections, section]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">Parametres</h2>
            <p className="text-xs sm:text-sm text-white/60">Organisation simplifiee: profil, donnees et administration.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-white/15 text-white/50">Hub</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {sections.map((item) => {
            const isActive = item.key === section;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                aria-pressed={isActive}
                aria-label={`Ouvrir section ${item.title}`}
                className={
                  "text-left rounded-xl border px-3 py-3 transition-all " +
                  (isActive
                    ? "bg-indigo-500/20 border-indigo-400/40 shadow-lg"
                    : "bg-black/20 border-white/10 hover:border-white/25")
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[12px] font-black uppercase tracking-widest text-white">{item.title}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-snug">{item.subtitle}</p>
              </button>
            );
          })}
        </div>

        {activeSection && (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[11px] text-white/70">
              <span className="font-black uppercase tracking-widest mr-1">Section active:</span>
              {activeSection.icon} {activeSection.title}
            </p>
          </div>
        )}
      </div>

      {section === "profil" && (
        <CompteTab profile={profile} saving={profileSaving} onSave={saveProfile} userEmail={userEmail} />
      )}

      {section === "donnees" && (
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
        />
      )}

      {section === "admin" && isAdmin && <AdminPage darkMode={darkMode} />}
    </section>
  );
}

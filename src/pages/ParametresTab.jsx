import React, { useState } from "react";
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

  const baseBtn = "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all";
  const activeBtn = "bg-yellow-500/20 border-yellow-400/50 text-yellow-300";
  const idleBtn = "bg-white/5 border-white/10 text-white/70";

  return (
    <section className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-wrap gap-2">
        <button className={`${baseBtn} ${section === "profil" ? activeBtn : idleBtn}`} onClick={() => setSection("profil")}>Profil</button>
        <button className={`${baseBtn} ${section === "donnees" ? activeBtn : idleBtn}`} onClick={() => setSection("donnees")}>Donnees</button>
        {isAdmin && (
          <button className={`${baseBtn} ${section === "admin" ? activeBtn : idleBtn}`} onClick={() => setSection("admin")}>Admin</button>
        )}
      </div>

      {section === "profil" && <CompteTab profile={profile} saving={profileSaving} onSave={saveProfile} userEmail={userEmail} />}

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

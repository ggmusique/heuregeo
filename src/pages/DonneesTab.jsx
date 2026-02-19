import React, { useState } from "react";
import { PatronsManager } from "../components/patron/PatronsManager";
import { ClientsManager } from "../components/client/ClientsManager";
import { LieuxManager } from "../components/lieu/LieuxManager";

export const DonneesTab = ({
  patrons,
  clients,
  lieux,
  missions,
  fraisDivers,
  acomptes,
  darkMode,
  onPatronEdit,
  onPatronDelete,
  onPatronAdd,
  onClientEdit,
  onClientDelete,
  onClientAdd,
  onLieuEdit,
  onLieuDelete,
  onLieuAdd,
}) => {
  const AccordionSection = React.memo(({
    title,
    count,
    children,
    defaultOpen = false,
    disabled = false,
    id = "",
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div
        key={id}
        className={`rounded-[30px] border-2 overflow-hidden ${
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full p-6 flex items-center justify-between text-left transition-all ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{title.split(" ")[0]}</span>
            <div>
              <h3 className="text-lg font-black uppercase">
                {title.split(" ").slice(1).join(" ")}
              </h3>
              <p className="text-xs opacity-60">
                {count} élément{count > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {!disabled && (
            <div
              className={`text-2xl transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </div>
          )}
        </button>
        {isOpen && !disabled && (
          <div className="p-6 border-t border-white/10">{children}</div>
        )}
      </div>
    );
  });

  AccordionSection.displayName = "AccordionSection";

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      <AccordionSection
        id="patrons-section"
        title="👔 Patrons"
        count={patrons.length}
        defaultOpen={true}
      >
        <PatronsManager
          patrons={patrons}
          onEdit={onPatronEdit}
          onDelete={onPatronDelete}
          onAdd={onPatronAdd}
          darkMode={darkMode}
          missions={missions}
          fraisDivers={fraisDivers}
          acomptes={acomptes}
        />
      </AccordionSection>

      <AccordionSection
        id="clients-section"
        title="🏢 Clients"
        count={clients.length}
        defaultOpen={false}
      >
        <ClientsManager
          clients={clients}
          onEdit={onClientEdit}
          onDelete={onClientDelete}
          onAdd={onClientAdd}
          darkMode={darkMode}
          missions={missions}
        />
      </AccordionSection>

      <AccordionSection
        id="lieux-section"
        title="📍 Lieux"
        count={lieux.length}
        defaultOpen={false}
      >
        <LieuxManager
          lieux={lieux}
          missions={missions}
          darkMode={darkMode}
          onAdd={onLieuAdd}
          onEdit={onLieuEdit}
          onDelete={onLieuDelete}
        />
      </AccordionSection>
    </div>
  );
};
import React, { useState } from "react";
import { PatronsManager } from "../components/patron/PatronsManager";
import { ClientsManager } from "../components/client/ClientsManager";
import { LieuxManager } from "../components/lieu/LieuxManager";
import { useLabels } from "../contexts/LabelsContext";
import type { Patron, Client, Lieu, Mission, FraisDivers, Acompte } from "../types/entities";
import type { KmSettings } from "../hooks/useKmDomicile";

interface AccordionSectionProps {
  title: string;
  count?: number;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  id?: string;
}

interface DonneesTabProps {
  patrons: Patron[];
  clients: Client[];
  lieux: Lieu[];
  missions?: Mission[];
  fraisDivers?: FraisDivers[];
  acomptes?: Acompte[];
  darkMode?: boolean;
  onPatronEdit?: (patron: Patron) => void | Promise<void>;
  onPatronDelete?: (patron: Patron) => void | Promise<void>;
  onPatronAdd?: () => void;
  onClientEdit?: (client: Client) => void | Promise<void>;
  onClientDelete?: (client: Client) => void | Promise<void>;
  onClientAdd?: () => void;
  onLieuEdit?: (lieu: Lieu) => void | Promise<void>;
  onLieuDelete?: (lieu: Lieu) => void | Promise<void>;
  onLieuAdd?: () => void;
  defaultOpenPatrons?: boolean;
  allowClientActions?: boolean;
  allowLieuActions?: boolean;
  kmSettings?: KmSettings | null;
  onRegeocoderLieu?: ((id: string, coords: Partial<Lieu>) => Promise<void>) | null;
  deleteAcompte?: ((id: string) => Promise<void>) | null;
  fetchAcomptes?: (() => Promise<any>) | null;
  showConfirm?: ((options?: any) => Promise<boolean>) | null;
  triggerAlert?: ((message: string) => void) | null;
  isViewer?: boolean;
}

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
  defaultOpenPatrons = false,
  allowClientActions = true,
  allowLieuActions = true,
  kmSettings = null,
  onRegeocoderLieu = null,
  deleteAcompte = null,
  fetchAcomptes = null,
  showConfirm = null,
  triggerAlert = null,
  isViewer = false,
}: DonneesTabProps) => {
  const L = useLabels();
  const AccordionSection = React.memo(({
    title,
    count,
    children,
    defaultOpen = false,
    disabled = false,
    id = "",
  }: AccordionSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div
        key={id}
        className="rounded-[30px] border-2 overflow-hidden bg-[var(--color-surface)] border-[var(--color-border)] backdrop-blur-xl"
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
                {count ?? 0} élément{(count ?? 0) > 1 ? "s" : ""}
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
        title={`👔 ${L.patrons}`}
        count={patrons.length}
        defaultOpen={defaultOpenPatrons}
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
          deleteAcompte={deleteAcompte}
          fetchAcomptes={fetchAcomptes}
          showConfirm={showConfirm}
          triggerAlert={triggerAlert}
          isViewer={isViewer}
        />
      </AccordionSection>

      <AccordionSection
        id="clients-section"
        title={`🏢 ${L.clients}`}
        count={clients.length}
        defaultOpen={false}
      >
        <ClientsManager
          clients={clients}
          onEdit={onClientEdit}
          onDelete={onClientDelete}
          onAdd={onClientAdd}
          allowActions={allowClientActions}
          darkMode={darkMode}
          missions={missions}
        />
      </AccordionSection>

      <AccordionSection
        id="lieux-section"
        title={`📍 ${L.lieux}`}
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
          allowActions={allowLieuActions}
          kmSettings={kmSettings}
          onRegeocoderLieu={onRegeocoderLieu}
        />
      </AccordionSection>
    </div>
  );
};
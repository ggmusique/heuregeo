import React, { useState, useRef, useEffect } from "react";
import { useLabels } from "../../contexts/LabelsContext";

interface Props {
  clients?: any[];
  selectedClientId?: string | null;
  onSelect?: (id: string | null) => void;
  required?: boolean;
  /** @deprecated — ignoré, le thème vient de DarkModeContext */
  darkMode?: boolean;
  onAddNew?: (() => void) | null;
}

export const ClientSelector = ({
  clients = [],
  selectedClientId = null,
  onSelect = () => {},
  required = false,
  onAddNew = null,
}: Props) => {
  const L = useLabels();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  useEffect(() => {
    if (selectedClient && !showDropdown) {
      setSearch(selectedClient.nom);
    }
  }, [selectedClient, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);

        if (selectedClient) {
          setSearch(selectedClient.nom);
        } else {
          setSearch("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedClient]);

  const handleSelect = (client: any) => {
    onSelect(client.id);
    setSearch(client.nom);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setShowDropdown(true);

    if (!e.target.value) {
      onSelect(null);
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    setSearch("");
  };

  return (
    <div className="relative">
      <label className="block text-[10px] font-black uppercase mb-2 text-[var(--color-text-muted)] tracking-wider opacity-80">
        {L.client} {required && <span className="text-red-400">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="🏢 Rechercher ou sélectionner..."
          className="w-full p-4 pr-12 rounded-2xl font-bold outline-none border-2 transition-[border-color,background-color] duration-150 bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)] placeholder:text-[var(--color-text-dim)]"
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />

        {onAddNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--color-accent-violet)] hover:opacity-80 rounded-lg flex items-center justify-center text-white font-black text-lg transition-[opacity,transform] duration-150 active:scale-90"
            title="Nouveau client"
          >
            +
          </button>
        )}
      </div>

        {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-modal bg-[var(--color-surface)] border-[var(--color-border)]"
        >
          {filteredClients.length > 0 ? (
            <div className="p-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-3 rounded-xl transition-[background-color,color] duration-150 ${
                    client.id === selectedClientId
                      ? "bg-[var(--color-accent-violet)] text-white"
                      : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                  }`}
                >
                  <div className="font-bold">{client.nom}</div>

                  {client.lieu_travail && (
                    <div className="text-xs opacity-60 mt-1 line-clamp-1">
                      📍 {client.lieu_travail}
                    </div>
                  )}
                  {client.contact && (
                    <div className="text-xs opacity-60 mt-0.5">
                      📞 {client.contact}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm opacity-60">Aucun client trouvé</p>

              {onAddNew && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="mt-2 text-xs text-[var(--color-accent-violet)] hover:opacity-80 font-bold transition-opacity"
                >
                  + Créer "{search}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {selectedClient && !showDropdown && (
        <div className="mt-2 p-3 bg-[var(--color-accent-violet)]/10 rounded-xl border border-[var(--color-accent-violet)]/20">
          <div className="text-xs font-bold text-[var(--color-text)]">
            ✓ {selectedClient.nom}
          </div>

          {selectedClient.lieu_travail && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-start gap-1">
              <span>📍</span>
              <span className="flex-1">{selectedClient.lieu_travail}</span>
            </div>
          )}

          {selectedClient.contact && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
              📞 {selectedClient.contact}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

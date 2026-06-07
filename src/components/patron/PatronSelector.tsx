import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLabels } from "../../contexts/LabelsContext";
import { Button } from "../ui/Button";

interface PatronSelectorProps {
  patrons?: any[];
  selectedPatronId?: string | null;
  onSelect?: (id: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  darkMode?: boolean;
  onAddNew?: () => void;
}

export function PatronSelector({ patrons = [], selectedPatronId, onSelect, required = false, disabled = false, darkMode = true, onAddNew }: PatronSelectorProps) {
  const L = useLabels();
  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  return (
    <div>
      <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
        {L.patron} {required && "*"}
      </label>

      {patrons.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm opacity-60 mb-4">Aucun patron créé</p>
          {onAddNew && (
            <Button variant="primary" size="sm" onClick={onAddNew}>+ Créer un patron</Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 mb-3">
            {patrons.map((patron) => (
                <button
                  key={patron.id}
                  type="button"
                  onClick={() => onSelect?.(patron.id)}
                  disabled={disabled}
                  className={`p-4 rounded-[20px] flex items-center gap-3 transition-[background-color,border-color,color] duration-150 ${
                    selectedPatronId === patron.id
                      ? "bg-[var(--color-accent-violet)]/15 border-2 border-[var(--color-accent-violet)]/50"
                      : "bg-[var(--color-surface-offset)] border-2 border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                  } disabled:opacity-50 active:scale-95`}
                >
                <div className="w-6 h-6 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: patron.couleur || "#8b5cf6" }} />
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm uppercase">{patron.nom}</p>
                  {patron.taux_horaire != null && <p className="text-[10px] opacity-60">{patron.taux_horaire}€/h</p>}
                </div>
                {selectedPatronId === patron.id && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          {onAddNew && (
            <Button variant="outline" fullWidth size="sm" disabled={disabled} onClick={onAddNew}>+ Nouveau patron</Button>
          )}
        </>
      )}
    </div>
  );
}

interface PatronSelectorCompactProps {
  patrons?: any[];
  selectedPatronId?: string | null;
  onSelect?: (id: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
  onAddNew?: () => void;
}

export function PatronSelectorCompact({ patrons = [], selectedPatronId, onSelect, required = false, disabled = false, darkMode = true, className = "", onAddNew }: PatronSelectorCompactProps) {
  const L = useLabels();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPatron = useMemo(() => patrons.find((p) => p.id === selectedPatronId), [patrons, selectedPatronId]);

  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) onSelect?.(patrons[0].id);
  }, [required, selectedPatronId, patrons, onSelect]);

  const filteredPatrons = patrons.filter((patron) => patron.nom.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (selectedPatron && !showDropdown) setSearch(selectedPatron.nom);
  }, [selectedPatron, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearch(selectedPatron ? selectedPatron.nom : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedPatron]);

  const handleSelect = (patron: any) => { onSelect?.(patron.id); setSearch(patron.nom); setShowDropdown(false); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) onSelect?.(null); };
  const handleInputFocus = () => { if (disabled) return; setShowDropdown(true); setSearch(""); };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-[10px] font-black uppercase mb-2 text-[var(--color-accent-violet)] tracking-wider opacity-80">
        {L.patron} {required && <span className="text-[var(--color-accent-red)]">*</span>}
      </label>

      <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="👔 Rechercher ou sélectionner..."
            className={`w-full p-4 pr-12 rounded-2xl font-bold outline-none border-2 transition-[border-color] duration-150 bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)] placeholder:text-[var(--color-text-dim)] ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            value={search}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
          />
        {onAddNew && (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onAddNew(); }} className="w-8 h-8 p-0" title="Nouveau patron" disabled={disabled}>+</Button>
        )}
      </div>

      {showDropdown && !disabled && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-modal bg-[var(--color-surface)] border-[var(--color-border)] backdrop-blur-card">
          {filteredPatrons.length > 0 ? (
            filteredPatrons.map((patron) => (
              <button key={patron.id} type="button" className={`w-full p-4 text-left transition-[background] duration-150 border-b border-[var(--color-border)] last:border-b-0 ${selectedPatronId === patron.id ? "bg-[var(--color-accent-violet)]/15" : "hover:bg-[var(--color-surface-hover)]"}`} onClick={() => handleSelect(patron)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm uppercase truncate">{patron.nom}</div>
                    <div className="text-[10px] opacity-60">{patron.taux_horaire != null ? `${patron.taux_horaire}€/h` : "Taux non défini"}</div>
                  </div>
                  <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: patron.couleur || "#8b5cf6" }} />
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm opacity-60">{search ? "Aucun patron trouvé" : "Aucun patron disponible"}</div>
          )}
        </div>
      )}

      {selectedPatron && !showDropdown && (
        <div className="mt-3 p-3 rounded-xl border bg-[var(--color-accent-violet)]/10 border-[var(--color-accent-violet)]/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedPatron.couleur || "#8b5cf6" }} />
            <span className="text-[10px] font-black uppercase opacity-60 tracking-wider">{L.patron} sélectionné</span>
          </div>
          <p className="text-sm font-black mt-1 uppercase">{selectedPatron.nom}</p>
          {selectedPatron.taux_horaire != null && <p className="text-[11px] opacity-70 mt-1">Taux horaire : {selectedPatron.taux_horaire}€/h</p>}
        </div>
      )}
    </div>
  );
}

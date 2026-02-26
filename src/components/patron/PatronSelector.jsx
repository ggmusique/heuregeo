import React, { useEffect, useMemo, useRef, useState } from "react";

export function PatronSelector({
  patrons = [],
  selectedPatronId,
  onSelect,
  required = false,
  disabled = false,
  darkMode = true,
  onAddNew,
}) {
  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  return (
    <div>
      <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
        Patron {required && "*"}
      </label>

      {patrons.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm opacity-60 mb-4">Aucun patron créé</p>
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all"
            >
              + Créer un patron
            </button>
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
                className={`p-4 rounded-[20px] flex items-center gap-3 transition-all ${
                  selectedPatronId === patron.id
                    ? darkMode
                      ? "bg-white/20 border-2 border-white/40"
                      : "bg-indigo-100 border-2 border-indigo-500"
                    : darkMode
                    ? "bg-white/5 border-2 border-white/10 hover:bg-white/10"
                    : "bg-slate-100 border-2 border-slate-200 hover:bg-slate-200"
                } disabled:opacity-50 active:scale-95`}
              >
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 shadow-lg"
                  style={{ backgroundColor: patron.couleur || "#8b5cf6" }}
                />
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm uppercase">{patron.nom}</p>
                  {patron.taux_horaire != null && (
                    <p className="text-[10px] opacity-60">{patron.taux_horaire}€/h</p>
                  )}
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
            <button
              type="button"
              onClick={onAddNew}
              disabled={disabled}
              className={`w-full py-3 rounded-[20px] font-black uppercase text-[10px] transition-all border-2 border-dashed ${
                darkMode
                  ? "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                  : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900"
              } disabled:opacity-50 active:scale-95`}
            >
              + Nouveau patron
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function PatronSelectorCompact({
  patrons = [],
  selectedPatronId,
  onSelect,
  required = false,
  disabled = false,
  darkMode = true,
  className = "",
  onAddNew,
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedPatron = useMemo(
    () => patrons.find((p) => p.id === selectedPatronId),
    [patrons, selectedPatronId]
  );

  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  const filteredPatrons = patrons.filter((patron) =>
    patron.nom.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (selectedPatron && !showDropdown) {
      setSearch(selectedPatron.nom);
    }
  }, [selectedPatron, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setSearch(selectedPatron ? selectedPatron.nom : "");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedPatron]);

  const handleSelect = (patron) => {
    onSelect?.(patron.id);
    setSearch(patron.nom);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) onSelect?.(null);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setShowDropdown(true);
    setSearch("");
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
        Patron {required && <span className="text-red-400">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="👔 Rechercher ou sélectionner..."
          className={`w-full p-4 pr-12 rounded-2xl font-bold outline-none border-2 transition-all ${
            darkMode
              ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
              : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
          } backdrop-blur-md placeholder:text-white/40 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
        />

        {onAddNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center text-white font-black text-lg transition-all active:scale-90"
            title="Nouveau patron"
            disabled={disabled}
          >
            +
          </button>
        )}
      </div>

      {showDropdown && !disabled && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-2xl ${
            darkMode
              ? "bg-[#1a1f2e] border-indigo-500/40"
              : "bg-white border-slate-300"
          } backdrop-blur-xl`}
        >
          {filteredPatrons.length > 0 ? (
            filteredPatrons.map((patron) => (
              <button
                key={patron.id}
                type="button"
                className={`w-full p-4 text-left transition-all border-b border-white/5 last:border-b-0 ${
                  selectedPatronId === patron.id
                    ? darkMode
                      ? "bg-indigo-600/30"
                      : "bg-indigo-100"
                    : darkMode
                    ? "hover:bg-white/10"
                    : "hover:bg-slate-100"
                }`}
                onClick={() => handleSelect(patron)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm uppercase truncate">{patron.nom}</div>
                    <div className="text-[10px] opacity-60">
                      {patron.taux_horaire != null ? `${patron.taux_horaire}€/h` : "Taux non défini"}
                    </div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-lg"
                    style={{ backgroundColor: patron.couleur || "#8b5cf6" }}
                  />
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm opacity-60">
              {search ? "Aucun patron trouvé" : "Aucun patron disponible"}
            </div>
          )}
        </div>
      )}

      {selectedPatron && !showDropdown && (
        <div
          className={`mt-3 p-3 rounded-xl border ${
            darkMode ? "bg-indigo-900/20 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedPatron.couleur || "#8b5cf6" }}
            />
            <span className="text-[10px] font-black uppercase opacity-60 tracking-wider">Patron sélectionné</span>
          </div>
          <p className="text-sm font-black mt-1 uppercase">{selectedPatron.nom}</p>
          {selectedPatron.taux_horaire != null && (
            <p className="text-[11px] opacity-70 mt-1">Taux horaire : {selectedPatron.taux_horaire}€/h</p>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";

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
  const [open, setOpen] = useState(false);

  const selectedPatron = useMemo(
    () => patrons.find((p) => p.id === selectedPatronId),
    [patrons, selectedPatronId]
  );

  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  const filtered = useMemo(() => {
    if (!search.trim()) return patrons;
    return patrons.filter((p) =>
      p.nom.toLowerCase().includes(search.toLowerCase())
    );
  }, [patrons, search]);

  const handleSelect = (id) => {
    onSelect?.(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative ${className}`}> 
      <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
        Patron {required && "*"}
      </label>

      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-[20px] border-2 transition-all cursor-pointer ${
          darkMode
            ? "bg-white/10 border-white/20 hover:border-indigo-400"
            : "bg-slate-100 border-slate-300 hover:border-indigo-500"
        } ${open ? (darkMode ? "border-indigo-400" : "border-indigo-500") : ""}`} 
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        {selectedPatron ? (
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 shadow"
            style={{ backgroundColor: selectedPatron.couleur || "#8b5cf6" }}
          />
        ) : (
          <span className="text-lg">👤</span>
        )}

        <span className={`flex-1 text-sm font-semibold truncate ${!selectedPatron ? "opacity-40" : ""}`}> 
          {selectedPatron
            ? `${selectedPatron.nom}${selectedPatron.taux_horaire != null ? ` — ${selectedPatron.taux_horaire}€/h` : ""}`
            : required ? "Rechercher ou sélectionner un patron *" : "Rechercher ou sélectionner un patron"}
        </span>

        {onAddNew && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddNew(); }}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white font-black text-lg transition-all active:scale-90 flex-shrink-0"
          >
            +
          </button>
        )}

        <svg
          className={`w-4 h-4 opacity-50 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-[20px] shadow-2xl border overflow-hidden ${
            darkMode ? "bg-[#1a1f2e] border-white/15" : "bg-white border-slate-200"
          }`}
        >
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              autoFocus
              className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${
                darkMode
                  ? "bg-white/10 text-white placeholder-white/40 border border-white/10"
                  : "bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200"
              }`}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm opacity-50 text-center">Aucun résultat</div>
            ) : (
              filtered.map((patron) => (
                <button
                  key={patron.id}
                  type="button"
                  onClick={() => handleSelect(patron.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    selectedPatronId === patron.id
                      ? darkMode ? "bg-indigo-600/40" : "bg-indigo-100"
                      : darkMode ? "hover:bg-white/10" : "hover:bg-slate-100"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow"
                    style={{ backgroundColor: patron.couleur || "#8b5cf6" }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold">{patron.nom}</div>
                    {patron.taux_horaire != null && (
                      <div className="text-[10px] opacity-50">{patron.taux_horaire}€/h</div>
                    )}
                  </div>
                  {selectedPatronId === patron.id && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
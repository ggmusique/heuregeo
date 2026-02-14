import React, { useEffect, useMemo } from "react";

/**
 * Composant pour sélectionner un patron dans un formulaire
 * - Version "cartes" (boutons)
 * - Multi-patrons
 */
export function PatronSelector({
  patrons = [],                 // ✅ safe: évite patrons undefined
  selectedPatronId,
  onSelect,
  required = false,
  disabled = false,
  darkMode = true,
  onAddNew,
}) {
  // ✅ Micro UX : si required et un seul patron, on le sélectionne automatiquement
  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  return (
    <div>
      {/* Label */}
      <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
        Patron {required && "*"}
      </label>

      {/* Aucun patron */}
      {patrons.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm opacity-60 mb-4">Aucun patron créé</p>

          {/* Bouton création */}
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
          {/* Liste de patrons (cartes) */}
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
                {/* Pastille couleur */}
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 shadow-lg"
                  style={{ backgroundColor: patron.couleur || "#8b5cf6" }} // ✅ fallback couleur
                />

                {/* Infos patron */}
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm uppercase">{patron.nom}</p>

                  {/* Taux horaire si présent */}
                  {patron.taux_horaire != null && (
                    <p className="text-[10px] opacity-60">
                      {patron.taux_horaire}€/h
                    </p>
                  )}
                </div>

                {/* Checkmark si sélectionné */}
                {selectedPatronId === patron.id && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Bouton ajouter nouveau */}
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

/**
 * Version compacte pour sélection rapide (dropdown)
 * - Ajoute une pastille couleur du patron sélectionné
 * - Améliore le padding pour ne pas recouvrir le texte
 */
export function PatronSelectorCompact({
  patrons = [],                 // ✅ safe
  selectedPatronId,
  onSelect,
  required = false,
  disabled = false,
  darkMode = true,
  className = "",
}) {
  // ✅ Patron sélectionné (memo pour éviter recalcul)
  const selectedPatron = useMemo(
    () => patrons.find((p) => p.id === selectedPatronId),
    [patrons, selectedPatronId]
  );

  // ✅ Micro UX : si required et un seul patron, on auto-sélectionne
  useEffect(() => {
    if (required && !selectedPatronId && patrons.length === 1) {
      onSelect?.(patrons[0].id);
    }
  }, [required, selectedPatronId, patrons, onSelect]);

  return (
    <div className={className}>
      <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
        Patron {required && "*"}
      </label>

      <div className="relative">
        <select
          value={selectedPatronId || ""}
          onChange={(e) => onSelect?.(e.target.value || null)}
          disabled={disabled}
          className={`w-full px-5 py-4 pr-10 rounded-[20px] text-base font-semibold transition-all outline-none appearance-none ${
            // ✅ si pastille affichée, on décale le texte à gauche
            selectedPatron ? "pl-10" : "pl-5"
          } ${
            darkMode
              ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:bg-white/15"
              : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"
          } disabled:opacity-50`}
        >
          <option value="">
            {required ? "Sélectionner un patron *" : "Sélectionner un patron"}
          </option>

          {patrons.map((patron) => (
            <option key={patron.id} value={patron.id}>
              {patron.nom}
              {patron.taux_horaire != null ? ` (${patron.taux_horaire}€/h)` : ""}
            </option>
          ))}
        </select>

        {/* Icône dropdown */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Pastille couleur du patron sélectionné */}
        {selectedPatron && (
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-sm"
            style={{ backgroundColor: selectedPatron.couleur || "#8b5cf6" }}
            title={selectedPatron.nom}
          />
        )}
      </div>
    </div>
  );
}

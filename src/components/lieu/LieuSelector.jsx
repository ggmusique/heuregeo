import React, { useState, useRef, useEffect, useMemo } from "react";

/**
 * Sélecteur de lieu avec autocomplete
 * Version intelligente : filtre par historique du client
 */
export const LieuSelector = ({
  lieux = [],
  selectedLieuId = null,
  onSelect = () => {},
  required = false,
  darkMode = true,
  onAddNew = null,
  // NOUVEAUX PROPS
  selectedClientId = null,
  missions = [], // Pour l'historique
}) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Obtenir le lieu sélectionné
  const selectedLieu = lieux.find((l) => l.id === selectedLieuId);

  // Calculer les lieux utilisés pour ce client (avec fréquence)
  const lieuxHistorique = useMemo(() => {
    if (!selectedClientId || missions.length === 0) return [];

    // Filtrer missions du client
    const missionsClient = missions.filter(
      (m) => m.client_id === selectedClientId && m.lieu_id
    );

    // Compter la fréquence d'utilisation de chaque lieu
    const frequence = {};
    missionsClient.forEach((m) => {
      frequence[m.lieu_id] = (frequence[m.lieu_id] || 0) + 1;
    });

    // Retourner les IDs triés par fréquence
    return Object.entries(frequence)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);
  }, [selectedClientId, missions]);

  // Filtrer et trier les lieux
  const filteredLieux = useMemo(() => {
    let filtered = lieux;

    // Filtrer par recherche
    if (search) {
      filtered = filtered.filter(
        (lieu) =>
          lieu.nom.toLowerCase().includes(search.toLowerCase()) ||
          lieu.adresse_complete?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Séparer les lieux en 2 groupes
    const lieuxHistoriqueSet = new Set(lieuxHistorique);
    const lieuxDuClient = filtered.filter((l) => lieuxHistoriqueSet.has(l.id));
    const autresLieux = filtered.filter((l) => !lieuxHistoriqueSet.has(l.id));

    // Retourner : d'abord lieux du client (triés par fréquence), puis les autres
    return [
      ...lieuxDuClient.sort(
        (a, b) => lieuxHistorique.indexOf(a.id) - lieuxHistorique.indexOf(b.id)
      ),
      ...autresLieux.sort((a, b) => a.nom.localeCompare(b.nom)),
    ];
  }, [lieux, search, lieuxHistorique]);

  // Afficher le nom du lieu sélectionné dans l'input
  useEffect(() => {
    if (selectedLieu && !showDropdown) {
      setSearch(selectedLieu.nom);
    }
  }, [selectedLieu, showDropdown]);

  // Gérer le clic en dehors pour fermer le dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        if (selectedLieu) {
          setSearch(selectedLieu.nom);
        } else {
          setSearch("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLieu]);

  const handleSelect = (lieu) => {
    onSelect(lieu.id);
    setSearch(lieu.nom);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
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

  // Compter le nombre de missions par lieu pour ce client
  const getMissionCount = (lieuId) => {
    if (!selectedClientId) return 0;
    return missions.filter(
      (m) => m.client_id === selectedClientId && m.lieu_id === lieuId
    ).length;
  };

  return (
    <div className="relative">
      {/* Label */}
      <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-80">
        Lieu {required && <span className="text-red-400">*</span>}
      </label>

      {/* Input avec autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="📍 Rechercher ou sélectionner..."
          className={`w-full p-4 pr-12 rounded-2xl font-bold outline-none border-2 transition-all ${
            darkMode
              ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
              : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
          } backdrop-blur-md placeholder:text-white/40`}
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />

        {/* Bouton "Nouveau lieu" */}
        {onAddNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center text-white font-black text-lg transition-all active:scale-90"
            title="Nouveau lieu"
          >
            +
          </button>
        )}
      </div>

      {/* Dropdown des lieux */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-2xl ${
            darkMode
              ? "bg-[#1a1f2e] border-purple-500/40"
              : "bg-white border-slate-200"
          } backdrop-blur-xl`}
        >
          {filteredLieux.length > 0 ? (
            <div className="p-2">
              {/* Section : Lieux de ce client */}
              {lieuxHistorique.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[10px] font-black uppercase text-green-400 opacity-60">
                    ✓ Lieux habituels pour ce client
                  </div>
                  {filteredLieux
                    .filter((l) => lieuxHistorique.includes(l.id))
                    .map((lieu) => (
                      <button
                        key={lieu.id}
                        type="button"
                        onClick={() => handleSelect(lieu)}
                        className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                          lieu.id === selectedLieuId
                            ? "bg-purple-600 text-white"
                            : darkMode
                            ? "hover:bg-green-600/20 text-white border border-green-500/30"
                            : "hover:bg-green-100 text-slate-900 border border-green-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold">{lieu.nom}</div>
                          <div className="text-xs bg-green-600/30 px-2 py-0.5 rounded-full">
                            {getMissionCount(lieu.id)}x
                          </div>
                        </div>
                        {lieu.adresse_complete && (
                          <div className="text-xs opacity-60 mt-1 line-clamp-1">
                            📍 {lieu.adresse_complete}
                          </div>
                        )}
                      </button>
                    ))}
                </>
              )}

              {/* Section : Autres lieux */}
              {filteredLieux.filter((l) => !lieuxHistorique.includes(l.id))
                .length > 0 && (
                <>
                  {lieuxHistorique.length > 0 && (
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-white/40 opacity-60 mt-2">
                      Autres lieux
                    </div>
                  )}
                  {filteredLieux
                    .filter((l) => !lieuxHistorique.includes(l.id))
                    .map((lieu) => (
                      <button
                        key={lieu.id}
                        type="button"
                        onClick={() => handleSelect(lieu)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          lieu.id === selectedLieuId
                            ? "bg-purple-600 text-white"
                            : darkMode
                            ? "hover:bg-white/10 text-white"
                            : "hover:bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="font-bold">{lieu.nom}</div>
                        {lieu.adresse_complete && (
                          <div className="text-xs opacity-60 mt-1 line-clamp-1">
                            📍 {lieu.adresse_complete}
                          </div>
                        )}
                      </button>
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm opacity-60">Aucun lieu trouvé</p>
              {onAddNew && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-bold"
                >
                  + Créer "{search}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Affichage du lieu sélectionné */}
      {selectedLieu && !showDropdown && (
        <div className="mt-2 p-3 bg-purple-600/20 rounded-xl border border-purple-500/30">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>✓ {selectedLieu.nom}</span>
            {selectedClientId && getMissionCount(selectedLieu.id) > 0 && (
              <span className="text-[10px] bg-green-600/30 px-2 py-0.5 rounded-full">
                {getMissionCount(selectedLieu.id)} missions ici
              </span>
            )}
          </div>
          {selectedLieu.adresse_complete && (
            <div className="text-[10px] text-white/60 mt-1 line-clamp-2">
              {selectedLieu.adresse_complete}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

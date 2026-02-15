import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/**
 * ✅ Sélecteur de lieu avec autocomplete - VERSION UUID
 * 
 * IMPORTANT : Tous les IDs sont des UUID (strings)
 * - lieu_id : UUID string
 * - client_id : UUID string
 * 
 * Fonctionnalités :
 * - Filtrage par recherche (nom + adresse)
 * - Priorise les lieux déjà utilisés par le client (historique)
 * - Bouton + pour créer un nouveau lieu
 */
export const LieuSelector = ({
  lieux = [],
  selectedLieuId = null,
  onSelect = () => {},
  required = false,
  darkMode = true,
  onAddNew = null,

  selectedClientId = null,
  missions = [],
}) => {
  // ========= STATE UI =========
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ========= SAFE ARRAYS =========
  const lieuxArray = useMemo(() => (Array.isArray(lieux) ? lieux : []), [lieux]);
  const missionsArray = useMemo(
    () => (Array.isArray(missions) ? missions : []),
    [missions]
  );

  // ========= ✅ NORMALISATION IDs (UUID = strings) =========
  const selectedLieuIdStr = useMemo(
    () => (selectedLieuId == null ? null : String(selectedLieuId)),
    [selectedLieuId]
  );

  const selectedClientIdStr = useMemo(
    () => (selectedClientId == null ? null : String(selectedClientId)),
    [selectedClientId]
  );

  // ========= LIEU SÉLECTIONNÉ =========
  const selectedLieu = useMemo(() => {
    if (selectedLieuIdStr == null) return null;
    return lieuxArray.find((l) => String(l?.id) === selectedLieuIdStr) || null;
  }, [lieuxArray, selectedLieuIdStr]);

  // ========= NORMALISATION RECHERCHE =========
  const searchNorm = useMemo(() => search.trim().toLowerCase(), [search]);

  // ========= HISTORIQUE CLIENT (IDs triés par fréquence) =========
  const lieuxHistorique = useMemo(() => {
    if (selectedClientIdStr == null || missionsArray.length === 0) return [];

    // Filtrer missions du client + avec lieu_id
    const missionsClient = missionsArray.filter((m) => {
      const cid = m?.client_id == null ? null : String(m.client_id);
      const lid = m?.lieu_id == null ? null : String(m.lieu_id);
      return cid === selectedClientIdStr && lid != null;
    });

    // Compter fréquence d'utilisation par lieu_id
    const frequence = {};
    missionsClient.forEach((m) => {
      const lid = String(m.lieu_id);
      frequence[lid] = (frequence[lid] || 0) + 1;
    });

    // IDs triés du plus utilisé au moins utilisé (strings)
    return Object.entries(frequence)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => String(id));
  }, [selectedClientIdStr, missionsArray]);

  const lieuxHistoriqueSet = useMemo(
    () => new Set(lieuxHistorique),
    [lieuxHistorique]
  );

  // ========= COUNT MISSIONS PAR LIEU =========
  const missionCountByLieu = useMemo(() => {
    if (selectedClientIdStr == null) return {};

    const map = {};
    missionsArray.forEach((m) => {
      const cid = m?.client_id == null ? null : String(m.client_id);
      const lid = m?.lieu_id == null ? null : String(m.lieu_id);

      if (cid === selectedClientIdStr && lid != null) {
        map[lid] = (map[lid] || 0) + 1;
      }
    });

    return map;
  }, [missionsArray, selectedClientIdStr]);

  const getMissionCount = useCallback(
    (lieuId) => {
      if (selectedClientIdStr == null) return 0;
      const idStr = lieuId == null ? null : String(lieuId);
      if (idStr == null) return 0;
      return missionCountByLieu[idStr] || 0;
    },
    [selectedClientIdStr, missionCountByLieu]
  );

  // ========= FILTRAGE + TRI DES LIEUX =========
  const filteredLieux = useMemo(() => {
    let filtered = lieuxArray;

    // Filtrer par recherche
    if (searchNorm) {
      filtered = filtered.filter((lieu) => {
        const nom = (lieu?.nom || "").toLowerCase();
        const adresse = (lieu?.adresse_complete || "").toLowerCase();
        return nom.includes(searchNorm) || adresse.includes(searchNorm);
      });
    }

    // Séparer lieux du client vs autres
    const lieuxDuClient = filtered.filter((l) =>
      lieuxHistoriqueSet.has(String(l?.id))
    );
    const autresLieux = filtered.filter(
      (l) => !lieuxHistoriqueSet.has(String(l?.id))
    );

    // Tri lieux du client = par fréquence
    lieuxDuClient.sort(
      (a, b) =>
        lieuxHistorique.indexOf(String(a?.id)) -
        lieuxHistorique.indexOf(String(b?.id))
    );

    // Tri autres = alphabétique
    autresLieux.sort((a, b) => (a?.nom || "").localeCompare(b?.nom || ""));

    return [...lieuxDuClient, ...autresLieux];
  }, [lieuxArray, searchNorm, lieuxHistorique, lieuxHistoriqueSet]);

  // ========= SYNC INPUT AVEC SÉLECTION =========
  useEffect(() => {
    if (selectedLieu && !showDropdown) {
      setSearch(selectedLieu.nom || "");
    }
  }, [selectedLieu, showDropdown]);

  useEffect(() => {
    if (showDropdown) setSearch("");
  }, [selectedClientIdStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========= CLICK OUTSIDE =========
  useEffect(() => {
    const handleClickOutside = (event) => {
      const drop = dropdownRef.current;
      const inp = inputRef.current;

      if (
        drop &&
        !drop.contains(event.target) &&
        inp &&
        !inp.contains(event.target)
      ) {
        setShowDropdown(false);

        if (selectedLieu) setSearch(selectedLieu.nom || "");
        else setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLieu]);

  // ========= ACTIONS =========
  const handleSelect = (lieu) => {
    // ✅ UUID : renvoyer string tel quel
    onSelect(lieu?.id || null);
    setSearch(lieu?.nom || "");
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setShowDropdown(true);

    if (!value) onSelect(null);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    setSearch("");
  };

  // ========= GROUPES POUR RENDER =========
  const lieuxDuClientList = useMemo(
    () => filteredLieux.filter((l) => lieuxHistoriqueSet.has(String(l?.id))),
    [filteredLieux, lieuxHistoriqueSet]
  );

  const autresLieuxList = useMemo(
    () => filteredLieux.filter((l) => !lieuxHistoriqueSet.has(String(l?.id))),
    [filteredLieux, lieuxHistoriqueSet]
  );

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
              {/* ✅ Section : Lieux habituels */}
              {lieuxDuClientList.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[10px] font-black uppercase text-green-400 opacity-60">
                    ✓ Lieux habituels pour ce client
                  </div>

                  {lieuxDuClientList.map((lieu) => {
                    const idStr = String(lieu?.id);
                    return (
                      <button
                        key={lieu.id}
                        type="button"
                        onClick={() => handleSelect(lieu)}
                        className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                          idStr === selectedLieuIdStr
                            ? "bg-purple-600 text-white"
                            : darkMode
                            ? "hover:bg-green-600/20 text-white border border-green-500/30"
                            : "hover:bg-green-100 text-slate-900 border border-green-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold">{lieu.nom}</div>
                          <div className="text-xs bg-green-600/30 px-2 py-0.5 rounded-full">
                            {getMissionCount(idStr)}x
                          </div>
                        </div>

                        {lieu.adresse_complete && (
                          <div className="text-xs opacity-60 mt-1 line-clamp-1">
                            📍 {lieu.adresse_complete}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* ✅ Section : Autres lieux */}
              {autresLieuxList.length > 0 && (
                <>
                  {lieuxDuClientList.length > 0 && (
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-white/40 opacity-60 mt-2">
                      Autres lieux
                    </div>
                  )}

                  {autresLieuxList.map((lieu) => {
                    const idStr = String(lieu?.id);
                    return (
                      <button
                        key={lieu.id}
                        type="button"
                        onClick={() => handleSelect(lieu)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          idStr === selectedLieuIdStr
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
                    );
                  })}
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

            {selectedClientIdStr != null && getMissionCount(selectedLieu.id) > 0 && (
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
import React, { useState, useRef, useEffect } from "react";

/**
 * Sélecteur de client avec autocomplete
 * Version compacte pour MissionForm
 */
export const ClientSelector = ({
  clients = [],
  selectedClientId = null,
  onSelect = () => {},
  required = false,
  darkMode = true,
  onAddNew = null, // Fonction pour ouvrir le modal d'ajout
}) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filtrer les clients selon la recherche
  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(search.toLowerCase())
  );

  // Obtenir le client sélectionné
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Afficher le nom du client sélectionné dans l'input
  useEffect(() => {
    if (selectedClient && !showDropdown) {
      setSearch(selectedClient.nom);
    }
  }, [selectedClient, showDropdown]);

  // Gérer le clic en dehors pour fermer le dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
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

  const handleSelect = (client) => {
    onSelect(client.id);
    setSearch(client.nom);
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setShowDropdown(true);
    // Si on efface, désélectionner
    if (!e.target.value) {
      onSelect(null);
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    setSearch(""); // Vider pour voir toute la liste
  };

  return (
    <div className="relative">
      {/* Label */}
      <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
        Client {required && <span className="text-red-400">*</span>}
      </label>

      {/* Input avec autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="🏢 Rechercher ou sélectionner..."
          className={`w-full p-4 pr-12 rounded-2xl font-bold outline-none border-2 transition-all ${
            darkMode
              ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
              : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
          } backdrop-blur-md placeholder:text-white/40`}
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />

        {/* Bouton "Nouveau client" si fonction fournie */}
        {onAddNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddNew();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center text-white font-black text-lg transition-all active:scale-90"
            title="Nouveau client"
          >
            +
          </button>
        )}
      </div>

      {/* Dropdown des clients */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-2xl ${
            darkMode
              ? "bg-[#1a1f2e] border-indigo-500/40"
              : "bg-white border-slate-200"
          } backdrop-blur-xl`}
        >
          {filteredClients.length > 0 ? (
            <div className="p-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    client.id === selectedClientId
                      ? "bg-indigo-600 text-white"
                      : darkMode
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-slate-100 text-slate-900"
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
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  + Créer "{search}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Affichage du client sélectionné (en dessous) */}
      {selectedClient && !showDropdown && (
        <div className="mt-2 p-3 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
          <div className="text-xs font-bold text-white">
            ✓ {selectedClient.nom}
          </div>
          {selectedClient.lieu_travail && (
            <div className="text-[10px] text-white/60 mt-1 flex items-start gap-1">
              <span>📍</span>
              <span className="flex-1">{selectedClient.lieu_travail}</span>
            </div>
          )}
          {selectedClient.contact && (
            <div className="text-[10px] text-white/60 mt-1">
              📞 {selectedClient.contact}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

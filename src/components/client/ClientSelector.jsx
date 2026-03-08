import React, { useState, useRef, useEffect } from "react";
import { useLabels } from "../../contexts/LabelsContext";

/**
 * ✅ ClientSelector = champ "Client" avec recherche + liste déroulante (autocomplete)
 *
 * 🎯 Objectif :
 * - Tu tapes “in…” -> il filtre les clients
 * - Tu cliques un client -> ça remplit le champ + ça renvoie son ID au parent (MissionForm)
 * - Option : bouton + pour ouvrir la modal "Nouveau client"
 */
export const ClientSelector = ({
  clients = [],              // 👈 liste complète des clients (depuis useClients)
  selectedClientId = null,   // 👈 ID du client déjà choisi (si édition ou sélection existante)
  onSelect = () => {},       // 👈 callback: onSelect(clientId) -> remonte au parent
  required = false,          // 👈 affiche l’étoile rouge
  darkMode = true,           // 👈 styles sombre/clair
  onAddNew = null,           // 👈 si fourni: affiche le bouton "+" pour créer un client
}) => {
  const L = useLabels();
  // ✅ Texte tapé dans l’input (sert aussi à afficher le nom sélectionné)
  const [search, setSearch] = useState("");

  // ✅ Affiche/masque la liste déroulante
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ Références DOM pour détecter les clics “en dehors”
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  /**
   * ✅ Liste filtrée selon ce que tu tapes
   * Exemple: search="geo" -> garde les clients dont le nom contient "geo"
   */
  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(search.toLowerCase())
  );

  /**
   * ✅ Le client actuellement sélectionné (objet complet)
   * Ça permet ensuite d’afficher: nom, lieu, contact...
   */
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  /**
   * ✅ Quand un client est sélectionné ET que le dropdown est fermé :
   * on affiche son nom dans l’input
   *
   * (Sinon, si dropdown ouvert, on laisse ce que l’utilisateur tape)
   */
  useEffect(() => {
    if (selectedClient && !showDropdown) {
      setSearch(selectedClient.nom);
    }
  }, [selectedClient, showDropdown]);

  /**
   * ✅ Fermer le dropdown si tu cliques en dehors
   * - si un client est sélectionné -> remet son nom dans l’input
   * - sinon -> vide l’input
   */
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

  /**
   * ✅ Quand on clique un client dans la liste :
   * - on remonte son ID au parent (MissionForm)
   * - on remplit l’input avec son nom
   * - on ferme la liste
   */
  const handleSelect = (client) => {
    onSelect(client.id);
    setSearch(client.nom);
    setShowDropdown(false);
  };

  /**
   * ✅ Quand on tape dans l’input :
   * - met à jour search
   * - ouvre la liste
   * - si on efface tout -> on désélectionne le client (onSelect(null))
   */
  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setShowDropdown(true);

    if (!e.target.value) {
      onSelect(null);
    }
  };

  /**
   * ✅ Quand on clique dans le champ :
   * - ouvre la liste
   * - vide le champ pour voir toute la liste directement
   * (c’est un choix UX, certains préfèrent garder le texte)
   */
  const handleInputFocus = () => {
    setShowDropdown(true);
    setSearch("");
  };

  return (
    <div className="relative">
      {/* ✅ LABEL du champ */}
      <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
        {L.client} {required && <span className="text-red-400">*</span>}
      </label>

      {/* ✅ INPUT + bouton "+" */}
      <div className="relative">
        <input
          ref={inputRef} // 👈 utilisé pour détecter les clics en dehors
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

        {/* ✅ Bouton "+" : ouvre la modal "Nouveau client"
            (seulement si onAddNew existe) */}
        {onAddNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // 👈 évite que le clic déclenche d’autres trucs autour
              onAddNew();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center text-white font-black text-lg transition-all active:scale-90"
            title="Nouveau client"
          >
            +
          </button>
        )}
      </div>

      {/* ✅ DROPDOWN = la liste affichée quand showDropdown=true */}
      {showDropdown && (
        <div
          ref={dropdownRef} // 👈 utilisé pour détecter clic dehors
          className={`absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border-2 shadow-2xl ${
            darkMode
              ? "bg-[#1a1f2e] border-indigo-500/40"
              : "bg-white border-slate-200"
          } backdrop-blur-xl`}
        >
          {/* ✅ Cas 1: des résultats */}
          {filteredClients.length > 0 ? (
            <div className="p-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    client.id === selectedClientId
                      ? "bg-indigo-600 text-white" // 👈 client déjà choisi
                      : darkMode
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-slate-100 text-slate-900"
                  }`}
                >
                  {/* Nom */}
                  <div className="font-bold">{client.nom}</div>

                  {/* Infos bonus (si présentes) */}
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
            /* ✅ Cas 2: aucun résultat */
            <div className="p-4 text-center">
              <p className="text-sm opacity-60">Aucun client trouvé</p>

              {/* Option: proposer de créer un client avec le texte tapé */}
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

      {/* ✅ Petit bloc sous le champ quand un client est choisi
          (et dropdown fermé) */}
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

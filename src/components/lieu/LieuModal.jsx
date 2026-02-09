import React, { useState, useEffect } from "react";

/**
 * Modal de gestion des lieux
 * Créer ou modifier un lieu avec coordonnées GPS optionnelles
 */
export const LieuModal = ({
  show,
  editMode = false,
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
  onGetGPS = null, // Fonction pour obtenir GPS
}) => {
  const [nom, setNom] = useState("");
  const [adresseComplete, setAdresseComplete] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Remplir le formulaire en mode édition
  useEffect(() => {
    if (editMode && initialData) {
      setNom(initialData.nom || "");
      setAdresseComplete(initialData.adresse_complete || "");
      setLatitude(initialData.latitude?.toString() || "");
      setLongitude(initialData.longitude?.toString() || "");
      setNotes(initialData.notes || "");
    } else {
      // Reset en mode création
      setNom("");
      setAdresseComplete("");
      setLatitude("");
      setLongitude("");
      setNotes("");
    }
  }, [editMode, initialData, show]);

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
          setGpsLoading(false);

          // Optionnel : Reverse geocoding pour obtenir l'adresse
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          )
            .then((res) => res.json())
            .then((data) => {
              if (data.display_name) {
                setAdresseComplete(data.display_name);
              }
            })
            .catch(() => {
              // Ignore les erreurs de geocoding
            });
        },
        (error) => {
          setGpsLoading(false);
          alert("Impossible d'obtenir votre position");
        }
      );
    } else {
      alert("Géolocalisation non disponible");
    }
  };

  const handleSubmit = () => {
    if (!nom.trim()) {
      alert("Le nom du lieu est obligatoire");
      return;
    }

    onSubmit({
      nom: nom.trim(),
      adresse_complete: adresseComplete.trim() || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      notes: notes.trim() || null,
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      <div
        className={`w-full max-w-md p-8 rounded-[40px] border-2 ${
          darkMode
            ? "bg-[#121420] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        <h3 className="text-xl font-black uppercase mb-6 text-center italic">
          {editMode ? "Modifier le lieu" : "Nouveau Lieu"}
        </h3>

        {/* Nom (OBLIGATOIRE) */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
            Nom du lieu <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Bureau Intel Liège"
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
            } backdrop-blur-md`}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
          />
        </div>

        {/* Adresse complète (OPTIONNEL) */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-green-300 tracking-wider opacity-80">
            Adresse complète (optionnel)
          </label>
          <textarea
            placeholder="Rue, ville, pays..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-green-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500"
            } backdrop-blur-md`}
            value={adresseComplete}
            onChange={(e) => setAdresseComplete(e.target.value)}
            rows={2}
          />
        </div>

        {/* Coordonnées GPS */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-black uppercase text-purple-300 tracking-wider opacity-80">
              Coordonnées GPS (optionnel)
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                gpsLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 active:scale-95"
              } text-white`}
            >
              {gpsLoading ? "⏳ GPS..." : "📍 Position actuelle"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.000001"
              placeholder="Latitude"
              className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md`}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <input
              type="number"
              step="0.000001"
              placeholder="Longitude"
              className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md`}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        {/* Notes (OPTIONNEL) */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase mb-2 text-cyan-300 tracking-wider opacity-80">
            Notes (optionnel)
          </label>
          <textarea
            placeholder="Informations supplémentaires..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-cyan-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
            } backdrop-blur-md`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black backdrop-blur-md hover:bg-white/10 transition-all"
          >
            ANNULER
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nom.trim()}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black text-white backdrop-blur-md transition-all ${
              loading || !nom.trim()
                ? "bg-gray-600 opacity-50 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {editMode ? "MODIFIER" : "CRÉER"}
          </button>
        </div>

        {/* Note en bas */}
        <p className="text-[9px] text-white/40 text-center mt-4">
          <span className="text-red-400">*</span> Champ obligatoire
        </p>
      </div>
    </div>
  );
};

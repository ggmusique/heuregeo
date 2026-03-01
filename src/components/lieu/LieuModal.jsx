import React, { useState, useEffect, useCallback } from "react";

/**
 * ✅ LieuModal - VERSION CLEAN
 * 
 * Champs :
 * - nom (ville - obligatoire)
 * - adresse_complete (optionnel)
 * - latitude, longitude (optionnel, pour GPS futur)
 * - notes (optionnel)
 */
export const LieuModal = ({
  show = false,
  editMode = false,
  initialData = null,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  darkMode = true,
}) => {
  const [formData, setFormData] = useState({
    nom: "",
    adresse_complete: "",
    latitude: "",
    longitude: "",
    notes: "",
  });
  const [locating, setLocating] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");

  // Remplir le formulaire en mode édition
  useEffect(() => {
    if (show && editMode && initialData) {
      setFormData({
        nom: initialData.nom || "",
        adresse_complete: initialData.adresse_complete || "",
        latitude: initialData.latitude || "",
        longitude: initialData.longitude || "",
        notes: initialData.notes || "",
      });
    } else if (show && !editMode) {
      setFormData({
        nom: initialData?.nom || "",
        adresse_complete: initialData?.adresse_complete || "",
        latitude: "",
        longitude: "",
        notes: initialData?.notes || "",
      });
    }
    setGpsMsg("");
  }, [show, editMode, initialData]);

  const useCurrentPosition = useCallback(() => {
    if (!navigator?.geolocation) {
      setGpsMsg("❌ Géolocalisation non supportée sur cet appareil.");
      return;
    }
    setLocating(true);
    setGpsMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "fr", "User-Agent": "HeuresDeGeo/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const label =
              addr.road && (addr.city || addr.town || addr.village)
                ? `${addr.road}, ${addr.city || addr.town || addr.village}`
                : data?.display_name?.split(", ").slice(0, 3).join(", ");
            if (label) {
              setFormData((prev) => ({
                ...prev,
                adresse_complete: prev.adresse_complete || label,
              }));
            }
          }
        } catch {
          // coordonnées déjà remplies même sans adresse
        }
        setLocating(false);
        setGpsMsg("✅ Position récupérée");
      },
      (err) => {
        const errors = {
          1: "❌ Autorise la géolocalisation pour utiliser cette fonction.",
          2: "❌ Position indisponible.",
          3: "❌ Délai de géolocalisation dépassé.",
        };
        setGpsMsg(errors[err.code] || "❌ Erreur géolocalisation.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      alert("Le nom de la ville est obligatoire");
      return;
    }

    // Convertir latitude/longitude en nombres (si remplis)
    const dataToSubmit = {
      nom: formData.nom.trim(),
      adresse_complete: formData.adresse_complete.trim() || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      notes: formData.notes.trim() || null,
    };

    onSubmit(dataToSubmit);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md p-6 rounded-[30px] max-h-[90vh] overflow-y-auto ${
          darkMode
            ? "bg-[#1a1f2e] border-2 border-purple-500/40"
            : "bg-white border-2 border-slate-200"
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase mb-6 text-center">
          {editMode ? "✏️ Modifier Lieu" : "➕ Nouveau Lieu"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NOM (Ville) */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider">
              Nom de la ville <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Dinant, Ciney, Seraing, Atelier..."
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md placeholder:text-white/40`}
              required
            />
          </div>

          {/* ADRESSE COMPLÈTE */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-60">
              Adresse complète (optionnel)
            </label>
            <input
              type="text"
              value={formData.adresse_complete}
              onChange={(e) => setFormData({ ...formData, adresse_complete: e.target.value })}
              placeholder="Rue, numéro, code postal..."
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md placeholder:text-white/40`}
            />
          </div>

          {/* GPS (pour frais km automatiques) */}
          <div className="border border-cyan-400/30 bg-cyan-950/20 rounded-xl p-3 space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-cyan-300 tracking-wider">
                📍 Coordonnées GPS (pour frais km auto)
              </span>
              {formData.latitude && formData.longitude ? (
                <span className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-300 uppercase">
                  ✅ GPS prêt
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-orange-600/20 border border-orange-500/30 rounded-lg text-[9px] font-black text-orange-300 uppercase">
                  ⚠️ Non renseigné
                </span>
              )}
            </div>

            {/* Bouton position actuelle */}
            <button
              type="button"
              onClick={useCurrentPosition}
              disabled={locating}
              className="w-full px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest border border-cyan-400/40 text-cyan-200 bg-cyan-500/10 disabled:opacity-50 transition-all"
            >
              {locating ? "📍 Localisation..." : "📍 Utiliser ma position actuelle"}
            </button>

            {/* Message de feedback */}
            {gpsMsg && (
              <p className={`text-[11px] font-bold ${gpsMsg.startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>
                {gpsMsg}
              </p>
            )}

            {/* Champs lat/lng */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-cyan-300 tracking-wider">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="Ex: 50.1234"
                  className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                    darkMode
                      ? "bg-black/20 border-white/5 text-white focus:border-cyan-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
                  } backdrop-blur-md placeholder:text-white/30`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-cyan-300 tracking-wider">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="Ex: 4.5678"
                  className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                    darkMode
                      ? "bg-black/20 border-white/5 text-white focus:border-cyan-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
                  } backdrop-blur-md placeholder:text-white/30`}
                />
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-60">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Infos complémentaires..."
              rows={3}
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md placeholder:text-white/40`}
            />
          </div>

          {/* BOUTONS */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[11px] text-white/60 hover:text-white transition-all border border-white/10"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl font-black uppercase text-[11px] text-white transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? "..." : editMode ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
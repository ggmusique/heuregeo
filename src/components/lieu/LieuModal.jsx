import React, { useState, useEffect } from "react";

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
  }, [show, editMode, initialData]);

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

          {/* GPS (Optionnel - pour futur) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-40">
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
                    ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
                } backdrop-blur-md placeholder:text-white/30`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-40">
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
                    ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
                } backdrop-blur-md placeholder:text-white/30`}
              />
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
import React, { useState, useEffect } from "react";
import { useLabels } from "../../contexts/LabelsContext";

/**
 * ✅ ClientModal - VERSION CLEAN
 * 
 * Champs :
 * - nom (obligatoire)
 * - contact (optionnel)
 * - notes (optionnel)
 * 
 * ❌ PAS de lieu_travail
 */
export const ClientModal = ({
  show = false,
  editMode = false,
  initialData = null,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  darkMode = true,
}) => {
  const L = useLabels();
  const [formData, setFormData] = useState({
    nom: "",
    contact: "",
    notes: "",
  });

  // Remplir le formulaire en mode édition
  useEffect(() => {
    if (show && editMode && initialData) {
      setFormData({
        nom: initialData.nom || "",
        contact: initialData.contact || "",
        notes: initialData.notes || "",
      });
    } else if (show && !editMode) {
      setFormData({
        nom: "",
        contact: "",
        notes: "",
      });
    }
  }, [show, editMode, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      alert("Le nom du client est obligatoire");
      return;
    }

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[500] flex items-center justify-center p-6 ${darkMode ? "bg-black/60" : "bg-black/30"} backdrop-blur-sm`}>
      <div
        className={`w-full max-w-md p-6 rounded-[30px] max-h-[calc(100vh-8rem)] overflow-y-auto ${
          darkMode
            ? "bg-[#1a1f2e] border-2 border-indigo-500/40"
            : "bg-white border-2 border-slate-200"
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase mb-6 text-center">
          {editMode ? `✏️ Modifier ${L.client}` : `➕ Nouveau ${L.client}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NOM */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider">
              Nom du client <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Confluence, Yohan, Dachet..."
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
              } backdrop-blur-md ${darkMode ? "placeholder:text-white/40" : "placeholder:text-slate-400"}`}
              required
            />
          </div>

          {/* CONTACT */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-60">
              Contact (optionnel)
            </label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Téléphone, email..."
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
              } backdrop-blur-md ${darkMode ? "placeholder:text-white/40" : "placeholder:text-slate-400"}`}
            />
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-60">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Infos complémentaires..."
              rows={3}
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
              } backdrop-blur-md ${darkMode ? "placeholder:text-white/40" : "placeholder:text-slate-400"}`}
            />
          </div>

          {/* BOUTONS */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[11px] transition-all border ${darkMode ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-800"}`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl font-black uppercase text-[11px] text-white transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? "..." : editMode ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
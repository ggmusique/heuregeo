import React, { useState, useEffect } from "react";

/**
 * Modal pour créer ou modifier un patron
 */
export function PatronModal({
  show,
  editMode = false,
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
}) {
  const [nom, setNom] = useState("");
  const [tauxHoraire, setTauxHoraire] = useState("");
  const [couleur, setCouleur] = useState("#8b5cf6");

  // Couleurs prédéfinies
  const COULEURS_PRESET = [
    { nom: "Violet", value: "#8b5cf6" },
    { nom: "Bleu", value: "#3b82f6" },
    { nom: "Vert", value: "#10b981" },
    { nom: "Rouge", value: "#ef4444" },
    { nom: "Orange", value: "#f97316" },
    { nom: "Rose", value: "#ec4899" },
    { nom: "Jaune", value: "#eab308" },
    { nom: "Cyan", value: "#06b6d4" },
  ];

  // Réinitialiser ou remplir le formulaire
  useEffect(() => {
    if (show) {
      if (editMode && initialData) {
        setNom(initialData.nom || "");
        setTauxHoraire(initialData.taux_horaire?.toString() || "");
        setCouleur(initialData.couleur || "#8b5cf6");
      } else {
        setNom("");
        setTauxHoraire("");
        setCouleur("#8b5cf6");
      }
    }
  }, [show, editMode, initialData]);

  const handleSubmit = () => {
    const tauxNum = parseFloat(tauxHoraire);
    onSubmit({
      nom: nom.trim(),
      tauxHoraire: tauxHoraire && !isNaN(tauxNum) ? tauxNum : null,
      couleur,
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-[35px] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-indigo-900/95 to-purple-900/95 text-white"
            : "bg-white text-slate-900"
        }`}
      >
        {/* Titre */}
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">
          {editMode ? "Modifier Patron" : "Nouveau Patron"}
        </h2>

        {/* Formulaire */}
        <div className="space-y-5">
          {/* Nom */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
              Nom du patron *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Entreprise ABC"
              className={`w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-all outline-none ${
                darkMode
                  ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:bg-white/15"
                  : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"
              }`}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Taux horaire */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
              Taux horaire (€/h) - optionnel
            </label>
            <input
              type="number"
              step="0.01"
              value={tauxHoraire}
              onChange={(e) => setTauxHoraire(e.target.value)}
              placeholder="Ex: 15.50"
              className={`w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-all outline-none ${
                darkMode
                  ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:bg-white/15"
                  : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"
              }`}
              disabled={loading}
            />
            <p className="text-[9px] opacity-50 mt-1 px-1">
              Si renseigné, sera utilisé pour calculer automatiquement le
              montant
            </p>
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-3 tracking-wider">
              Couleur d'identification
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {COULEURS_PRESET.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCouleur(c.value)}
                  className={`h-12 rounded-xl transition-all ${
                    couleur === c.value
                      ? "ring-4 ring-white/50 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  disabled={loading}
                  title={c.nom}
                />
              ))}
            </div>
            <input
              type="color"
              value={couleur}
              onChange={(e) => setCouleur(e.target.value)}
              className="w-full h-12 rounded-xl cursor-pointer"
              disabled={loading}
            />
          </div>
        </div>

        {/* Aperçu */}
        <div className="mt-6 p-4 rounded-2xl bg-black/20 border border-white/10">
          <p className="text-[9px] font-black uppercase opacity-50 mb-2">
            Aperçu
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full shadow-lg"
              style={{ backgroundColor: couleur }}
            />
            <span className="font-bold text-lg">{nom || "Nom du patron"}</span>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] transition-all ${
              darkMode
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            } disabled:opacity-50 active:scale-95`}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nom.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-[20px] font-black uppercase text-[11px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg"
          >
            {loading ? "⏳" : editMode ? "Modifier" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

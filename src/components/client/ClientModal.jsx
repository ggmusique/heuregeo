import React, { useState, useEffect } from "react";

/**
 * Modal de gestion des clients
 * Créer ou modifier un client
 */
export const ClientModal = ({
  show,
  editMode = false,
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
}) => {
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [lieuTravail, setLieuTravail] = useState("");
  const [notes, setNotes] = useState("");

  // Remplir le formulaire en mode édition
  useEffect(() => {
    if (editMode && initialData) {
      setNom(initialData.nom || "");
      setContact(initialData.contact || "");
      setLieuTravail(initialData.lieu_travail || initialData.adresse || "");
      setNotes(initialData.notes || "");
    } else {
      // Reset en mode création
      setNom("");
      setContact("");
      setLieuTravail("");
      setNotes("");
    }
  }, [editMode, initialData, show]);

  const handleSubmit = () => {
    if (!nom.trim()) {
      alert("Le nom du client est obligatoire");
      return;
    }

    onSubmit({
      nom: nom.trim(),
      contact: contact.trim() || null,
      lieu_travail: lieuTravail.trim() || null,
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
        } backdrop-blur-xl shadow-2xl`}
      >
        <h3 className="text-xl font-black uppercase mb-6 text-center italic">
          {editMode ? "Modifier le client" : "Nouveau Client"}
        </h3>

        {/* Nom (OBLIGATOIRE) */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
            Nom du client <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Intel Belgium"
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

        {/* Contact (OPTIONNEL) */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-green-300 tracking-wider opacity-80">
            Contact (optionnel)
          </label>
          <input
            type="text"
            placeholder="Email, téléphone..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-green-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500"
            } backdrop-blur-md`}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>

        {/* Lieu de travail (OPTIONNEL) */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-80">
            Lieu de travail (optionnel)
          </label>
          <input
            type="text"
            placeholder="Ex: Atelier, Rue de Liège 123, 4000 Liège"
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
            } backdrop-blur-md`}
            value={lieuTravail}
            onChange={(e) => setLieuTravail(e.target.value)}
          />
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

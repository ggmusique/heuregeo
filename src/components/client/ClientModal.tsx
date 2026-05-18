import React, { useState, useEffect } from "react";
import { useLabels } from "../../contexts/LabelsContext";

interface Props {
  show?: boolean;
  editMode?: boolean;
  initialData?: any;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  loading?: boolean;
  /** @deprecated — ignoré, le thème vient de DarkModeContext */
  darkMode?: boolean;
}

export const ClientModal = ({
  show = false,
  editMode = false,
  initialData = null,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
}: Props) => {
  const L = useLabels();
  const [formData, setFormData] = useState({
    nom: "",
    contact: "",
    notes: "",
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      alert("Le nom du client est obligatoire");
      return;
    }

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[var(--color-overlay)] backdrop-blur-[var(--blur-overlay)]">
      <div
        className="w-full max-w-md p-6 rounded-[30px] max-h-[calc(100vh-8rem)] overflow-y-auto bg-[var(--color-surface)] border-2 border-[var(--color-border)] backdrop-blur-card shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase mb-6 text-center">
          {editMode ? `✏️ Modifier ${L.client}` : `➕ Nouveau ${L.client}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NOM */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-[var(--color-text-muted)] tracking-wider">
              Nom du client <span className="text-[var(--color-accent-red)]">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Confluence, Yohan, Dachet..."
              className="w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)] backdrop-blur-md placeholder:text-[var(--color-text-dim)]"
              required
            />
          </div>

          {/* CONTACT */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-[var(--color-text-muted)] tracking-wider opacity-60">
              Contact (optionnel)
            </label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Téléphone, email..."
              className="w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)] backdrop-blur-md placeholder:text-[var(--color-text-dim)]"
            />
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-[var(--color-text-muted)] tracking-wider opacity-60">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Infos complémentaires..."
              rows={3}
              className="w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-accent-violet)] backdrop-blur-md placeholder:text-[var(--color-text-dim)]"
            />
          </div>

          {/* BOUTONS */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl font-black uppercase text-[11px] transition-all border bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[var(--color-accent-violet)] hover:opacity-90 rounded-2xl font-black uppercase text-[11px] text-white transition-[opacity,transform] duration-150 disabled:opacity-40 active:scale-95"
            >
              {loading ? "..." : editMode ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

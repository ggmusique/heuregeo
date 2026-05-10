import React, { useState } from 'react'

interface Props {
  onSave: (form: any) => void;
  saving: boolean;
}

export const OnboardingForm = ({ onSave, saving }: Props) => {
  const [form, setForm] = useState({
    prenom: '', nom: '', adresse: '', code_postal: '', ville: '', telephone: ''
  })

  const isValid = form.prenom.trim() && form.nom.trim()

  const handleSubmit = () => {
    if (!isValid) return
    onSave(form)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-[var(--color-text)] mb-2">
            Bienvenue !
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Complète ton profil pour commencer
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-[45px] p-8 space-y-4">

          {/* Section Identité */}
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400 opacity-80">
            Identité *
          </p>

          <input
            type="text"
            placeholder="Prénom *"
            value={form.prenom}
            onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[var(--color-field)] border-2 border-indigo-500/40 text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
          />

          <input
            type="text"
            placeholder="Nom *"
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[var(--color-field)] border-2 border-indigo-500/40 text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
          />

          {/* Section Coordonnées */}
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400 opacity-80 pt-2">
            Coordonnées (optionnel)
          </p>

          <input
            type="text"
            placeholder="Adresse"
            value={form.adresse}
            onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[var(--color-field)] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
          />

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Code postal"
              value={form.code_postal}
              onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))}
              className="w-1/3 p-4 rounded-2xl bg-[var(--color-field)] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
            />
            <input
              type="text"
              placeholder="Ville"
              value={form.ville}
              onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
              className="w-2/3 p-4 rounded-2xl bg-[var(--color-field)] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          <input
            type="tel"
            placeholder="Téléphone"
            value={form.telephone}
            onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[var(--color-field)] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] font-black text-base focus:outline-none focus:border-indigo-400 transition-all"
          />

          <p className="text-[9px] text-[var(--color-text-dim)] px-1">* champs obligatoires</p>

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[12px] tracking-wider transition-all mt-2 ${
              isValid && !saving
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg active:scale-95'
                : 'bg-[var(--color-surface-offset)] text-[var(--color-text-dim)] cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ Enregistrement...' : '✅ Commencer'}
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const CompteTab = ({ profile, saving, onSave, userEmail }) => {
  const [form, setForm] = useState({
    prenom: '', nom: '', adresse: '', code_postal: '', ville: '', telephone: ''
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        adresse: profile.adresse || '',
        code_postal: profile.code_postal || '',
        ville: profile.ville || '',
        telephone: profile.telephone || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    const result = await onSave(form)
    if (!result?.error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050510] pb-32">
      <div className="p-6 space-y-6 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <div className="text-4xl mb-2">👤</div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
            Mon Compte
          </h2>
        </div>

        {/* Carte Identité */}
        <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] p-6 space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-300 opacity-80">
            Identité
          </p>
          <input
            type="text"
            placeholder="Prénom *"
            value={form.prenom}
            onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 border-indigo-500/40 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
          />
          <input
            type="text"
            placeholder="Nom *"
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 border-indigo-500/40 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Carte Coordonnées */}
        <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] p-6 space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-300 opacity-80">
            Coordonnées
          </p>
          <input
            type="text"
            placeholder="Adresse"
            value={form.adresse}
            onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
          />
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Code postal"
              value={form.code_postal}
              onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))}
              className="w-1/3 p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
            />
            <input
              type="text"
              placeholder="Ville"
              value={form.ville}
              onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
              className="w-2/3 p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
            />
          </div>
          <input
            type="tel"
            placeholder="Téléphone"
            value={form.telephone}
            onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Carte Compte */}
        <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] p-6 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-300 opacity-80">
            Compte
          </p>
          <p className="text-white/50 text-[13px] font-black">📧 {userEmail}</p>
          <p className="text-[9px] text-white/20">Email non modifiable</p>
        </div>

        {/* Bouton Enregistrer */}
        <button
          onClick={handleSave}
          disabled={saving || !form.prenom.trim() || !form.nom.trim()}
          className={`w-full py-4 rounded-2xl font-black uppercase text-[12px] tracking-wider transition-all ${
            !saving && form.prenom.trim() && form.nom.trim()
              ? saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg active:scale-95'
              : 'bg-gray-600/30 text-white/30 cursor-not-allowed'
          }`}
        >
          {saving ? '⏳ Enregistrement...' : saved ? '✅ Enregistré !' : '💾 Enregistrer'}
        </button>

        {/* Bouton Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl font-black uppercase text-[12px] tracking-wider border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
        >
          🚪 Déconnexion
        </button>

      </div>
    </div>
  )
}

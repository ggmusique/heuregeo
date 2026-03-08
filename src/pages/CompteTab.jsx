import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const EU_TVA_RATES = [
  { code: "FR", label: "France",         rate: "20"  },
  { code: "DE", label: "Allemagne",      rate: "19"  },
  { code: "AT", label: "Autriche",       rate: "20"  },
  { code: "BE", label: "Belgique",       rate: "21"  },
  { code: "BG", label: "Bulgarie",       rate: "20"  },
  { code: "CY", label: "Chypre",         rate: "19"  },
  { code: "HR", label: "Croatie",        rate: "25"  },
  { code: "DK", label: "Danemark",       rate: "25"  },
  { code: "ES", label: "Espagne",        rate: "21"  },
  { code: "EE", label: "Estonie",        rate: "22"  },
  { code: "FI", label: "Finlande",       rate: "25.5"},
  { code: "GR", label: "Grèce",          rate: "24"  },
  { code: "HU", label: "Hongrie",        rate: "27"  },
  { code: "IE", label: "Irlande",        rate: "23"  },
  { code: "IT", label: "Italie",         rate: "22"  },
  { code: "LV", label: "Lettonie",       rate: "21"  },
  { code: "LT", label: "Lituanie",       rate: "21"  },
  { code: "LU", label: "Luxembourg",     rate: "17"  },
  { code: "MT", label: "Malte",          rate: "18"  },
  { code: "NL", label: "Pays-Bas",       rate: "21"  },
  { code: "PL", label: "Pologne",        rate: "23"  },
  { code: "PT", label: "Portugal",       rate: "23"  },
  { code: "RO", label: "Roumanie",       rate: "19"  },
  { code: "SK", label: "Slovaquie",      rate: "23"  },
  { code: "SI", label: "Slovénie",       rate: "22"  },
  { code: "SE", label: "Suède",          rate: "25"  },
  { code: "CZ", label: "Tchéquie",       rate: "21"  },
  { code: "CH", label: "Suisse",         rate: "8.1" },
  { code: "NO", label: "Norvège",        rate: "25"  },
  { code: "GB", label: "Royaume-Uni",    rate: "20"  },
]

export const CompteTab = ({ profile, saving, onSave, userEmail }) => {
  const [form, setForm] = useState({
    prenom: '', nom: '', adresse: '', code_postal: '', ville: '', telephone: '',
    numero_tva: '', pays_tva: 'FR',
  })
  const [saved, setSaved] = useState(false)
  const [showTva, setShowTva] = useState(false)

  useEffect(() => {
    if (profile) {
      const numero = profile.features?.numero_tva || ''
      setForm({
        prenom:     profile.prenom     || '',
        nom:        profile.nom        || '',
        adresse:    profile.adresse    || '',
        code_postal:profile.code_postal|| '',
        ville:      profile.ville      || '',
        telephone:  profile.telephone  || '',
        numero_tva: numero,
        pays_tva:   profile.features?.pays_tva   || 'FR',
      })
      if (numero) setShowTva(true)
    }
  }, [profile])

  const handleSave = async () => {
    const { numero_tva, pays_tva, ...profileFields } = form
    const result = await onSave({
      ...profileFields,
      features: {
        ...(profile?.features || {}),
        numero_tva,
        pays_tva,
      },
    })
    if (!result?.error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const tauxSelectionne = EU_TVA_RATES.find(c => c.code === form.pays_tva)?.rate ?? ''

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

        {/* Carte Facturation TVA — repliable */}
        <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] overflow-hidden">
          <button
            onClick={() => setShowTva(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400 opacity-80">
                Facturation / TVA
              </span>
              {form.numero_tva && (
                <span className="text-[9px] font-bold text-amber-300/60 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {form.numero_tva}
                </span>
              )}
            </div>
            <span className="text-white/30 text-lg transition-transform duration-200" style={{ display: 'inline-block', transform: showTva ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ›
            </span>
          </button>

          {showTva && (
            <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
              <p className="text-[10px] text-white/25 italic">
                📄 À remplir pour vos factures
              </p>

              {/* Numéro de TVA */}
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                  N° TVA intracommunautaire
                </p>
                <input
                  type="text"
                  placeholder="ex : FR12345678901"
                  value={form.numero_tva}
                  onChange={e => setForm(f => ({ ...f, numero_tva: e.target.value.toUpperCase() }))}
                  className="w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 border-amber-500/30 text-white placeholder-white/20 font-black text-[13px] uppercase focus:outline-none focus:border-amber-400 transition-all tracking-widest"
                />
              </div>

              {/* Pays + taux TVA */}
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                  Taux de TVA applicable
                </p>
                <div className="flex gap-3 items-center">
                  <select
                    value={form.pays_tva}
                    onChange={e => setForm(f => ({ ...f, pays_tva: e.target.value }))}
                    className="flex-1 p-4 rounded-2xl bg-[#1a1f2e] border-2 border-amber-500/30 text-white font-black text-[13px] focus:outline-none focus:border-amber-400 transition-all appearance-none"
                  >
                    {EU_TVA_RATES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label} — {c.rate} %
                      </option>
                    ))}
                  </select>
                  {tauxSelectionne && (
                    <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 font-black text-[18px] min-w-[64px] text-center">
                      {tauxSelectionne}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

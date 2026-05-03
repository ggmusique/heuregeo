import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { EU_TVA_RATES } from '../utils/tvaRates'

/* ── Section repliable réutilisable ─────────────────────────── */

interface SectionProps {
  title: string;
  titleColor?: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const Section = ({ title, titleColor = "text-indigo-300", badge, open, onToggle, children }: SectionProps) => (
  <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[11px] font-black uppercase tracking-[0.25em] opacity-80 ${titleColor}`}>
          {title}
        </span>
        {badge && (
          <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[140px]">
            {badge}
          </span>
        )}
      </div>
      <span
        className="text-white/30 text-lg shrink-0 ml-2"
        style={{ display: 'inline-block', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
      >
        ›
      </span>
    </button>
    {open && (
      <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4">
        {children}
      </div>
    )}
  </div>
)

/* ── Composant principal ─────────────────────────────────────── */

interface CompteTabProps {
  profile: any;
  saving?: boolean;
  onSave: (data: any) => Promise<any>;
  userEmail?: string;
}

export const CompteTab = ({ profile, saving, onSave, userEmail }: CompteTabProps) => {
  const [form, setForm] = useState({
    prenom: '', nom: '', adresse: '', code_postal: '', ville: '', telephone: '',
    numero_tva: '', pays_tva: 'FR',
  })
  const [saved,      setSaved]      = useState(false)
  const [showIdent,  setShowIdent]  = useState(true)
  const [showCoords, setShowCoords] = useState(false)
  const [showTva,    setShowTva]    = useState(false)

  useEffect(() => {
    if (profile) {
      const prenom      = profile.prenom      || ''
      const nom         = profile.nom         || ''
      const adresse     = profile.adresse     || ''
      const code_postal = profile.code_postal || ''
      const ville       = profile.ville       || ''
      const telephone   = profile.telephone   || ''
      const numero_tva  = profile.features?.numero_tva || ''
      const pays_tva    = profile.features?.pays_tva   || 'FR'

      setForm({ prenom, nom, adresse, code_postal, ville, telephone, numero_tva, pays_tva })

      // Identité : fermée si déjà remplie, ouverte si manquante
      setShowIdent(!prenom || !nom)
      // Coordonnées : ouverte si au moins un champ rempli
      setShowCoords(!!(adresse || code_postal || ville || telephone))
      // TVA : ouverte si numéro sauvegardé
      setShowTva(!!numero_tva)
    }
  }, [profile])

  const handleSave = async () => {
    const { numero_tva, pays_tva, ...profileFields } = form
    const result = await onSave({
      ...profileFields,
      features: { ...(profile?.features || {}), numero_tva, pays_tva },
    })
    if (!result?.error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const tauxSelectionne = EU_TVA_RATES.find(c => c.code === form.pays_tva)?.rate ?? ''

  const inputCls = (border = 'border-white/10') =>
    `w-full p-4 rounded-2xl bg-[#1a1f2e] border-2 ${border} text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all`

  return (
    <div className="flex flex-col min-h-screen bg-[#050510] pb-32">
      <div className="p-6 space-y-4 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <div className="text-4xl mb-2">👤</div>
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
            Mon Compte
          </h2>
        </div>

        {/* ── Identité ── */}
        <Section
          title="Identité"
          titleColor="text-indigo-300"
          badge={form.prenom || form.nom ? `${form.prenom} ${form.nom}`.trim() : undefined}
          open={showIdent}
          onToggle={() => setShowIdent(v => !v)}
        >
          <input
            type="text"
            placeholder="Prénom *"
            value={form.prenom}
            onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
            className={inputCls('border-indigo-500/40')}
          />
          <input
            type="text"
            placeholder="Nom *"
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            className={inputCls('border-indigo-500/40')}
          />
        </Section>

        {/* ── Coordonnées ── */}
        <Section
          title="Coordonnées"
          titleColor="text-indigo-300"
          badge={form.ville || form.adresse || undefined}
          open={showCoords}
          onToggle={() => setShowCoords(v => !v)}
        >
          <input
            type="text"
            placeholder="Adresse"
            value={form.adresse}
            onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
            className={inputCls()}
          />
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Code postal"
              value={form.code_postal}
              onChange={e => setForm(f => ({ ...f, code_postal: e.target.value }))}
              className={`w-1/3 p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all`}
            />
            <input
              type="text"
              placeholder="Ville"
              value={form.ville}
              onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
              className={`w-2/3 p-4 rounded-2xl bg-[#1a1f2e] border-2 border-white/10 text-white placeholder-white/30 font-black text-[13px] focus:outline-none focus:border-indigo-400 transition-all`}
            />
          </div>
          <input
            type="tel"
            placeholder="Téléphone"
            value={form.telephone}
            onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
            className={inputCls()}
          />
        </Section>

        {/* ── Facturation / TVA ── */}
        <Section
          title="Facturation / TVA"
          titleColor="text-amber-400"
          badge={form.numero_tva || undefined}
          open={showTva}
          onToggle={() => setShowTva(v => !v)}
        >
          <p className="text-[10px] text-white/25 italic">📄 À remplir pour vos factures</p>

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
                  <option key={c.code} value={c.code}>{c.label} — {c.rate} %</option>
                ))}
              </select>
              {tauxSelectionne && (
                <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 font-black text-[18px] min-w-[64px] text-center">
                  {tauxSelectionne}%
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Compte ── */}
        <div className="bg-[#0f111a] border-2 border-white/10 rounded-[32px] p-5 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-300 opacity-80">Compte</p>
          <p className="text-white/50 text-[13px] font-black">📧 {userEmail}</p>
          <p className="text-[9px] text-white/20">Email non modifiable</p>
        </div>

        {/* Enregistrer */}
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

        {/* Déconnexion */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-4 rounded-2xl font-black uppercase text-[12px] tracking-wider border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
        >
          🚪 Déconnexion
        </button>

      </div>
    </div>
  )
}

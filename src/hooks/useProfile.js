import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

export const useProfile = (user) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveProfile = useCallback(async (updates) => {
    if (!user?.id) return { error: 'Non connecté' }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { data }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setSaving(false)
    }
  }, [user?.id])

  // Profil complet = prénom ET nom renseignés
  const isProfileComplete = Boolean(profile && profile.prenom?.trim() && profile.nom?.trim())

  const isViewer = profile?.role === 'viewer'
  const viewerPatronId = isViewer ? profile?.patron_id : null

  // Plan Gratuit / Pro
  // Colonne `is_admin` (boolean, default false) et `features` (jsonb, default {}) dans la table `profiles`
  // L'admin geohelene@msn.com doit avoir is_admin = true dans Supabase
  const isAdmin = profile?.is_admin === true
  const features = profile?.features || {}
  const isPro = features?.plan === 'pro'

  // Features individuelles (avec fallback sur isPro)
  const canBilanMois = isPro || features?.bilan_mois === true
  const canBilanAnnee = isPro || features?.bilan_annee === true
  const canExportPDF = isPro || features?.export_pdf === true
  const canExportExcel = isPro || features?.export_excel === true
  const canExportCSV = isPro || features?.export_csv === true
  const canMultiPatron = isPro || features?.multi_patron === true
  const canViewerMode = isPro || features?.viewer_enabled === true
  const canHistoriqueComplet = isPro || features?.historique_complet === true
  const canKilometrage = isPro || features?.kilometrage === true
  const canAgenda      = features?.agenda   === true
  const canFacture     = features?.facture  === true

  return {
    profile, loading, saving, error, saveProfile, fetchProfile,
    isProfileComplete, isViewer, viewerPatronId,
    isAdmin, features, isPro,
    canBilanMois, canBilanAnnee, canExportPDF, canExportExcel, canExportCSV,
    canMultiPatron, canViewerMode, canHistoriqueComplet, canKilometrage, canAgenda, canFacture,
  }
}

// Migration: si kmRate sans countryCode => FR + CUSTOM
export const migrateKmSettings = (profile) => {
  if (!profile) return {};
  if (profile.km_rate && !profile.km_country_code) {
    return { km_country_code: "FR", km_rate_mode: "CUSTOM", km_rate: profile.km_rate };
  }
  return {};
}

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

  return { profile, loading, saving, error, saveProfile, fetchProfile, isProfileComplete, isViewer, viewerPatronId }
}

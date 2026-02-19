import { useEffect, useRef, useState } from 'react'

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const registrationRef = useRef(null)

  useEffect(() => {
    // Éviter la boucle : si on vient d'un rechargement SW, ne pas re-proposer
    if (sessionStorage.getItem('sw-updated')) {
      sessionStorage.removeItem('sw-updated')
      return
    }

    if (!('serviceWorker' in navigator)) return

    let interval
    let cancelled = false

    const handleUpdateFound = (registration) => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', function onStateChange() {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
            setNeedRefresh(true)
          }
          if (newWorker.state === 'installed' || newWorker.state === 'redundant') {
            newWorker.removeEventListener('statechange', onStateChange)
          }
        })
      }
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return
      registrationRef.current = registration
      interval = setInterval(() => registration.update(), 60 * 1000)

      const onUpdateFound = () => handleUpdateFound(registration)
      registration.addEventListener('updatefound', onUpdateFound)

      // Vérifier immédiatement si un SW est déjà en attente
      if (registration.waiting && navigator.serviceWorker.controller) {
        setNeedRefresh(true)
      }

      registrationRef._cleanup = () => {
        registration.removeEventListener('updatefound', onUpdateFound)
      }
    })

    return () => {
      cancelled = true
      clearInterval(interval)
      if (registrationRef._cleanup) {
        registrationRef._cleanup()
        delete registrationRef._cleanup
      }
    }
  }, [])

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          // Indiquer au SW en attente de prendre le contrôle
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          sessionStorage.setItem('sw-updated', '1')
          setNeedRefresh(false)
          // Recharger après un court délai
          setTimeout(() => window.location.reload(), 300)
        }
      })
    }
  }

  if (!needRefresh) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-[2000]">
      <div className="bg-gradient-to-r from-[#0A1628] to-[#020818] border border-yellow-600/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="text-white font-bold text-sm">Mise à jour disponible</p>
            <p className="text-white/50 text-xs">Nouvelle version prête à installer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setNeedRefresh(false)}
            className="px-3 py-2 rounded-xl text-white/40 text-xs font-medium border border-white/10 active:scale-95"
          >
            Plus tard
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#A07830] text-white text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  )
}

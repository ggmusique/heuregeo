import { useEffect, useRef, useState } from 'react'

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const waitingWorkerRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    let interval = null
    let registrationRef = null
    let onUpdateFound = null

    const handleUpdateFound = (registration) => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', function onStateChange() {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller &&
          !cancelled
        ) {
          waitingWorkerRef.current = newWorker
          setNeedRefresh(true)
        }
        if (newWorker.state === 'installed' || newWorker.state === 'redundant') {
          newWorker.removeEventListener('statechange', onStateChange)
        }
      })
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return

      registrationRef = registration

      // Vérifier si un SW est déjà en attente au chargement
      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = registration.waiting
        setNeedRefresh(true)
      }

      // Écouter les nouvelles mises à jour
      onUpdateFound = () => handleUpdateFound(registration)
      registration.addEventListener('updatefound', onUpdateFound)

      // Vérifier périodiquement (toutes les 60s)
      interval = setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 1000)
    })

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      if (registrationRef && onUpdateFound) {
        registrationRef.removeEventListener('updatefound', onUpdateFound)
      }
    }
  }, [])

  const reloadOnControllerChange = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    }, { once: true })
  }

  const handleUpdate = () => {
    const worker = waitingWorkerRef.current
    if (worker) {
      // Dire au SW en attente de prendre le contrôle
      worker.postMessage({ type: 'SKIP_WAITING' })
      setNeedRefresh(false)
      reloadOnControllerChange()
    } else if ('serviceWorker' in navigator) {
      // Fallback : forcer via ready
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          setNeedRefresh(false)
          reloadOnControllerChange()
        }
      })
    }
  }

  const handleDismiss = () => {
    // Ferme juste la notif — le SW en attente reste en waiting
    // La prochaine fois que l'appli est relancée, la notif reviendra
    setNeedRefresh(false)
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
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDismiss}
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

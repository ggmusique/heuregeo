import { useEffect, useRef, useState } from 'react'

const LS_KEY = 'pwa-update-pending'

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const waitingWorkerRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    let interval = null

    const showUpdateBanner = (worker) => {
      if (cancelled) return
      waitingWorkerRef.current = worker
      localStorage.setItem(LS_KEY, '1')
      setNeedRefresh(true)
    }

    const handleUpdateFound = (registration) => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', function onStateChange() {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller &&
          !cancelled
        ) {
          showUpdateBanner(newWorker)
        }
        if (newWorker.state === 'installed' || newWorker.state === 'redundant') {
          newWorker.removeEventListener('statechange', onStateChange)
        }
      })
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return

      // Cas 1 : un SW est déjà en attente au démarrage
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration.waiting)
      }
      // Cas 2 : localStorage dit qu'une MAJ était en attente, mais plus de SW waiting
      // → la MAJ s'est auto-installée silencieusement, on nettoie
      else if (localStorage.getItem(LS_KEY)) {
        localStorage.removeItem(LS_KEY)
      }

      // Écouter les nouvelles mises à jour
      registration.addEventListener('updatefound', () => handleUpdateFound(registration))

      // Vérifier périodiquement (toutes les 60s)
      interval = setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 1000)
    })

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    const worker = waitingWorkerRef.current

    const doUpdate = (w) => {
      localStorage.removeItem(LS_KEY)
      setNeedRefresh(false)
      w.postMessage({ type: 'SKIP_WAITING' })
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
    }

    if (worker) {
      doUpdate(worker)
    } else {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          doUpdate(registration.waiting)
        }
      })
    }
  }

  const handleDismiss = () => {
    // On cache la notif MAIS on garde le localStorage
    // → au prochain lancement, si le SW est encore en waiting, la notif reviendra
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

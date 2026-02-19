import { useEffect, useRef, useState } from 'react'

const LS_WAITING_VERSION = 'pwa-waiting-version'
const LS_CURRENT_VERSION = 'pwa-current-version'
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'

export function UpdatePrompt() {
  // 'update-ready' | 'just-updated' | null
  const [state, setState] = useState(null)
  const waitingWorkerRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // ── Cas 1 : l'appli vient de se mettre à jour silencieusement ──
    const storedVersion = localStorage.getItem(LS_CURRENT_VERSION)
    if (storedVersion && storedVersion !== APP_VERSION) {
      // La version a changé depuis le dernier lancement → MAJ silencieuse détectée
      localStorage.setItem(LS_CURRENT_VERSION, APP_VERSION)
      localStorage.removeItem(LS_WAITING_VERSION)
      setState('just-updated')
      // Auto-fermer après 4s
      const t = setTimeout(() => setState(null), 4000)
      return () => clearTimeout(t)
    }

    // Enregistrer la version actuelle si pas encore fait
    if (!storedVersion) {
      localStorage.setItem(LS_CURRENT_VERSION, APP_VERSION)
    }

    // ── Cas 2 : détecter un SW en attente ──
    let cancelled = false
    let interval = null

    const showUpdateBanner = (worker) => {
      if (cancelled) return
      waitingWorkerRef.current = worker
      localStorage.setItem(LS_WAITING_VERSION, APP_VERSION)
      setState('update-ready')
    }

    const handleUpdateFound = (registration) => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', function onStateChange() {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
          showUpdateBanner(newWorker)
        }
        if (newWorker.state === 'installed' || newWorker.state === 'redundant') {
          newWorker.removeEventListener('statechange', onStateChange)
        }
      })
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration.waiting)
      }

      registration.addEventListener('updatefound', () => handleUpdateFound(registration))

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
      localStorage.removeItem(LS_WAITING_VERSION)
      setState(null)
      w.postMessage({ type: 'SKIP_WAITING' })
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
    }
    if (worker) {
      doUpdate(worker)
    } else {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) doUpdate(reg.waiting)
      })
    }
  }

  // ── Toast "mise à jour appliquée" ──
  if (state === 'just-updated') {
    return (
      <div className="fixed top-4 left-4 right-4 z-[2000]">
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-white font-bold text-sm">Mise à jour appliquée</p>
              <p className="text-white/60 text-xs">v{APP_VERSION} — L'appli est à jour</p>
            </div>
          </div>
          <button
            onClick={() => setState(null)}
            className="text-white/40 text-xl px-2"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // ── Bannière "mise à jour disponible" ──
  if (state === 'update-ready') {
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
              onClick={() => setState(null)}
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

  return null
}
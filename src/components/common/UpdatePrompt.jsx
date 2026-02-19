import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Vérifie les mises à jour toutes les 60 secondes
      r && setInterval(() => r.update(), 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-[2000] animate-slide-down">
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
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#A07830] text-white text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  )
}

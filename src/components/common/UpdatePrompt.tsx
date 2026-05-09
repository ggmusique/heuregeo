import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

declare const __APP_VERSION__: string;

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const sw = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
      },
    });
    setUpdateSW(() => sw);
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    updateSW?.(true);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[1200] animate-in slide-in-from-bottom duration-300">
      <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-[var(--color-bg)]/98 to-[var(--color-surface)]/98 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-2xl">
              🚀
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-[var(--color-primary)]">
                Nouvelle version disponible
              </p>
              <p className="text-xs text-white/50">
                Version {__APP_VERSION__}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setNeedRefresh(false)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white/70 transition-all hover:bg-white/10 active:scale-95"
            >
              Plus tard
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[color-mix(in_srgb,var(--color-primary)_80%,black)] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[var(--color-bg)] shadow-lg transition-all hover:from-[color-mix(in_srgb,var(--color-primary)_120%,white)] hover:to-[var(--color-primary)] active:scale-95"
            >
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        // noop
      },
    });

    return () => {
      if (typeof updateSW === "function") {
        updateSW(false);
      }
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[1200] rounded-2xl border border-yellow-400/40 bg-[#0B1220]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-yellow-300">
          Nouvelle version disponible
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-black uppercase text-slate-900"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

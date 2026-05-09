import React, { useEffect, useRef, useState } from "react";

interface CustomAlertProps {
  show: boolean;
  message: string;
  onDismiss: () => void;
}

/**
 * CustomAlert (amélioré)
 * - Auto-fermeture après 3 secondes quand `show` passe à true
 * - Bouton ✕ pour fermer
 * - Barre de progression (3s)
 * - Même API: { show, message, onDismiss }
 */
export const CustomAlert = React.memo(({ show, message, onDismiss }: CustomAlertProps) => {
  const DURATION_MS = 3000;

  const [progress, setProgress] = useState(100); // 100 -> 0
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) {
      // reset propre
      setProgress(100);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }

    // ✅ reset au moment où l'alerte s'affiche
    setProgress(100);
    startRef.current = performance.now();

    // ✅ animation fluide de la barre
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    // ✅ fermeture auto à 3s
    timeoutRef.current = setTimeout(() => {
      onDismiss?.();
    }, DURATION_MS);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div className="fixed top-12 left-5 right-5 z-[200] animate-in slide-in-from-top duration-500">
      <div
        onClick={onDismiss}
        className="relative cursor-pointer bg-gradient-to-r from-red-600/40 to-rose-600/40 backdrop-blur-2xl border-2 border-red-500/60 p-5 rounded-[25px] shadow-[0_10px_40px_color-mix(in_srgb,var(--color-accent-red)_60%,transparent)]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onDismiss?.();
        }}
      >
        {/* Contenu */}
        <div className="flex items-center gap-4">
          <span className="text-3xl drop-shadow-lg">⚠️</span>

          <p className="text-white font-black uppercase text-[13px] tracking-wider leading-tight drop-shadow flex-1">
            {message}
          </p>

          {/* Bouton ✕ */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            className="ml-2 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black flex items-center justify-center active:scale-95 transition-all"
            aria-label="Fermer l'alerte"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {/* ✅ Barre de progression */}
        <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-white/70 rounded-full transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
});

CustomAlert.displayName = "CustomAlert";

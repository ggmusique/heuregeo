// src/components/ui/Modal.tsx
// Wrapper modal générique tokenisé — utilise les CSS vars du thème actif.
import React, { useEffect, useCallback } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Taille max de la carte : sm | md | lg (défaut md) */
  size?: "sm" | "md" | "lg";
  /** Afficher le bouton ✕ dans le header */
  closable?: boolean;
}

const SIZE_CLS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function Modal({
  show,
  onClose,
  title,
  children,
  size = "md",
  closable = true,
}: ModalProps) {
  // Fermer sur Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (!show) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [show, handleKey]);

  const trapRef = useFocusTrap(show);

  if (!show) return null;

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-6"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Carte */}
      <div
        className={
          "relative w-full " +
          SIZE_CLS[size] +
          " bg-[var(--color-surface)] border border-[var(--color-border)] " +
          "rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] " +
          "shadow-modal backdrop-blur-modal p-6 space-y-4"
        }
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between gap-2 pb-1">
            {title && (
              <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-text)]">
                {title}
              </h2>
            )}
            {closable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

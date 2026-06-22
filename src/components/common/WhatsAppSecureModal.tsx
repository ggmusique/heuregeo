import React, { useMemo, useState } from "react";
import { evaluatePasswordStrength } from "../../utils/pdfPassword";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface WhatsAppSecureModalProps {
  open: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void> | void;
}

const strengthColorMap = {
  faible: "var(--color-accent-red)",
  moyenne: "var(--color-accent-amber)",
  forte: "var(--color-accent-green)",
} as const;

export function WhatsAppSecureModal({
  open,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: WhatsAppSecureModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const passwordResult = useMemo(() => evaluatePasswordStrength(password), [password]);

  if (!open) return null;

  const trapRef = useFocusTrap(open);

  const handleCopy = async () => {
    if (!password.trim()) return;
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleSubmit = async () => {
    if (!passwordResult.isValid || isSubmitting) return;
    await onSubmit(password);
  };

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[700] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        style={{
          background: "var(--color-overlay)",
          backdropFilter: "var(--blur-overlay)",
          WebkitBackdropFilter: "var(--blur-overlay)",
        }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg rounded-[28px] border overflow-hidden animate-in zoom-in-95 duration-300"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
          boxShadow: "var(--shadow-lg, 0 18px 40px var(--color-overlay))",
        }}
      >
        <div
          className="px-6 py-5 border-b"
          style={{
            borderColor: "var(--color-border)",
            background: "linear-gradient(135deg, var(--color-surface-2), var(--color-surface))",
          }}
        >
          <h3 className="text-lg font-black tracking-tight">Sécuriser le PDF</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Ce PDF sera protégé par mot de passe avant l&apos;envoi WhatsApp.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-text-dim)" }}>
              Mot de passe PDF
            </span>
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="********"
                className="w-full rounded-xl px-3 py-3 border text-sm"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg-input)",
                  color: "var(--color-text)",
                  transition: "border-color 180ms ease",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-xl px-3 py-3 border text-xs font-bold uppercase tracking-[0.08em]"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                  background: "var(--color-surface-offset)",
                  transition: "opacity 160ms ease, transform 160ms ease",
                }}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--color-text-muted)" }}>
                Sécurité: <strong style={{ color: strengthColorMap[passwordResult.strength] }}>{passwordResult.strength}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!password.trim()}
                className="font-bold uppercase tracking-[0.08em]"
                style={{
                  color: password.trim() ? "var(--color-accent-cyan)" : "var(--color-text-faint)",
                  transition: "opacity 160ms ease",
                }}
              >
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-offset)" }}>
              <div
                className="h-full"
                style={{
                  width: `${Math.max(12, Math.min(100, passwordResult.score * 20))}%`,
                  background: strengthColorMap[passwordResult.strength],
                  transition: "width 220ms ease, background-color 220ms ease",
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {passwordResult.message}
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold" style={{ color: "var(--color-accent-red)" }}>
              {errorMessage}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-1/2 rounded-xl px-4 py-3 border text-xs font-black uppercase tracking-[0.11em]"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-offset)",
              color: "var(--color-text-muted)",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!passwordResult.isValid || isSubmitting}
            className="w-full sm:w-1/2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.11em]"
            style={{
              border: `1px solid ${!passwordResult.isValid || isSubmitting ? "var(--color-border)" : "var(--color-border-green)"}`,
              background: !passwordResult.isValid || isSubmitting
                ? "var(--color-surface-offset)"
                : "color-mix(in srgb, var(--color-accent-green) 22%, var(--color-surface))",
              color: !passwordResult.isValid || isSubmitting ? "var(--color-text-faint)" : "var(--color-accent-green)",
              transition: "opacity 160ms ease",
            }}
          >
            {isSubmitting ? "Envoi..." : "Sécuriser et envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
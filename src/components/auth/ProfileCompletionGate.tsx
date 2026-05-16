import React, { useState } from "react";
import type { UserProfile } from "../../types/profile";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileCompletionGateProps {
  profile: UserProfile | null;
  saving: boolean;
  onSave: (data: Partial<UserProfile>) => Promise<any>;
  children: React.ReactNode;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Affiche le formulaire de complétion du profil si prenom/nom ne sont pas renseignés.
 * Remplace l'ancien OnboardingForm.
 */
export function ProfileCompletionGate({
  profile,
  saving,
  onSave,
  children,
}: ProfileCompletionGateProps) {
  const needsCompletion =
    profile !== null &&
    profile.profile_complete !== true &&
    (!profile.prenom || !profile.nom);

  if (!needsCompletion) {
    return <>{children}</>;
  }

  return <CompletionForm profile={profile} saving={saving} onSave={onSave} />;
}

// ─── Formulaire interne ───────────────────────────────────────────────────────

interface FormState {
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
}

function CompletionForm({
  profile,
  saving,
  onSave,
}: {
  profile: UserProfile;
  saving: boolean;
  onSave: (data: Partial<UserProfile>) => Promise<any>;
}) {
  const [form, setForm] = useState<FormState>({
    prenom: profile.prenom ?? "",
    nom: profile.nom ?? "",
    telephone: (profile as any).telephone ?? "",
    adresse: profile.adresse ?? "",
    code_postal: profile.code_postal ?? "",
    ville: profile.ville ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = form.prenom.trim() !== "" && form.nom.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting || saving) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        telephone: form.telephone.trim() || null,
        adresse: form.adresse.trim() || null,
        code_postal: form.code_postal.trim() || null,
        ville: form.ville.trim() || null,
        profile_complete: true,
      } as Partial<UserProfile>);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  const inp = (key: keyof FormState, placeholder: string, type = "text") => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="w-full p-4 rounded-2xl bg-[var(--color-field,var(--color-surface-offset))] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] font-semibold text-base focus:outline-none focus:border-[var(--color-border-primary,var(--color-primary))] transition-all"
    />
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-[var(--color-primary)]">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-[var(--color-text)] mb-2">
            Bienvenue !
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Complète ton profil pour commencer
          </p>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md,1.5rem)] p-8 space-y-4 backdrop-blur-[var(--blur-card)]"
        >
          {/* Identité */}
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-primary)] opacity-80">
            Identité *
          </p>

          {inp("prenom", "Prénom *")}
          {inp("nom", "Nom *")}

          {/* Coordonnées */}
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)] pt-2">
            Coordonnées (optionnel)
          </p>

          {inp("telephone", "Téléphone", "tel")}
          {inp("adresse", "Adresse")}

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Code postal"
              value={form.code_postal}
              onChange={(e) => setForm((f) => ({ ...f, code_postal: e.target.value }))}
              className="w-1/3 p-4 rounded-2xl bg-[var(--color-field,var(--color-surface-offset))] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] font-semibold text-base focus:outline-none focus:border-[var(--color-border-primary,var(--color-primary))] transition-all"
            />
            <input
              type="text"
              placeholder="Ville"
              value={form.ville}
              onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
              className="flex-1 p-4 rounded-2xl bg-[var(--color-field,var(--color-surface-offset))] border-2 border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] font-semibold text-base focus:outline-none focus:border-[var(--color-border-primary,var(--color-primary))] transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || submitting || saving}
            className="w-full mt-2 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all bg-[var(--color-primary)] text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting || saving ? "Enregistrement…" : "Commencer"}
          </button>
        </form>
      </div>
    </div>
  );
}

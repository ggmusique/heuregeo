// src/components/common/ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────────────────
// React Error Boundary — capture les erreurs de rendu dans l'arbre enfant.
//
// USAGE :
//   <ErrorBoundary>
//     <MonComposant />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<div>Erreur personnalisée</div>}>
//     <MonComposant />
//   </ErrorBoundary>
//
// Les erreurs sont envoyées à Sentry en production.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { monitoring } from "../../lib/monitoring";

interface Props {
  children: React.ReactNode;
  /** Fallback UI optionnel. Sinon, affiche un écran d'erreur générique. */
  fallback?: React.ReactNode;
  /** Contexte pour les logs (ex: nom de la vue) */
  context?: string;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    monitoring.captureError(error, {
      route: window.location.pathname,
      context: this.props.context ?? "ErrorBoundary",
      componentStack: info.componentStack?.slice(0, 500) ?? undefined,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorId: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-modal p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            Une erreur inattendue s&apos;est produite
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            L&apos;équipe technique a été notifiée automatiquement.
            {this.state.errorId && (
              <span className="block mt-1 text-xs font-mono text-[var(--color-text-dim)]">
                Réf : {this.state.errorId.slice(0, 8)}
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[var(--color-accent-violet)] text-white rounded-lg text-sm hover:opacity-90 transition-[opacity] duration-150"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

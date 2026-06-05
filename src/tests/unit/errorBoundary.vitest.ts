// src/tests/unit/errorBoundary.vitest.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests de l'ErrorBoundary React
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";

// Mock du module monitoring pour éviter les appels Sentry en test
vi.mock("../../lib/monitoring", () => ({
  monitoring: {
    captureError: vi.fn(),
    captureMessage: vi.fn(),
    setUser: vi.fn(),
    clearUser: vi.fn(),
  },
  initMonitoring: vi.fn(),
}));

// Composant qui lance une erreur de rendu (pour les tests)
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error("Erreur de rendu simulée pour les tests");
  }
  return React.createElement("div", { "data-testid": "working" }, "Composant fonctionnel");
}

// Supprimer les logs d'erreur React dans les tests (bruit inutile)
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe("ErrorBoundary", () => {
  it("affiche les enfants quand tout va bien", () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(BrokenComponent, { shouldThrow: false })
      )
    );
    expect(screen.getByTestId("working")).toBeInTheDocument();
  });

  it("affiche le fallback générique quand un enfant crash", () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(BrokenComponent, { shouldThrow: true })
      )
    );
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
  });

  it("affiche un fallback personnalisé si fourni", () => {
    render(
      React.createElement(
        ErrorBoundary,
        {
          fallback: React.createElement("div", { "data-testid": "custom-fallback" }, "Mon fallback"),
          children: React.createElement(BrokenComponent, { shouldThrow: true }),
        },
      )
    );
    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  it("affiche le bouton Réessayer", () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(BrokenComponent, { shouldThrow: true })
      )
    );
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
  });

  it("appelle monitoring.captureError lors d'un crash", async () => {
    const { monitoring } = await import("../../lib/monitoring");

    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(BrokenComponent, { shouldThrow: true })
      )
    );

    expect(monitoring.captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ context: expect.any(String) })
    );
  });

  it("le bouton Réessayer réinitialise l'état de l'ErrorBoundary", () => {
    // On rend un composant contrôlé par un état parent
    let shouldThrow = true;

    function ControlledBroken(): React.ReactElement {
      if (shouldThrow) {
        throw new Error("Erreur simulée");
      }
      return React.createElement("div", { "data-testid": "recovered" }, "Récupéré");
    }

    const { rerender } = render(
      React.createElement(ErrorBoundary, null, React.createElement(ControlledBroken))
    );

    // L'erreur doit être capturée
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();

    // On désactive l'erreur et on clique sur Réessayer
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    // Re-render pour que React repasse par le render
    rerender(
      React.createElement(ErrorBoundary, null, React.createElement(ControlledBroken))
    );

    // Maintenant le composant doit être récupéré
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
  });

  it("ne transmet pas les détails techniques dans le message affiché", () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(BrokenComponent, { shouldThrow: true })
      )
    );

    // Le message affiché NE DOIT PAS contenir la stack trace brute
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(/at BrokenComponent/);
    expect(bodyText).not.toMatch(/TypeError|ReferenceError|SyntaxError/);
    // Mais doit contenir un message générique
    expect(bodyText).toMatch(/erreur inattendue/i);
  });
});

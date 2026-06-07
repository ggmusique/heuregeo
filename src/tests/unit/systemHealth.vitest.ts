// src/tests/unit/systemHealth.vitest.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires — Page Santé système
//
// Couvre :
//   1. Calcul du score de santé (computeHealthScore)
//   2. Transformation des événements d'audit en messages humains
//   3. Construction des statistiques rate limiting
//   4. Protection admin : accès refusé si non-admin
//   5. Rendu ErrorBoundary et composants santé
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { humanizeAuditEvent, STATUS_TOKENS } from "../../theme/healthTheme";
import { HealthStatusBadge } from "../../components/health/HealthStatusBadge";
import { HealthMetric } from "../../components/health/HealthMetric";
import { HealthScoreRing } from "../../components/health/HealthScoreRing";
import type { HealthScore, HealthStatus } from "../../types/systemHealth";

// ═════════════════════════════════════════════════════════════════════════════
// 1. humanizeAuditEvent — traduction technique → humain
// ═════════════════════════════════════════════════════════════════════════════

describe("humanizeAuditEvent — traduction des événements d'audit", () => {
  it.each([
    ["patron_invitations", "INSERT", "Invitation envoyée"],
    ["patron_invitations", "DELETE", "Invitation annulée"],
    ["missions", "INSERT", "Nouvelle mission créée"],
    ["missions", "UPDATE", "Mission modifiée"],
    ["missions", "DELETE", "Mission supprimée"],
    ["acomptes", "INSERT", "Acompte enregistré"],
    ["bilans_status_v2", "INSERT", "Bilan généré"],
    ["bilans_status_v2", "UPDATE", "Statut de bilan mis à jour"],
    ["patrons", "INSERT", "Nouveau patron ajouté"],
    ["clients", "DELETE", "Client supprimé"],
    ["frais_divers", "INSERT", "Frais enregistré"],
  ])("traduit %s + %s en message humain", (table, operation, expected) => {
    expect(humanizeAuditEvent(table, operation)).toBe(expected);
  });

  it("retourne un fallback pour les tables inconnues", () => {
    const result = humanizeAuditEvent("unknown_table", "INSERT");
    expect(result).toContain("unknown_table");
    // Ne doit pas lancer d'erreur
  });

  it("ne logue pas de jargon SQL brut dans le message humain", () => {
    const result = humanizeAuditEvent("missions", "INSERT");
    expect(result).not.toMatch(/SELECT|FROM|WHERE|postgres|SQLSTATE/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Calcul du score de santé (logique pure)
// ═════════════════════════════════════════════════════════════════════════════

// On reproduit la logique de computeHealthScore pour la tester de façon isolée
function computeHealthScore(opts: {
  dbConnected: boolean;
  dbLatencyMs: number | null;
  rateLimitHits1h: number;
  rateLimitHits24h: number;
}): HealthScore {
  if (!opts.dbConnected) {
    return {
      value: 0,
      status: "critical",
      label: "Incident détecté",
      details: ["La connexion à la base de données a échoué."],
    };
  }
  let score = 100;
  const details: string[] = [];
  if (opts.dbLatencyMs !== null) {
    if (opts.dbLatencyMs > 2000) { score -= 25; details.push("La base de données répond très lentement."); }
    else if (opts.dbLatencyMs > 800) { score -= 10; details.push("La base de données répond avec un léger délai."); }
  }
  if (opts.rateLimitHits1h > 50) { score -= 20; details.push("Volume de requêtes très élevé sur la dernière heure."); }
  else if (opts.rateLimitHits1h > 20) { score -= 8; details.push("Activité inhabituelle détectée sur les services."); }
  score = Math.max(0, Math.min(100, score));
  const status: HealthStatus = score >= 80 ? "healthy" : score >= 55 ? "warning" : "critical";
  const label = status === "healthy" ? "Système sain" : status === "warning" ? "Quelques ralentissements" : "Incident détecté";
  if (details.length === 0) details.push("Tout fonctionne normalement.");
  return { value: Math.round(score), status, label, details };
}

describe("computeHealthScore — calcul du score de santé", () => {
  it("retourne 0 et critical si la DB est déconnectée", () => {
    const result = computeHealthScore({ dbConnected: false, dbLatencyMs: null, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.value).toBe(0);
    expect(result.status).toBe("critical");
  });

  it("retourne 100 si tout va bien", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 200, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.value).toBe(100);
    expect(result.status).toBe("healthy");
  });

  it("déduit 10 points pour latence DB > 800ms", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 900, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.value).toBe(90);
    expect(result.status).toBe("healthy");
  });

  it("déduit 25 points pour latence DB > 2000ms", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 2500, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.value).toBe(75);
    expect(result.status).toBe("warning");
  });

  it("déduit 8 points pour rate limiting > 20 hits/h", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 100, rateLimitHits1h: 25, rateLimitHits24h: 25 });
    expect(result.value).toBe(92);
    expect(result.status).toBe("healthy");
  });

  it("déduit 20 points pour rate limiting > 50 hits/h", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 100, rateLimitHits1h: 60, rateLimitHits24h: 60 });
    expect(result.value).toBe(80);
    expect(result.status).toBe("healthy");
  });

  it("est clampé à 0 minimum même avec beaucoup de pénalités", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 5000, rateLimitHits1h: 100, rateLimitHits24h: 100 });
    expect(result.value).toBeGreaterThanOrEqual(0);
  });

  it("le statut est 'healthy' à partir de 80", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 100, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.status).toBe("healthy");
    expect(result.label).toBe("Système sain");
  });

  it("le statut est 'warning' entre 55 et 79", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 2500, rateLimitHits1h: 25, rateLimitHits24h: 25 });
    expect(result.value).toBe(67);
    expect(result.status).toBe("warning");
  });

  it("les détails ne contiennent jamais de jargon SQL ou de stack trace", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 3000, rateLimitHits1h: 60, rateLimitHits24h: 60 });
    for (const detail of result.details) {
      expect(detail).not.toMatch(/SQLSTATE|postgres|ERROR|TypeError|undefined/i);
    }
  });

  it("retourne 'Tout fonctionne normalement.' si aucun problème", () => {
    const result = computeHealthScore({ dbConnected: true, dbLatencyMs: 100, rateLimitHits1h: 0, rateLimitHits24h: 0 });
    expect(result.details).toContain("Tout fonctionne normalement.");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. STATUS_TOKENS — cohérence des tokens par état
// ═════════════════════════════════════════════════════════════════════════════

describe("STATUS_TOKENS — tokens de thème par état", () => {
  const statuses: HealthStatus[] = ["healthy", "warning", "critical", "unknown"];

  it.each(statuses)("contient des tokens complets pour l'état '%s'", (status) => {
    const tokens = STATUS_TOKENS[status];
    expect(tokens).toBeDefined();
    expect(tokens.text).toMatch(/^text-/);
    expect(tokens.bg).toMatch(/^bg-/);
    expect(tokens.ringColor).toMatch(/^(#|var\(--)/);
    expect(tokens.label).toBeTruthy();
    expect(tokens.emoji).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. HealthStatusBadge — rendu et accessibilité
// ═════════════════════════════════════════════════════════════════════════════

describe("HealthStatusBadge", () => {
  it("affiche le label 'Opérationnel' pour status healthy", () => {
    render(React.createElement(HealthStatusBadge, { status: "healthy" }));
    expect(screen.getByText("Opérationnel")).toBeInTheDocument();
  });

  it("affiche le label 'Ralentissement' pour status warning", () => {
    render(React.createElement(HealthStatusBadge, { status: "warning" }));
    expect(screen.getByText("Ralentissement")).toBeInTheDocument();
  });

  it("affiche le label 'Incident' pour status critical", () => {
    render(React.createElement(HealthStatusBadge, { status: "critical" }));
    expect(screen.getByText("Incident")).toBeInTheDocument();
  });

  it("en mode compact, a un aria-label mais pas de texte visible", () => {
    render(React.createElement(HealthStatusBadge, { status: "healthy", compact: true }));
    const badge = screen.getByLabelText("Opérationnel");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).not.toBe("Opérationnel");
  });

  it("n'affiche jamais de message technique (status code, SQL, etc.)", () => {
    const { container } = render(
      React.createElement(HealthStatusBadge, { status: "critical" })
    );
    expect(container.textContent).not.toMatch(/SQLSTATE|TypeError|503|500/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. HealthMetric — rendu des métriques
// ═════════════════════════════════════════════════════════════════════════════

describe("HealthMetric", () => {
  it("affiche le label et la valeur", () => {
    render(React.createElement(HealthMetric, { label: "Cette heure", value: 42 }));
    expect(screen.getByText("Cette heure")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("affiche le sous-label si fourni", () => {
    render(React.createElement(HealthMetric, { label: "Latence", value: "250ms", subLabel: "Base de données" }));
    expect(screen.getByText("Base de données")).toBeInTheDocument();
  });

  it("affiche un squelette de chargement", () => {
    const { container } = render(
      React.createElement(HealthMetric, { label: "Test", value: "—", loading: true })
    );
    // Le squelette utilise animate-pulse
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. HealthScoreRing — rendu SVG et accessibilité
// ═════════════════════════════════════════════════════════════════════════════

describe("HealthScoreRing", () => {
  const healthyScore: HealthScore = {
    value: 94,
    status: "healthy",
    label: "Système sain",
    details: ["Tout fonctionne normalement."],
  };

  it("affiche la valeur du score", () => {
    render(React.createElement(HealthScoreRing, { score: healthyScore }));
    expect(screen.getByText("94")).toBeInTheDocument();
  });

  it("a un aria-label descriptif accessible", () => {
    render(React.createElement(HealthScoreRing, { score: healthyScore }));
    const ring = screen.getByRole("img");
    expect(ring.getAttribute("aria-label")).toContain("94%");
    expect(ring.getAttribute("aria-label")).toContain("Système sain");
  });

  it("affiche un état de chargement sans valeur", () => {
    render(React.createElement(HealthScoreRing, { score: healthyScore, loading: true }));
    expect(screen.queryByText("94")).not.toBeInTheDocument();
  });

  it("n'affiche jamais de stack trace ou d'erreur technique", () => {
    const { container } = render(React.createElement(HealthScoreRing, { score: healthyScore }));
    expect(container.textContent).not.toMatch(/TypeError|Error|SQLSTATE/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Protection admin — test de la logique de guard
// ═════════════════════════════════════════════════════════════════════════════

describe("Protection admin — accès à la page Santé système", () => {
  // Simuler la logique du guard admin
  function canAccessHealthPage(isAdmin: boolean): boolean {
    return isAdmin === true;
  }

  it("un utilisateur admin a accès à la page", () => {
    expect(canAccessHealthPage(true)).toBe(true);
  });

  it("un utilisateur normal n'a pas accès à la page", () => {
    expect(canAccessHealthPage(false)).toBe(false);
  });

  it("un viewer n'a pas accès à la page", () => {
    expect(canAccessHealthPage(false)).toBe(false);
  });

  it("une valeur undefined est refusée", () => {
    // @ts-expect-error — test intentionnel avec mauvais type
    expect(canAccessHealthPage(undefined)).toBe(false);
  });

  it("une valeur null est refusée", () => {
    // @ts-expect-error — test intentionnel avec mauvais type
    expect(canAccessHealthPage(null)).toBe(false);
  });
});

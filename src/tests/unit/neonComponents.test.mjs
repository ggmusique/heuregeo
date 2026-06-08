import test from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import React from "react";
import { NeonInput }  from "../../components/ui/NeonInput.tsx";
import { GlassCard }  from "../../components/ui/GlassCard.tsx";

// ── NeonInput ────────────────────────────────────────────────

test("NeonInput: rendu contient le label", () => {
  const html = renderToString(
    React.createElement(NeonInput, {
      label: "Mon label",
      value: "",
      onChange: () => {},
    })
  );
  assert.ok(html.includes("Mon label"), "Le label doit apparaître dans le HTML rendu");
});

test("NeonInput: error affiche le message d'erreur", () => {
  const html = renderToString(
    React.createElement(NeonInput, {
      label: "Email",
      value: "",
      onChange: () => {},
      error: "Champ obligatoire",
    })
  );
  assert.ok(html.includes("Champ obligatoire"), "Le message d'erreur doit être rendu");
});

test("NeonInput: sans erreur, aucun message d'erreur affiché", () => {
  const html = renderToString(
    React.createElement(NeonInput, {
      label: "Email",
      value: "test@example.com",
      onChange: () => {},
    })
  );
  assert.ok(!html.includes("Champ obligatoire"), "Aucun message d'erreur sans la prop error");
});

test("NeonInput: color cyan applique la variable CSS glow cyan au focus (style serveur: pas de focus state)", () => {
  const html = renderToString(
    React.createElement(NeonInput, {
      label: "Test",
      value: "hello",
      onChange: () => {},
      color: "cyan",
    })
  );
  // Au SSR il n'y a pas d'état focus, mais la bordure par défaut est var(--color-border)
  assert.ok(html.includes("var(--color-border)"), "La bordure par défaut utilise var(--color-border)");
});

// ── GlassCard ────────────────────────────────────────────────

test("GlassCard: color=cyan applique var(--color-border-cyan)", () => {
  const html = renderToString(
    React.createElement(GlassCard, { color: "cyan" }, "Contenu")
  );
  assert.ok(
    html.includes("var(--color-border-cyan)"),
    "La bordure de GlassCard avec color=cyan doit utiliser var(--color-border-cyan)"
  );
});

test("GlassCard: color=primary applique var(--color-border-primary)", () => {
  const html = renderToString(
    React.createElement(GlassCard, { color: "primary" }, "Contenu")
  );
  assert.ok(
    html.includes("var(--color-border-primary)"),
    "La bordure de GlassCard avec color=primary doit utiliser var(--color-border-primary)"
  );
});

test("GlassCard: color=neutral applique var(--color-border-neutral)", () => {
  const html = renderToString(
    React.createElement(GlassCard, { color: "neutral" }, "Contenu")
  );
  assert.ok(
    html.includes("var(--color-border-neutral)"),
    "La bordure de GlassCard avec color=neutral doit utiliser var(--color-border-neutral)"
  );
});

test("GlassCard: glow=true ajoute le box-shadow glow pour color=violet", () => {
  const html = renderToString(
    React.createElement(GlassCard, { color: "violet", glow: true }, "Contenu")
  );
  assert.ok(
    html.includes("var(--glow-violet)"),
    "GlassCard avec glow=true et color=violet doit utiliser var(--glow-violet)"
  );
});

test("GlassCard: glow=false n'ajoute pas de box-shadow glow", () => {
  const html = renderToString(
    React.createElement(GlassCard, { color: "cyan", glow: false }, "Contenu")
  );
  assert.ok(
    !html.includes("var(--glow-cyan)"),
    "GlassCard avec glow=false ne doit pas avoir de glow"
  );
});

test("GlassCard: utilise var(--color-surface) comme fond", () => {
  const html = renderToString(
    React.createElement(GlassCard, {}, "Contenu")
  );
  assert.ok(
    html.includes("var(--color-surface)"),
    "GlassCard doit utiliser var(--color-surface) comme fond"
  );
});

test("GlassCard: applique le backdrop-filter blur-card", () => {
  const html = renderToString(
    React.createElement(GlassCard, {}, "Contenu")
  );
  assert.ok(
    html.includes("var(--blur-card)"),
    "GlassCard doit appliquer var(--blur-card) pour le backdrop-filter"
  );
});

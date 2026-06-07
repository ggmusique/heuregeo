// src/theme/healthTheme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tokens de thème pour la page Santé système.
// Tout est basé sur les variables CSS existantes — aucune couleur hardcodée.
// Compatible avec les futurs thèmes (neon, light, emerald-pro, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import type { HealthStatus } from "../types/systemHealth";

// ─── Tokens par état de santé ─────────────────────────────────────────────────

export interface StatusTokens {
  /** Classe texte Tailwind (CSS vars) */
  text: string;
  /** Classe fond Tailwind (CSS vars) */
  bg: string;
  /** Classe bordure Tailwind (CSS vars) */
  border: string;
  /** Box-shadow glow (CSS vars) */
  glow: string;
  /** Couleur pour SVG ring (CSS vars compatible) */
  ringColor: string;
  /** Emoji indicateur */
  emoji: string;
  /** Label humain de l'état */
  label: string;
}

export const STATUS_TOKENS: Record<HealthStatus, StatusTokens> = {
  healthy: {
    text: "text-[var(--color-accent-green)]",
    bg: "bg-[var(--color-accent-green)]/10",
    border: "border-[var(--color-accent-green)]/25",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.25)]",
    ringColor: "var(--color-accent-green)",
    emoji: "🟢",
    label: "Opérationnel",
  },
  warning: {
    text: "text-[var(--color-accent-amber)]",
    bg: "bg-[var(--color-accent-amber)]/10",
    border: "border-[var(--color-accent-amber)]/25",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    ringColor: "var(--color-accent-amber)",
    emoji: "🟡",
    label: "Ralentissement",
  },
  critical: {
    text: "text-[var(--color-accent-red)]",
    bg: "bg-[var(--color-accent-red)]/10",
    border: "border-[var(--color-accent-red)]/25",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",
    ringColor: "var(--color-accent-red)",
    emoji: "🔴",
    label: "Incident",
  },
  unknown: {
    text: "text-[var(--color-text-muted)]",
    bg: "bg-[var(--color-surface-offset)]",
    border: "border-[var(--color-border)]",
    glow: "",
    ringColor: "var(--color-text-muted)",
    emoji: "⚪",
    label: "Inconnu",
  },
};

// ─── Surface carte glassmorphism ──────────────────────────────────────────────

/** Classes de base pour une carte glass — réutilisables dans tous les composants health. */
export const GLASS_CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "backdrop-blur-card rounded-theme-lg transition-[border-color,background-color] duration-300";

/** Carte avec hover glow léger. */
export const GLASS_CARD_INTERACTIVE =
  GLASS_CARD + " hover:border-[rgba(255,255,255,0.12)] hover:bg-[var(--color-surface-hover)]";

// ─── Labels humains des actions rate limit ────────────────────────────────────

export const RATE_LIMIT_ACTION_LABELS: Record<string, string> = {
  SEND_PLANNING_EMAIL: "Envoi de planning",
  SEND_PATRON_INVITE: "Invitation patron",
};

// ─── Labels humains des tables audit ─────────────────────────────────────────

export const AUDIT_TABLE_LABELS: Record<string, Record<string, string>> = {
  patron_invitations: {
    INSERT: "Invitation envoyée",
    UPDATE: "Invitation mise à jour",
    DELETE: "Invitation annulée",
  },
  missions: {
    INSERT: "Nouvelle mission créée",
    UPDATE: "Mission modifiée",
    DELETE: "Mission supprimée",
  },
  acomptes: {
    INSERT: "Acompte enregistré",
    UPDATE: "Acompte modifié",
    DELETE: "Acompte supprimé",
  },
  acompte_allocations: {
    INSERT: "Acompte appliqué à un bilan",
    UPDATE: "Allocation d'acompte modifiée",
    DELETE: "Acompte désappliqué",
  },
  bilans_status_v2: {
    INSERT: "Bilan généré",
    UPDATE: "Statut de bilan mis à jour",
    DELETE: "Bilan supprimé",
  },
  patrons: {
    INSERT: "Nouveau patron ajouté",
    UPDATE: "Patron modifié",
    DELETE: "Patron supprimé",
  },
  clients: {
    INSERT: "Nouveau client ajouté",
    UPDATE: "Client modifié",
    DELETE: "Client supprimé",
  },
  frais_divers: {
    INSERT: "Frais enregistré",
    UPDATE: "Frais modifié",
    DELETE: "Frais supprimé",
  },
};

/** Retourne le message humain pour un événement d'audit. */
export function humanizeAuditEvent(tableName: string, operation: string): string {
  return (
    AUDIT_TABLE_LABELS[tableName]?.[operation] ??
    `Activité sur ${tableName} (${operation})`
  );
}

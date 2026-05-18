// src/theme/healthTheme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tokens de thème pour la page Santé système.
// Tout est basé sur les variables CSS existantes — aucune couleur hardcodée.
// Compatible avec les futurs thèmes (neon, light, emerald-pro, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import type { HealthStatus } from "../types/systemHealth";

// ─── Tokens par état de santé ─────────────────────────────────────────────────

export interface StatusTokens {
  /** Classe texte Tailwind */
  text: string;
  /** Classe fond Tailwind */
  bg: string;
  /** Classe bordure Tailwind */
  border: string;
  /** Box-shadow glow (classe Tailwind ou inline) */
  glow: string;
  /** Couleur hexadécimale pour SVG ring */
  ringColor: string;
  /** Emoji indicateur */
  emoji: string;
  /** Label humain de l'état */
  label: string;
}

export const STATUS_TOKENS: Record<HealthStatus, StatusTokens> = {
  healthy: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    glow: "shadow-glow-green",
    ringColor: "#34d399",
    emoji: "🟢",
    label: "Opérationnel",
  },
  warning: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    ringColor: "#f59e0b",
    emoji: "🟡",
    label: "Ralentissement",
  },
  critical: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",
    ringColor: "#ef4444",
    emoji: "🔴",
    label: "Incident",
  },
  unknown: {
    text: "text-[var(--color-text-muted)]",
    bg: "bg-[var(--color-surface-offset)]",
    border: "border-[var(--color-border)]",
    glow: "",
    ringColor: "#6b7280",
    emoji: "⚪",
    label: "Inconnu",
  },
};

// ─── Surface carte glassmorphism ──────────────────────────────────────────────

/** Classes de base pour une carte glass — réutilisables dans tous les composants health. */
export const GLASS_CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "backdrop-blur-card rounded-theme-lg transition-all duration-300";

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

/**
 * Types liés à l'interface utilisateur (états, navigation, modales).
 */

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Identifiants des onglets de la barre de navigation principale.
 * Produits par useNavigation et consommés par AppNavBar.
 */
export type TabId =
  | "saisie"
  | "suivi"
  | "dashboard"
  | "agenda"
  | "parametres";

/** Élément de menu de la barre de navigation. */
export interface NavItem {
  id: TabId;
  label: string;
  icon?: string;
}

// ─── Alertes ─────────────────────────────────────────────────────────────────

/**
 * État de la snackbar/alerte en haut de page.
 * Géré par useAppUI (triggerAlert / dismissAlert).
 */
export interface AlertState {
  show: boolean;
  message: string;
  /** Sémantique visuelle optionnelle (non encore utilisée dans le code). */
  type?: "info" | "success" | "warning" | "error";
}

// ─── Modales génériques ───────────────────────────────────────────────────────

/**
 * État minimal d'une modale : ouverte ou fermée.
 * Utilisé comme base pour les états de modales simples (boolean flag).
 */
export interface ModalBaseState {
  open: boolean;
}

/**
 * État d'une modale portant des données d'édition (ex : FraisModal, AcompteModal).
 * T = type de la donnée embarquée (ex : FraisDivers, Acompte).
 */
export interface ModalDataState<T> {
  open: boolean;
  /** null = création ; objet = édition d'un enregistrement existant. */
  data: T | null;
}

// ─── Confirmation ────────────────────────────────────────────────────────────

/**
 * État du dialog de confirmation (useConfirm).
 */
export interface ConfirmState {
  show: boolean;
  message: string;
  onConfirm: (() => void) | null;
  onCancel?: (() => void) | null;
}

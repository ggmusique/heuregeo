import type { TabId } from "../../types/ui";

/**
 * Onglets affichés en permanence dans la barre de navigation du bas.
 * Les autres onglets (Agenda, Paramètres, Santé…) ainsi que la déconnexion
 * viewer sont déplacés dans le menu burger (NavDrawer) afin de désengorger
 * la navbar, en particulier sur iPhone.
 */
export const CORE_TAB_KEYS: TabId[] = ["saisie", "dashboard", "suivi"];

import { useState, useCallback } from "react";

/**
 * Hook pour gérer les confirmations modales
 *
 * 👉 Son but :
 * - Tu appelles:  const ok = await showConfirm({ ... })
 * - Ça affiche la modal
 * - Et ça te rend true (confirmé) ou false (annulé)
 *
 * Dans App.jsx tu l'utilises pour :
 * - "Supprimer mission ?"
 * - "Supprimer client ?"
 * - "Marquer comme payé ?"
 */
export const useConfirm = () => {
  // ------------------------------------------------------------
  // 1) ÉTAT DE LA MODAL (ce que ConfirmModal affiche)
  // ------------------------------------------------------------
  const [confirmState, setConfirmState] = useState({
    show: false,       // 👈 visible ou non
    title: "",         // titre dans la popup
    message: "",       // texte dans la popup
    confirmText: "",   // texte bouton confirmer
    cancelText: "",    // texte bouton annuler
    type: "danger",    // style (danger / warning / info)
    onConfirm: () => {}, // fonction appelée si on clique "confirmer"
    onCancel: () => {},  // fonction appelée si on clique "annuler"
  });

  // ------------------------------------------------------------
  // 2) showConfirm(options) -> PROMESSE qui résout true/false
  // ------------------------------------------------------------
  /**
   * Affiche une modal de confirmation
   *
   * ✅ Le truc magique :
   * showConfirm retourne une Promise
   * Donc tu peux faire:  const confirmed = await showConfirm(...)
   */
  const showConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      // On configure la modal
      setConfirmState({
        show: true,
        title: options.title || "Confirmation",
        message: options.message || "Êtes-vous sûr ?",
        confirmText: options.confirmText || "Confirmer",
        cancelText: options.cancelText || "Annuler",
        type: options.type || "danger",

        // Si l'utilisateur confirme :
        onConfirm: () => {
          // 1) on cache la modal
          setConfirmState((prev) => ({ ...prev, show: false }));
          // 2) on renvoie "true" au await
          resolve(true);
        },

        // Si l'utilisateur annule :
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, show: false }));
          resolve(false);
        },
      });
    });
  }, []);

  // ------------------------------------------------------------
  // 3) hideConfirm() -> ferme la modal (ex: clic dehors, bouton X, etc.)
  // ------------------------------------------------------------
  /**
   * Cache la modal de confirmation
   * Astuce : si elle était visible, on appelle aussi onCancel()
   */
  const hideConfirm = useCallback(() => {
    setConfirmState((prev) => {
      // Si la modal était visible -> on considère que c'est un "cancel"
      if (prev.show && typeof prev.onCancel === "function") {
        prev.onCancel();
      }
      return { ...prev, show: false };
    });
  }, []);

  // ------------------------------------------------------------
  // 4) Ce que App.jsx récupère
  // ------------------------------------------------------------
  return { confirmState, showConfirm, hideConfirm };
};

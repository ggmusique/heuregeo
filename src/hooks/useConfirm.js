import { useState, useCallback } from "react";

/**
 * Hook pour gérer les confirmations modales
 * @returns {Object} - { confirmState, showConfirm, hideConfirm }
 */
export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    type: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  });

  /**
   * Affiche une modal de confirmation
   * @param {Object} options - Options de la modal
   * @param {string} options.title - Titre de la modal
   * @param {string} options.message - Message de confirmation
   * @param {string} options.confirmText - Texte du bouton de confirmation
   * @param {string} options.cancelText - Texte du bouton d'annulation
   * @param {string} options.type - Type de confirmation (danger, warning, info)
   * @returns {Promise<boolean>} - true si confirmé, false si annulé
   */
  const showConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        show: true,
        title: options.title || "Confirmation",
        message: options.message || "Êtes-vous sûr ?",
        confirmText: options.confirmText || "Confirmer",
        cancelText: options.cancelText || "Annuler",
        type: options.type || "danger",
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, show: false }));
          resolve(false);
        },
      });
    });
  }, []);

  /**
   * Cache la modal de confirmation
   * Appelle onCancel si défini
   */
  const hideConfirm = useCallback(() => {
    setConfirmState((prev) => {
      // Appeler onCancel si la modal était visible
      if (prev.show && typeof prev.onCancel === "function") {
        prev.onCancel();
      }
      return { ...prev, show: false };
    });
  }, []);

  return { confirmState, showConfirm, hideConfirm };
};

import { useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConfirmType = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
}

export type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

export interface ConfirmState {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: ConfirmType;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface UseConfirmReturn {
  confirmState: ConfirmState;
  showConfirm: (options?: ConfirmOptions) => Promise<boolean>;
  hideConfirm: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useConfirm = (): UseConfirmReturn => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    type: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showConfirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
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

  const hideConfirm = useCallback((): void => {
    setConfirmState((prev) => {
      if (prev.show && typeof prev.onCancel === "function") {
        prev.onCancel();
      }
      return { ...prev, show: false };
    });
  }, []);

  return { confirmState, showConfirm, hideConfirm };
};

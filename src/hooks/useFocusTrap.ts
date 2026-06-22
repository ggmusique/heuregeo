import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const el = ref.current;
    const prev = document.activeElement as HTMLElement | null;

    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length > 0) focusable[0].focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [active]);

  return ref;
}

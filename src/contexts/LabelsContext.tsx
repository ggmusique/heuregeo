import { createContext, useContext } from "react";
import { DEFAULT_LABELS } from "../utils/labels";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LabelsContextType {
  patron: string;
  client: string;
  lieu: string;
  mission: string;
  patrons: string;
  clients: string;
  lieux: string;
  missions: string;
  [key: string]: string;
}

// ─── Contexte ────────────────────────────────────────────────────────────────

export const LabelsContext = createContext<LabelsContextType | undefined>(undefined);

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function useLabels(): LabelsContextType {
  const ctx = useContext(LabelsContext);
  if (ctx === undefined) {
    throw new Error("useLabels must be used within a LabelsContext.Provider");
  }
  return ctx;
}

export { DEFAULT_LABELS };

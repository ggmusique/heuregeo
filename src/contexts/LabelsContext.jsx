import { createContext, useContext } from "react";
import { DEFAULT_LABELS } from "../utils/labels";

export const LabelsContext = createContext(DEFAULT_LABELS);

/** Hook à utiliser dans n'importe quel composant ou hook React. */
export function useLabels() {
  return useContext(LabelsContext);
}

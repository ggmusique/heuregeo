import { createContext, useContext } from "react";

/**
 * DataContext — Données métier partagées entre les composants.
 *
 * Contient : missions, patrons, clients, lieux, fraisDivers, listeAcomptes,
 *            kmSettings, domicileLatLng, et les fonctions CRUD associées.
 *
 * Utilisation :
 *   import { useData } from "../contexts/DataContext";
 *   const { missions, patrons, createMission } = useData();
 */

export const DataContext = createContext(null);

/**
 * Hook pour accéder au contexte Data.
 * @returns {object} Toutes les données métier et fonctions CRUD
 */
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataContext.Provider");
  }
  return ctx;
}

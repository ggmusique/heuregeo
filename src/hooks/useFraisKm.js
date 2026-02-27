import { useState, useCallback, useRef } from "react";
import * as fraisKmApi from "../services/api/fraisKmApi";
import { getWeekNumber } from "../utils/dateUtils";

export const useFraisKm = (onError) => {
  const [fraisKm, setFraisKm] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFetching = useRef(false);

  const fetchFraisKm = useCallback(async () => {
    if (isFetching.current) return;
    try {
      isFetching.current = true;
      setLoading(true);
      const rows = await fraisKmApi.fetchFraisKm();
      setFraisKm(rows || []);
      return rows || [];
    } catch (err) {
      onError?.("Erreur chargement frais kilométriques");
      throw err;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [onError]);

  const createFraisKm = useCallback(async (row) => {
    try {
      setLoading(true);
      const created = await fraisKmApi.createFraisKm(row);
      if (created) setFraisKm((prev) => [...prev, created].sort((a,b)=>(a.date_frais||"").localeCompare(b.date_frais||"")));
      return created;
    } catch (err) {
      onError?.("Erreur création frais kilométrique");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const getFraisKmByWeek = useCallback((weekNumber, patronId = null) => {
    if (!weekNumber) return [];
    let filtered = fraisKm.filter((f) => f?.date_frais && getWeekNumber(new Date(f.date_frais)) === weekNumber);
    if (patronId) filtered = filtered.filter((f) => f?.patron_id === patronId);
    return filtered;
  }, [fraisKm]);

  const getTotalFraisKm = useCallback((rows) => {
    const list = Array.isArray(rows) ? rows : fraisKm;
    return list.reduce((sum, f) => sum + (Number(f?.amount ?? f?.montant) || 0), 0);
  }, [fraisKm]);

  return { fraisKm, loading, fetchFraisKm, createFraisKm, getFraisKmByWeek, getTotalFraisKm };
};

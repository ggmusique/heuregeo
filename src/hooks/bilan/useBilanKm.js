/**
 * useBilanKm.js — Calcul et persistance des frais kilométriques pour les bilans.
 *
 * Extrait de useBilan.js : isole toute la logique de calcul KM
 * (Haversine, barème par pays, upsert Supabase).
 *
 * Les appels Supabase passent par les services API
 * (fraisKmApi) — plus d'import direct de supabase.
 * La résolution de lieu utilise le utilitaire partagé lieuUtils.
 */

import { useCallback, useState } from "react";
import { supabase } from "../../services/supabase";
import { KM_RATES } from "../../utils/kmRatesByCountry";
import { haversineKm, getLieuLabel } from "../../utils/calculators";
import { resolveLieu } from "../../utils/lieuUtils";
import { PERIOD_TYPES } from "./bilanConstants";

// Services API
import { upsertFraisKm } from "../../services/api/fraisKmApi";

/**
 * Calcule les frais kilométriques pour une liste de missions.
 *
 * @param {object} params
 * @param {Array} params.missions - Missions filtrées
 * @param {Array} params.lieux - Liste des lieux
 * @param {object} params.kmSettings - Paramètres KM
 * @param {object|null} params.domicileLatLng - Coordonnées domicile {lat, lng}
 * @returns {{ items: Array, totalKm: number, totalAmount: number }}
 */
export const computeFraisKm = ({
  missions,
  lieux,
  kmSettings,
  domicileLatLng,
}) => {
  const result = { items: [], totalKm: 0, totalAmount: 0 };

  if (!kmSettings?.km_enable) return result;

  const effectiveDomicile = domicileLatLng ?? (
    Number.isFinite(kmSettings?.km_domicile_lat) &&
    Number.isFinite(kmSettings?.km_domicile_lng)
      ? { lat: kmSettings.km_domicile_lat, lng: kmSettings.km_domicile_lng }
      : null
  );

  if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) return result;

  const kmRateEffectif =
    kmSettings.km_rate_mode === "CUSTOM"
      ? parseFloat(kmSettings.km_rate) || 0
      : KM_RATES[kmSettings.km_country_code || "FR"] || 0.42;
  const multiplicateur = kmSettings.km_include_retour ? 2 : 1;

  missions.forEach((m) => {
    const lieu = resolveLieu(lieux, m);
    const latLieu = Number(lieu?.latitude);
    const lngLieu = Number(lieu?.longitude);
    const typeLabel =
      lieu?.type && lieu.type !== "client"
        ? ` (${lieu.type.toUpperCase()})`
        : "";

    if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
      const kmOneWay = haversineKm(
        effectiveDomicile.lat,
        effectiveDomicile.lng,
        latLieu,
        lngLieu
      );
      const kmTotal = kmOneWay * multiplicateur;
      const amount = kmTotal * kmRateEffectif;
      result.items.push({
        missionId: m.id,
        date: m.date_iso,
        labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
        kmOneWay,
        kmTotal,
        amount,
      });
      result.totalKm += kmTotal;
      result.totalAmount += amount;
    } else {
      result.items.push({
        missionId: m.id,
        date: m.date_iso,
        labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
        kmOneWay: null,
        kmTotal: null,
        amount: null,
      });
    }
  });

  return result;
};

/**
 * Hook pour la gestion des frais kilométriques dans les bilans.
 *
 * @param {object} params
 * @param {Function} params.triggerAlert
 */
export function useBilanKm({ triggerAlert }) {
  const [isRecalculatingKm, setIsRecalculatingKm] = useState(false);

  /**
   * Recalcule les frais KM en DB pour la période courante et régénère le bilan.
   *
   * @param {object} params
   * @param {string|null} params.patronId
   * @param {Array} params.missionsList - Missions du bilan courant
   * @param {Array} params.lieux
   * @param {object} params.kmSettings
   * @param {object|null} params.domicileLatLng
   * @param {Function} params.genererBilan - Pour re-générer le bilan après recalcul
   */
  const recalculerFraisKm = useCallback(
    async ({
      patronId,
      missionsList,
      lieux,
      kmSettings,
      domicileLatLng,
      genererBilan,
    }) => {
      const effectiveDomicile = domicileLatLng ?? (
        Number.isFinite(kmSettings?.km_domicile_lat) &&
        Number.isFinite(kmSettings?.km_domicile_lng)
          ? { lat: kmSettings.km_domicile_lat, lng: kmSettings.km_domicile_lng }
          : null
      );
      if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) {
        triggerAlert?.(
          "🚗 Domicile non configuré. Vérifiez Paramètres → Km."
        );
        return;
      }

      if (!missionsList || missionsList.length === 0) {
        triggerAlert?.("Aucune mission pour cette période.");
        return;
      }

      try {
        setIsRecalculatingKm(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return;
        }

        const kmRateEffectif =
          kmSettings.km_rate_mode === "CUSTOM"
            ? parseFloat(kmSettings.km_rate) || 0
            : KM_RATES[kmSettings.km_country_code || "FR"] || 0.42;
        const multiplicateur = kmSettings.km_include_retour ? 2 : 1;
        const countryCode = kmSettings.km_country_code || "FR";

        const rows = [];
        missionsList.forEach((m) => {
          const lieu = resolveLieu(lieux, m);
          const latLieu = Number(lieu?.latitude);
          const lngLieu = Number(lieu?.longitude);
          if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
            const kmOneWay = haversineKm(
              effectiveDomicile.lat,
              effectiveDomicile.lng,
              latLieu,
              lngLieu
            );
            const distanceKm = kmOneWay * multiplicateur;
            const amount = distanceKm * kmRateEffectif;
            rows.push({
              user_id: user.id,
              patron_id: m.patron_id || null,
              mission_id: m.id,
              date_frais: m.date_iso,
              country_code: countryCode,
              distance_km: distanceKm,
              rate_per_km: kmRateEffectif,
              amount,
              source: "auto",
            });
          }
        });

        if (rows.length === 0) {
          triggerAlert?.(
            "🚗 Aucun lieu géocodé — coordonnées GPS manquantes pour les lieux de mission."
          );
          return;
        }

        await upsertFraisKm(rows);

        triggerAlert?.(`✅ ${rows.length} ligne(s) km recalculée(s)`);
        await genererBilan(patronId);
      } catch (err) {
        console.error("❌ Erreur recalcul frais_km:", err);
        triggerAlert?.("Erreur lors du recalcul des frais km.");
      } finally {
        setIsRecalculatingKm(false);
      }
    },
    [triggerAlert]
  );

  return {
    isRecalculatingKm,
    recalculerFraisKm,
  };
}

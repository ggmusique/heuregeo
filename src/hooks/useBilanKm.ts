import { useState, useCallback } from "react";
import { KM_RATES } from "../utils/kmRatesByCountry";
import { haversineKm, getLieuLabel } from "../utils/calculators";
import { getCurrentUserOrNull } from "../services/authService";
import { upsertFraisKmRows } from "../services/bilanRepository";
import type { Mission, Lieu } from "../types/entities";
import type { FraisKmRow, BilanKmResult, BilanKmItem, MissionWithWeather } from "../types/bilan";
import type { KmSettings } from "./useKmDomicile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseBilanKmParams {
  kmSettings: KmSettings | null;
  domicileLatLng: { lat: number; lng: number } | null;
  lieux: Lieu[];
  triggerAlert: ((msg: string) => void) | undefined;
  genererBilan: (patronId?: string | null) => Promise<boolean | void>;
  bilanPeriodValue: string;
  filteredMissions: MissionWithWeather[];
}

export interface UseBilanKmReturn {
  isRecalculatingKm: boolean;
  recalculerFraisKm: (patronId?: string | null) => Promise<void>;
}

// ─── Fonction pure ────────────────────────────────────────────────────────────

/**
 * Calcule les frais kilométriques pour une liste de missions.
 * Fonction pure (pas de state, pas d'appel réseau).
 */
export function computeKmItems(
  missions: Mission[],
  lieux: Lieu[],
  kmSettings: KmSettings,
  domicile: { lat: number; lng: number }
): BilanKmResult {
  const kmRateEffectif =
    kmSettings.km_rate_mode === "CUSTOM"
      ? parseFloat(String(kmSettings.km_rate)) || 0
      : ((KM_RATES as Record<string, number>)[kmSettings.km_country_code || "FR"] || 0.42);
  const multiplicateur = kmSettings.km_include_retour ? 2 : 1;

  const result: BilanKmResult = { items: [], totalKm: 0, totalAmount: 0 };

  missions.forEach((m) => {
    const lieuById = lieux.find((l) => l.id === m.lieu_id);
    const lieuByName =
      !lieuById && m.lieu
        ? lieux.find(
            (l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim()
          )
        : null;
    const lieu = lieuById || lieuByName;
    const latLieu = Number(lieu?.latitude);
    const lngLieu = Number(lieu?.longitude);
    const typeLabel =
      lieu?.type && lieu.type !== "client" ? ` (${lieu.type.toUpperCase()})` : "";

    const item: BilanKmItem = {
      missionId: m.id,
      date: m.date_iso,
      labelLieuOuClient: getLieuLabel(lieu, m) + typeLabel,
      kmOneWay: null,
      kmTotal: null,
      amount: null,
    };

    if (lieu?.latitude && lieu?.longitude && Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
      const kmOneWay: number = haversineKm(domicile.lat, domicile.lng, latLieu, lngLieu);
      const kmTotal = kmOneWay * multiplicateur;
      const amount = kmTotal * kmRateEffectif;
      item.kmOneWay = kmOneWay;
      item.kmTotal = kmTotal;
      item.amount = amount;
      result.totalKm += kmTotal;
      result.totalAmount += amount;
    }

    result.items.push(item);
  });

  return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBilanKm({
  kmSettings,
  domicileLatLng,
  lieux,
  triggerAlert,
  genererBilan,
  bilanPeriodValue,
  filteredMissions,
}: UseBilanKmParams): UseBilanKmReturn {
  const [isRecalculatingKm, setIsRecalculatingKm] = useState<boolean>(false);

  const recalculerFraisKm = useCallback(
    async (patronId: string | null = null): Promise<void> => {
      if (!bilanPeriodValue) {
        triggerAlert?.("Sélectionnez une période.");
        return;
      }

      const effectiveDomicile =
        domicileLatLng ??
        (Number.isFinite(kmSettings?.km_domicile_lat) &&
        Number.isFinite(kmSettings?.km_domicile_lng)
          ? {
              lat: kmSettings!.km_domicile_lat as number,
              lng: kmSettings!.km_domicile_lng as number,
            }
          : null);

      if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) {
        triggerAlert?.("🚗 Domicile non configuré. Vérifiez Paramètres → Km.");
        return;
      }

      if (!filteredMissions || filteredMissions.length === 0) {
        triggerAlert?.("Aucune mission pour cette période.");
        return;
      }

      try {
        setIsRecalculatingKm(true);
        const user = await getCurrentUserOrNull();
        if (!user) {
          triggerAlert?.("Utilisateur non connecté.");
          return;
        }

        const kmRateEffectif =
          kmSettings!.km_rate_mode === "CUSTOM"
            ? parseFloat(String(kmSettings!.km_rate)) || 0
            : ((KM_RATES as Record<string, number>)[kmSettings!.km_country_code || "FR"] || 0.42);
        const multiplicateur = kmSettings!.km_include_retour ? 2 : 1;
        const countryCode = kmSettings!.km_country_code || "FR";

        const rows: FraisKmRow[] = [];
        filteredMissions.forEach((m) => {
          const lieuById = lieux.find((l) => l.id === m.lieu_id);
          const lieuByName =
            !lieuById && m.lieu
              ? lieux.find(
                  (l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim()
                )
              : null;
          const lieu = lieuById || lieuByName;
          const latLieu = Number(lieu?.latitude);
          const lngLieu = Number(lieu?.longitude);
          if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
            const kmOneWay: number = haversineKm(
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

        await upsertFraisKmRows(rows);

        triggerAlert?.(`✅ ${rows.length} ligne(s) km recalculée(s)`);
        await genererBilan(patronId);
      } catch (err) {
        console.error("❌ Erreur recalcul frais_km:", err);
        triggerAlert?.("Erreur lors du recalcul des frais km.");
      } finally {
        setIsRecalculatingKm(false);
      }
    },
    [bilanPeriodValue, filteredMissions, kmSettings, domicileLatLng, lieux, triggerAlert, genererBilan]
  );

  return { isRecalculatingKm, recalculerFraisKm };
}

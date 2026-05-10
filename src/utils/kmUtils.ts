import { KM_RATES } from "./kmRatesByCountry";
import { haversineKm } from "./calculators";
import type { Mission, Lieu } from "../types/entities";
import type { KmSettings } from "../hooks/useKmDomicile";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComputeKmParams {
  kmEnabled: boolean;
  kmSettings: KmSettings | null;
  domicileLatLng: { lat: number; lng: number } | null;
  lieux: Lieu[];
}

export interface KmResult {
  totalKm: number;
  totalAmount: number;
}

// ─── Fonction pure ────────────────────────────────────────────────────────────

/**
 * Calcule le total km + montant pour une liste de missions.
 * Version pure (sans hook) : toutes les dépendances sont passées en paramètre.
 */
export function computeKmForMissions(
  missionsList: Mission[],
  { kmEnabled, kmSettings, domicileLatLng, lieux }: ComputeKmParams
): KmResult {
  if (!kmEnabled || !missionsList?.length) {
    return { totalKm: 0, totalAmount: 0 };
  }

  const effectiveDomicile =
    domicileLatLng ??
    (Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
      ? {
          lat: kmSettings!.km_domicile_lat as number,
          lng: kmSettings!.km_domicile_lng as number,
        }
      : null);

  if (!Number.isFinite(effectiveDomicile?.lat) || !Number.isFinite(effectiveDomicile?.lng)) {
    return { totalKm: 0, totalAmount: 0 };
  }

  if (!effectiveDomicile) return { totalKm: 0, totalAmount: 0 };

  const kmRateEffectif =
    kmSettings?.km_rate_mode === "CUSTOM"
      ? kmSettings?.km_rate || 0
      : KM_RATES[kmSettings?.km_country_code || "FR"] || 0.42;

  const multiplicateur = kmSettings?.km_include_retour ? 2 : 1;

  let totalKm = 0;
  let totalAmount = 0;

  missionsList.forEach((m) => {
    const lieuById = lieux.find((l) => l.id === m.lieu_id);
    const lieuByName =
      !lieuById && m.lieu
        ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
        : null;

    const lieu = lieuById || lieuByName;
    const latLieu = Number(lieu?.latitude);
    const lngLieu = Number(lieu?.longitude);

    if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
      const kmOneWay = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
      const kmTotal = kmOneWay * multiplicateur;
      totalKm += kmTotal;
      totalAmount += kmTotal * kmRateEffectif;
    }
  });

  return { totalKm, totalAmount };
}

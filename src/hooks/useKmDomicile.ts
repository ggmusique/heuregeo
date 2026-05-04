import { useState, useEffect, useMemo, useCallback } from "react";
import { geocodeAddress } from "../utils/geocode";
import { getKmEnabled } from "../utils/kmSettings";
import { getWeekNumber } from "../utils/dateUtils";
import { KM_RATES } from "../utils/kmRatesByCountry";
import { haversineKm, getLieuLabel } from "../utils/calculators";
import { getCurrentUserOrNull } from "../services/authService";
import { upsertFraisKm } from "../services/api/fraisApi";
import type { UserProfile } from "../types/profile";
import type { Lieu, Mission } from "../types/entities";
import type { FraisKmRow } from "../types/bilan";

// ─── Types locaux ─────────────────────────────────────────────────────────────

export interface KmSettings {
  km_enable: boolean;
  km_include_retour: boolean;
  km_domicile_adresse: string;
  km_domicile_lat: number | null;
  km_domicile_lng: number | null;
  km_country_code: string;
  km_rate_mode: string;
  km_rate: number;
}

export interface KmFraisItem {
  missionId: string;
  date: string | null;
  labelLieuOuClient: string;
  kmOneWay: number | null;
  kmTotal: number | null;
  amount: number | null;
}

export interface KmFraisResult {
  items: KmFraisItem[];
  totalKm: number;
  totalAmount: number;
}

interface UseKmDomicileParams {
  profile: UserProfile | null;
  saveProfile: (updates: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: string }>;
  lieux: Lieu[];
  getMissionsByWeek: (weekNumber: number, patronId?: string | null, year?: number) => Mission[];
}

export interface UseKmDomicileReturn {
  kmSettings: KmSettings | null;
  domicileLatLng: { lat: number; lng: number } | null;
  currentWeek: number;
  missionsThisWeek: Mission[];
  kmFraisThisWeek: KmFraisResult;
  handleRecalculerKmSemaine: () => Promise<{ message: string }>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKmDomicile({ profile, saveProfile, lieux, getMissionsByWeek }: UseKmDomicileParams): UseKmDomicileReturn {
  const kmSettings = useMemo((): KmSettings | null => {
    if (!profile) return null;
    const f = profile.features ?? {};
    const ks = f.km_settings ?? {};
    return {
      km_enable: getKmEnabled(f),
      km_include_retour: f.km_include_retour ?? ks.roundTrip ?? false,
      km_domicile_adresse: f.km_domicile_address || ks.homeLabel || "",
      km_domicile_lat: f.km_domicile_lat != null ? Number(f.km_domicile_lat) : (ks.homeLat != null ? Number(ks.homeLat) : null),
      km_domicile_lng: f.km_domicile_lng != null ? Number(f.km_domicile_lng) : (ks.homeLng != null ? Number(ks.homeLng) : null),
      km_country_code: f.km_country || ks.countryCode || "FR",
      km_rate_mode: f.km_rate_mode || "AUTO_BY_COUNTRY",
      km_rate: f.km_rate_custom || 0,
    };
  }, [profile]);

  const [domicileLatLng, setDomicileLatLng] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!kmSettings?.km_enable) return;
    if (Number.isFinite(kmSettings.km_domicile_lat) && Number.isFinite(kmSettings.km_domicile_lng)) {
      setDomicileLatLng({ lat: kmSettings.km_domicile_lat as number, lng: kmSettings.km_domicile_lng as number });
      return;
    }
    const addr = (kmSettings.km_domicile_adresse || "").trim() ||
      [profile?.adresse, profile?.code_postal, profile?.ville].filter(Boolean).join(", ");
    if (!addr) return;
    const featuresSnapshot = profile?.features ?? {};
    geocodeAddress(addr).then((result: { lat: number; lng: number } | null) => {
      if (result) {
        setDomicileLatLng({ lat: result.lat, lng: result.lng });
        saveProfile({ features: { ...featuresSnapshot, km_domicile_lat: result.lat, km_domicile_lng: result.lng } });
      }
    });
  }, [kmSettings?.km_enable, kmSettings?.km_domicile_lat, kmSettings?.km_domicile_lng, kmSettings?.km_domicile_adresse, profile?.adresse, profile?.code_postal, profile?.ville, saveProfile]);

  // One-shot migration/sync: km_settings is source of truth, keep legacy flat keys aligned
  useEffect(() => {
    if (!profile) return;
    const f = profile.features ?? {};
    const ks = f.km_settings ?? {};

    const normalizedEnabled = getKmEnabled(f);
    const normalizedLat = f.km_domicile_lat != null ? Number(f.km_domicile_lat) : (ks.homeLat != null ? Number(ks.homeLat) : null);
    const normalizedLng = f.km_domicile_lng != null ? Number(f.km_domicile_lng) : (ks.homeLng != null ? Number(ks.homeLng) : null);
    const normalizedAddress = f.km_domicile_address || ks.homeLabel || null;
    const normalizedCountry = f.km_country || ks.countryCode || "FR";
    const normalizedRoundTrip = f.km_include_retour ?? ks.roundTrip ?? false;
    const normalizedRateMode = f.km_rate_mode || (ks.ratePerKm != null ? "CUSTOM" : "AUTO_BY_COUNTRY");
    const normalizedRateCustom = f.km_rate_custom ?? (ks.ratePerKm ?? null);

    const needsSync =
      ks.enabled !== normalizedEnabled ||
      ks.homeLat !== normalizedLat ||
      ks.homeLng !== normalizedLng ||
      ks.homeLabel !== normalizedAddress ||
      ks.countryCode !== normalizedCountry ||
      ks.roundTrip !== normalizedRoundTrip ||
      (ks.ratePerKm ?? null) !== (normalizedRateCustom ?? null) ||
      f.km_enabled !== normalizedEnabled ||
      f.km_enable !== undefined ||
      f.km_domicile_lat !== normalizedLat ||
      f.km_domicile_lng !== normalizedLng ||
      (f.km_domicile_address || null) !== normalizedAddress ||
      (f.km_country || "FR") !== normalizedCountry ||
      (f.km_include_retour ?? false) !== normalizedRoundTrip ||
      (f.km_rate_mode || "AUTO_BY_COUNTRY") !== normalizedRateMode ||
      (f.km_rate_custom ?? null) !== (normalizedRateCustom ?? null);

    if (!needsSync) return;

    const nextFeatures = {
      ...f,
      km_enabled: normalizedEnabled,
      km_enable: undefined,
      km_country: normalizedCountry,
      km_rate_mode: normalizedRateMode,
      km_rate_custom: normalizedRateCustom,
      km_include_retour: normalizedRoundTrip,
      km_domicile_lat: normalizedLat,
      km_domicile_lng: normalizedLng,
      km_domicile_address: normalizedAddress,
      km_settings: {
        ...ks,
        enabled: normalizedEnabled,
        homeLat: normalizedLat,
        homeLng: normalizedLng,
        homeLabel: normalizedAddress,
        ratePerKm: normalizedRateCustom,
        roundTrip: normalizedRoundTrip,
        countryCode: normalizedCountry,
      },
    };
    saveProfile({ features: nextFeatures });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.features]);

  const currentWeek: number = getWeekNumber(new Date());
  const missionsThisWeek = useMemo(
    () => getMissionsByWeek(currentWeek).filter((m) => m && m.date_iso),
    [getMissionsByWeek, currentWeek]
  );

  const kmFraisThisWeek = useMemo((): KmFraisResult => {
    const empty: KmFraisResult = { items: [], totalKm: 0, totalAmount: 0 };
    if (!kmSettings?.km_enable) return empty;
    const effectiveDomicile = domicileLatLng ?? (
      Number.isFinite(kmSettings.km_domicile_lat) && Number.isFinite(kmSettings.km_domicile_lng)
        ? { lat: kmSettings.km_domicile_lat as number, lng: kmSettings.km_domicile_lng as number }
        : null
    );
    if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) return empty;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kmRateEffectif: number = kmSettings.km_rate_mode === "CUSTOM"
      ? (parseFloat(String(kmSettings.km_rate)) || 0)
      : ((KM_RATES as Record<string, number>)[kmSettings.km_country_code || "FR"] || 0.42);
    const multiplicateur = kmSettings.km_include_retour ? 2 : 1;
    const result: KmFraisResult = { items: [], totalKm: 0, totalAmount: 0 };
    missionsThisWeek.forEach((m) => {
      const lieuById = lieux.find((l) => l.id === m.lieu_id);
      const lieuByName = !lieuById && m.lieu
        ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
        : null;
      const lieu = lieuById || lieuByName;
      const latLieu = Number(lieu?.latitude);
      const lngLieu = Number(lieu?.longitude);
      if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
        const kmOneWay: number = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
        const kmTot = kmOneWay * multiplicateur;
        const amount = kmTot * kmRateEffectif;
        result.items.push({
          missionId: m.id,
          date: m.date_iso,
          labelLieuOuClient: getLieuLabel(lieu, m),
          kmOneWay, kmTotal: kmTot, amount,
        });
        result.totalKm += kmTot;
        result.totalAmount += amount;
      } else {
        result.items.push({
          missionId: m.id,
          date: m.date_iso,
          labelLieuOuClient: getLieuLabel(lieu, m),
          kmOneWay: null, kmTotal: null, amount: null,
        });
      }
    });
    return result;
  }, [kmSettings, domicileLatLng, missionsThisWeek, lieux]);

  const handleRecalculerKmSemaine = useCallback(async (): Promise<{ message: string }> => {
    const effectiveDomicile = domicileLatLng ?? (
      Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
        ? { lat: kmSettings!.km_domicile_lat as number, lng: kmSettings!.km_domicile_lng as number }
        : null
    );
    if (!effectiveDomicile?.lat || !effectiveDomicile?.lng) {
      throw new Error("Domicile non configuré. Vérifiez Paramètres → Km.");
    }
    if (missionsThisWeek.length === 0) throw new Error("Aucune mission cette semaine");
    const authUser = await getCurrentUserOrNull();
    if (!authUser) throw new Error("Utilisateur non connecté");
    const kmRateEffectif: number = kmSettings!.km_rate_mode === "CUSTOM"
      ? (parseFloat(String(kmSettings!.km_rate)) || 0)
      : ((KM_RATES as Record<string, number>)[kmSettings!.km_country_code || "FR"] || 0.42);
    const multiplicateur = kmSettings!.km_include_retour ? 2 : 1;
    const countryCode = kmSettings!.km_country_code || "FR";
    const rows: FraisKmRow[] = [];
    missionsThisWeek.forEach((m) => {
      const lieuById = lieux.find((l) => l.id === m.lieu_id);
      const lieuByName = !lieuById && m.lieu
        ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
        : null;
      const lieu = lieuById || lieuByName;
      const latLieu = Number(lieu?.latitude);
      const lngLieu = Number(lieu?.longitude);
      if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
        const kmOneWay: number = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
        const distanceKm = kmOneWay * multiplicateur;
        const amount = distanceKm * kmRateEffectif;
        rows.push({
          user_id: authUser.id,
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
    if (rows.length === 0) throw new Error("Aucun lieu géocodé — coordonnées GPS manquantes");
    await upsertFraisKm(rows);
    return { message: `✅ ${rows.length} ligne(s) km recalculée(s) pour la semaine` };
  }, [kmSettings, domicileLatLng, missionsThisWeek, lieux]);

  return {
    kmSettings,
    domicileLatLng,
    currentWeek,
    missionsThisWeek,
    kmFraisThisWeek,
    handleRecalculerKmSemaine,
  };
}

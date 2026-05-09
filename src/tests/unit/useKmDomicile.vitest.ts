import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useKmDomicile } from "../../hooks/useKmDomicile";
import { haversineKm } from "../../utils/calculators";
import type { UserProfile } from "../../types/profile";
import type { Lieu, Mission } from "../../types/entities";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../utils/geocode", () => ({
  geocodeAddress: vi.fn(),
}));

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../../services/api/fraisApi", () => ({
  upsertFraisKm: vi.fn(),
}));

import * as geocode from "../../utils/geocode";
import * as authService from "../../services/authService";
import * as fraisApi from "../../services/api/fraisApi";

// Réinitialise les compteurs entre chaque test
beforeEach(() => vi.clearAllMocks());

// ─── Coordonnées de référence ─────────────────────────────────────────────────

const DOMICILE = { lat: 50.0, lng: 4.0 };
const LIEU_COORDS = { lat: 50.1, lng: 4.0 };
const KM_ONE_WAY = haversineKm(DOMICILE.lat, DOMICILE.lng, LIEU_COORDS.lat, LIEU_COORDS.lng);

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProfile(featureOverrides: Record<string, unknown> = {}): UserProfile {
  return {
    id: "uid",
    role: "pro",
    is_admin: false,
    patron_id: null,
    prenom: null,
    nom: null,
    adresse: null,
    code_postal: null,
    ville: null,
    updated_at: null,
    features: {
      km_settings: {
        enabled: true,
        roundTrip: false,
        countryCode: "FR",
        homeLat: DOMICILE.lat,
        homeLng: DOMICILE.lng,
        homeLabel: "Domicile",
        ratePerKm: null,
      },
      km_enabled: true,
      km_include_retour: false,
      km_country: "FR",
      km_rate_mode: "AUTO_BY_COUNTRY",
      km_rate_custom: null,
      km_domicile_lat: DOMICILE.lat,
      km_domicile_lng: DOMICILE.lng,
      km_domicile_address: "Domicile",
      ...featureOverrides,
    },
  };
}

function makeLieu(overrides: Partial<Lieu> = {}): Lieu {
  return {
    id: "lieu-1",
    user_id: "uid",
    nom: "Bureau",
    adresse_complete: null,
    latitude: LIEU_COORDS.lat,
    longitude: LIEU_COORDS.lng,
    notes: null,
    type: null,
    ...overrides,
  };
}

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    user_id: "uid",
    patron_id: "patron-1",
    client_id: null,
    lieu_id: "lieu-1",
    client: null,
    lieu: "Bureau",
    date_mission: "2026-01-05",
    date_iso: "2026-01-05",
    debut: "09:00",
    fin: "11:00",
    duree: 2,
    pause: 0,
    montant: 80,
    ...overrides,
  };
}

function makeParams(
  profile: UserProfile | null,
  lieux: Lieu[] = [],
  getMissionsByWeek: (w: number, p?: string | null, y?: number) => Mission[] = () => []
) {
  // saveProfile MUST be stable across renders — created once here, never inside renderHook
  return {
    profile,
    saveProfile: vi.fn().mockResolvedValue({}),
    lieux,
    getMissionsByWeek,
  };
}

// ─── 1. kmSettings — dérivation depuis le profil ──────────────────────────────

describe("kmSettings — dérivation depuis profile.features", () => {
  it("retourne null si profile est null", () => {
    const params = makeParams(null);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings).toBeNull();
  });

  it("lit km_enable depuis km_settings.enabled (nouveau format)", () => {
    const profile = makeProfile({
      km_settings: { enabled: true, roundTrip: false, countryCode: "FR", homeLat: null, homeLng: null, homeLabel: null, ratePerKm: null },
      km_enabled: true,
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_enable).toBe(true);
  });

  it("lit km_enable depuis km_enabled (format legacy, sans km_settings)", () => {
    const profile = makeProfile({
      km_settings: undefined,
      km_enabled: true,
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_enable).toBe(true);
  });

  it("retourne km_enable=false si désactivé dans les deux formats", () => {
    const profile = makeProfile({
      km_settings: { enabled: false, roundTrip: false, countryCode: "FR", homeLat: null, homeLng: null, homeLabel: null, ratePerKm: null },
      km_enabled: false,
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_enable).toBe(false);
  });

  it("utilise km_rate_custom comme taux en mode CUSTOM", () => {
    const profile = makeProfile({ km_rate_mode: "CUSTOM", km_rate_custom: 0.55 });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_rate_mode).toBe("CUSTOM");
    expect(result.current.kmSettings?.km_rate).toBeCloseTo(0.55, 5);
  });

  it("expose km_country_code depuis km_country du profil", () => {
    const profile = makeProfile({ km_country: "BE" });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_country_code).toBe("BE");
  });

  it("propage km_include_retour depuis les features", () => {
    const profile = makeProfile({ km_include_retour: true });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmSettings?.km_include_retour).toBe(true);
  });
});

// ─── 2. domicileLatLng — résolution du domicile ───────────────────────────────

describe("domicileLatLng — résolution des coordonnées GPS", () => {
  it("reste null si km_enable=false (pas de résolution)", () => {
    const profile = makeProfile({
      km_settings: { enabled: false },
      km_enabled: false,
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.domicileLatLng).toBeNull();
  });

  it("lit lat/lng directement depuis les features sans appel geocode", () => {
    const profile = makeProfile(); // lat/lng déjà présents
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));

    expect(result.current.domicileLatLng).toEqual({ lat: DOMICILE.lat, lng: DOMICILE.lng });
    expect(geocode.geocodeAddress).not.toHaveBeenCalled();
  });

  it("appelle geocodeAddress si lat/lng absents mais adresse présente", async () => {
    vi.mocked(geocode.geocodeAddress).mockResolvedValue({ lat: 50.5, lng: 4.5 });
    const profile = makeProfile({
      km_domicile_lat: null,
      km_domicile_lng: null,
      km_domicile_address: "12 rue de la Paix, Bruxelles",
      km_settings: {
        enabled: true, roundTrip: false, countryCode: "FR",
        homeLat: null, homeLng: null,
        homeLabel: "12 rue de la Paix, Bruxelles", ratePerKm: null,
      },
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    await act(async () => { /* flush async geocode effect */ });

    expect(geocode.geocodeAddress).toHaveBeenCalledWith(
      expect.stringContaining("12 rue de la Paix")
    );
    expect(result.current.domicileLatLng).toEqual({ lat: 50.5, lng: 4.5 });
  });

  it("laisse domicileLatLng à null si geocodeAddress retourne null", async () => {
    vi.mocked(geocode.geocodeAddress).mockResolvedValue(null);
    const profile = makeProfile({
      km_domicile_lat: null,
      km_domicile_lng: null,
      km_domicile_address: "adresse inconnue xyz",
      km_settings: { enabled: true, roundTrip: false, countryCode: "FR", homeLat: null, homeLng: null, homeLabel: "adresse inconnue xyz", ratePerKm: null },
    });
    const params = makeParams(profile);
    const { result } = renderHook(() => useKmDomicile(params));
    await act(async () => {});

    expect(result.current.domicileLatLng).toBeNull();
  });
});

// ─── 3. kmFraisThisWeek — calcul des frais kilométriques ─────────────────────

describe("kmFraisThisWeek — calcul km domicile-lieu", () => {
  it("retourne un résultat vide si km_enable=false", () => {
    const profile = makeProfile({ km_settings: { enabled: false }, km_enabled: false });
    const lieu = makeLieu();
    const mission = makeMission();
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmFraisThisWeek).toEqual({ items: [], totalKm: 0, totalAmount: 0 });
  });

  it("retourne un résultat vide si domicile non configuré (lat/lng null)", () => {
    const profile = makeProfile({
      km_domicile_lat: null,
      km_domicile_lng: null,
      km_settings: { enabled: true, roundTrip: false, countryCode: "FR", homeLat: null, homeLng: null, homeLabel: null, ratePerKm: null },
    });
    const lieu = makeLieu();
    const mission = makeMission();
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));
    expect(result.current.kmFraisThisWeek).toEqual({ items: [], totalKm: 0, totalAmount: 0 });
  });

  it("calcule km et montant corrects en aller-simple avec taux AUTO France (0.42 €/km)", () => {
    const profile = makeProfile(); // km_include_retour=false, km_country=FR, AUTO
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    const frais = result.current.kmFraisThisWeek;
    expect(frais.items).toHaveLength(1);
    expect(frais.items[0].kmOneWay).toBeCloseTo(KM_ONE_WAY, 3);
    expect(frais.items[0].kmTotal).toBeCloseTo(KM_ONE_WAY, 3);
    expect(frais.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
    expect(frais.totalKm).toBeCloseTo(KM_ONE_WAY, 3);
    expect(frais.totalAmount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
  });

  it("double le km avec km_include_retour=true (aller-retour)", () => {
    const profile = makeProfile({ km_include_retour: true });
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    const frais = result.current.kmFraisThisWeek;
    expect(frais.items[0].kmTotal).toBeCloseTo(KM_ONE_WAY * 2, 3);
    expect(frais.totalKm).toBeCloseTo(KM_ONE_WAY * 2, 3);
  });

  it("utilise le taux personnalisé en mode CUSTOM", () => {
    const CUSTOM_RATE = 0.60;
    const profile = makeProfile({ km_rate_mode: "CUSTOM", km_rate_custom: CUSTOM_RATE });
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    expect(result.current.kmFraisThisWeek.items[0].amount).toBeCloseTo(KM_ONE_WAY * CUSTOM_RATE, 3);
  });

  it("utilise le taux belge (BE = 0.42 €/km) en mode AUTO", () => {
    const profile = makeProfile({ km_country: "BE", km_settings: { enabled: true, roundTrip: false, countryCode: "BE", homeLat: DOMICILE.lat, homeLng: DOMICILE.lng, homeLabel: "Domicile", ratePerKm: null } });
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    expect(result.current.kmFraisThisWeek.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
  });

  it("produit un item avec kmOneWay=null si le lieu est introuvable (ni par id ni par nom)", () => {
    // Number(null)=0 est isFinite, donc latitude:null donne haversine vers (0,0).
    // kmOneWay:null se produit uniquement quand le lieu n'est pas trouvé du tout.
    const profile = makeProfile();
    const mission = makeMission({ lieu_id: "unknown-id", lieu: "No Match Anywhere" });
    const params = makeParams(profile, [], () => [mission]); // aucun lieu dans la liste
    const { result } = renderHook(() => useKmDomicile(params));

    const item = result.current.kmFraisThisWeek.items[0];
    expect(item.kmOneWay).toBeNull();
    expect(item.kmTotal).toBeNull();
    expect(item.amount).toBeNull();
    expect(result.current.kmFraisThisWeek.totalKm).toBe(0);
    expect(result.current.kmFraisThisWeek.totalAmount).toBe(0);
  });

  it("retrouve un lieu par nom si lieu_id ne correspond pas", () => {
    const profile = makeProfile();
    const lieu = makeLieu({ id: "autre-id" }); // id différent
    const mission = makeMission({ lieu_id: "inexistant", lieu: "Bureau" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    expect(result.current.kmFraisThisWeek.items[0].kmOneWay).toBeCloseTo(KM_ONE_WAY, 3);
  });

  it("cumule totalKm et totalAmount sur plusieurs missions", () => {
    const profile = makeProfile();
    const lieu1 = makeLieu({ id: "l1" });
    const lieu2 = makeLieu({ id: "l2", latitude: 50.2, longitude: 4.0 });
    const km2 = haversineKm(DOMICILE.lat, DOMICILE.lng, 50.2, 4.0);
    const m1 = makeMission({ id: "m1", lieu_id: "l1" });
    const m2 = makeMission({ id: "m2", lieu_id: "l2" });
    const params = makeParams(profile, [lieu1, lieu2], () => [m1, m2]);
    const { result } = renderHook(() => useKmDomicile(params));

    const frais = result.current.kmFraisThisWeek;
    expect(frais.items).toHaveLength(2);
    expect(frais.totalKm).toBeCloseTo(KM_ONE_WAY + km2, 3);
    expect(frais.totalAmount).toBeCloseTo((KM_ONE_WAY + km2) * 0.42, 3);
  });
});

// ─── 4. handleRecalculerKmSemaine — persistance en DB ─────────────────────────

describe("handleRecalculerKmSemaine — persistance des frais km", () => {
  it("lève 'Domicile non configuré' si domicile absent des settings", async () => {
    const profile = makeProfile({
      km_domicile_lat: null,
      km_domicile_lng: null,
      km_settings: { enabled: true, roundTrip: false, countryCode: "FR", homeLat: null, homeLng: null, homeLabel: null, ratePerKm: null },
    });
    const mission = makeMission();
    const params = makeParams(profile, [], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    await expect(
      act(async () => result.current.handleRecalculerKmSemaine())
    ).rejects.toThrow("Domicile non configuré");
  });

  it("lève 'Aucune mission' si getMissionsByWeek retourne []", async () => {
    const profile = makeProfile();
    const params = makeParams(profile, [], () => []);
    const { result } = renderHook(() => useKmDomicile(params));

    await expect(
      act(async () => result.current.handleRecalculerKmSemaine())
    ).rejects.toThrow("Aucune mission");
  });

  it("lève 'Utilisateur non connecté' si auth retourne null", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);
    const profile = makeProfile();
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    await expect(
      act(async () => result.current.handleRecalculerKmSemaine())
    ).rejects.toThrow("Utilisateur non connecté");
  });

  it("appelle upsertFraisKm avec les rows correctes et retourne un message de succès", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(fraisApi.upsertFraisKm).mockResolvedValue(undefined);

    const profile = makeProfile();
    const lieu = makeLieu();
    const mission = makeMission({ id: "m1", lieu_id: "lieu-1", patron_id: "patron-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    let res!: { message: string };
    await act(async () => { res = await result.current.handleRecalculerKmSemaine(); });

    expect(fraisApi.upsertFraisKm).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(fraisApi.upsertFraisKm).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "uid",
      mission_id: "m1",
      patron_id: "patron-1",
      country_code: "FR",
      rate_per_km: 0.42,
      source: "auto",
    });
    expect(rows[0].distance_km).toBeCloseTo(KM_ONE_WAY, 2);
    expect(rows[0].amount).toBeCloseTo(KM_ONE_WAY * 0.42, 2);
    expect(res.message).toMatch(/1.*km/i);
  });

  it("double la distance_km avec km_include_retour=true", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(fraisApi.upsertFraisKm).mockResolvedValue(undefined);

    const profile = makeProfile({ km_include_retour: true });
    const lieu = makeLieu();
    const mission = makeMission({ lieu_id: "lieu-1" });
    const params = makeParams(profile, [lieu], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    await act(async () => { await result.current.handleRecalculerKmSemaine(); });

    const rows = vi.mocked(fraisApi.upsertFraisKm).mock.calls[0][0];
    expect(rows[0].distance_km).toBeCloseTo(KM_ONE_WAY * 2, 2);
  });

  it("ignore les missions sans lieu trouvé dans la liste (aucune row pour elles)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(fraisApi.upsertFraisKm).mockResolvedValue(undefined);

    const profile = makeProfile();
    const lieuAvecGPS = makeLieu({ id: "lieu-2", latitude: 50.1, longitude: 4.0 });
    // mSansLieu : lieu_id et nom ne correspondent à aucun lieu dans la liste
    const mSansLieu = makeMission({ id: "no-lieu", lieu_id: "unknown-id", lieu: "Introuvable" });
    const mAvecLieu = makeMission({ id: "with-lieu", lieu_id: "lieu-2" });
    const params = makeParams(profile, [lieuAvecGPS], () => [mSansLieu, mAvecLieu]);
    const { result } = renderHook(() => useKmDomicile(params));

    await act(async () => { await result.current.handleRecalculerKmSemaine(); });

    const rows = vi.mocked(fraisApi.upsertFraisKm).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].mission_id).toBe("with-lieu");
  });

  it("lève une erreur si aucune mission ne correspond à un lieu géocodé (rows vide)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);

    const profile = makeProfile();
    // Aucun lieu dans la liste → rows resteront vides → throw
    const mission = makeMission({ lieu_id: "unknown-id", lieu: "Introuvable" });
    const params = makeParams(profile, [], () => [mission]);
    const { result } = renderHook(() => useKmDomicile(params));

    await expect(
      act(async () => result.current.handleRecalculerKmSemaine())
    ).rejects.toThrow("GPS manquantes");

    expect(fraisApi.upsertFraisKm).not.toHaveBeenCalled();
  });
});

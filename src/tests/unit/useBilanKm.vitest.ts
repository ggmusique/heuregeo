import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { computeKmItems, useBilanKm } from "../../hooks/useBilanKm";
import { haversineKm } from "../../utils/calculators";
import type { Mission, Lieu } from "../../types/entities";
import type { MissionWithWeather } from "../../types/bilan";
import type { KmSettings } from "../../hooks/useKmDomicile";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../../services/bilanRepository", () => ({
  upsertFraisKmRows: vi.fn(),
}));

import * as authService from "../../services/authService";
import * as bilanRepository from "../../services/bilanRepository";

// Réinitialise les compteurs entre chaque test
beforeEach(() => vi.clearAllMocks());

// ─── Coordonnées de référence ─────────────────────────────────────────────────

const DOMICILE = { lat: 50.0, lng: 4.0 };
const LIEU_COORDS = { lat: 50.1, lng: 4.0 };
const KM_ONE_WAY = haversineKm(DOMICILE.lat, DOMICILE.lng, LIEU_COORDS.lat, LIEU_COORDS.lng);
// ≈ 11.13 km

// ─── Factories ────────────────────────────────────────────────────────────────

function makeKmSettings(overrides: Partial<KmSettings> = {}): KmSettings {
  return {
    km_enable: true,
    km_include_retour: false,
    km_domicile_adresse: "Domicile",
    km_domicile_lat: DOMICILE.lat,
    km_domicile_lng: DOMICILE.lng,
    km_country_code: "FR",
    km_rate_mode: "AUTO_BY_COUNTRY",
    km_rate: 0.42,
    ...overrides,
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

function makeMission(overrides: Partial<Mission> = {}): MissionWithWeather {
  return {
    id: "m1",
    user_id: "uid",
    patron_id: "patron-1",
    client_id: "client-1",
    lieu_id: "lieu-1",
    client: "Client A",
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

// IMPORTANT : makeParams() doit être appelé UNE SEULE FOIS hors de renderHook
// pour éviter la création de nouvelles références de fonctions à chaque render,
// ce qui provoquerait des boucles infinies via les dépendances de useCallback.
function makeParams(overrides: {
  kmSettings?: KmSettings | null;
  domicileLatLng?: { lat: number; lng: number } | null;
  lieux?: Lieu[];
  triggerAlert?: (msg: string) => void;
  genererBilan?: (patronId?: string | null) => Promise<boolean | void>;
  bilanPeriodValue?: string;
  filteredMissions?: MissionWithWeather[];
} = {}) {
  return {
    kmSettings: makeKmSettings(),
    domicileLatLng: DOMICILE,
    lieux: [makeLieu()],
    triggerAlert: vi.fn(),
    genererBilan: vi.fn().mockResolvedValue(true),
    bilanPeriodValue: "2026-01",
    filteredMissions: [makeMission()],
    ...overrides,
  };
}

// ─── 1. computeKmItems — fonction pure ───────────────────────────────────────

describe("computeKmItems — calcul km pour une liste de missions", () => {
  it("retourne un résultat vide si la liste de missions est vide", () => {
    const result = computeKmItems([], [makeLieu()], makeKmSettings(), DOMICILE);
    expect(result).toEqual({ items: [], totalKm: 0, totalAmount: 0 });
  });

  it("calcule kmOneWay, kmTotal et amount corrects — aller-simple FR (0.42 €/km)", () => {
    const result = computeKmItems([makeMission()], [makeLieu()], makeKmSettings(), DOMICILE);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].kmOneWay).toBeCloseTo(KM_ONE_WAY, 3);
    expect(result.items[0].kmTotal).toBeCloseTo(KM_ONE_WAY, 3);
    expect(result.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
    expect(result.totalKm).toBeCloseTo(KM_ONE_WAY, 3);
    expect(result.totalAmount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
  });

  it("double le km avec km_include_retour=true (aller-retour)", () => {
    const settings = makeKmSettings({ km_include_retour: true });
    const result = computeKmItems([makeMission()], [makeLieu()], settings, DOMICILE);

    expect(result.items[0].kmTotal).toBeCloseTo(KM_ONE_WAY * 2, 3);
    expect(result.totalKm).toBeCloseTo(KM_ONE_WAY * 2, 3);
  });

  it("utilise le taux personnalisé en mode CUSTOM", () => {
    const settings = makeKmSettings({ km_rate_mode: "CUSTOM", km_rate: 0.60 });
    const result = computeKmItems([makeMission()], [makeLieu()], settings, DOMICILE);

    expect(result.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.60, 3);
  });

  it("utilise le taux Suisse (CH = 0.70 €/km) en mode AUTO", () => {
    const settings = makeKmSettings({ km_country_code: "CH" });
    const result = computeKmItems([makeMission()], [makeLieu()], settings, DOMICILE);

    expect(result.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.70, 3);
  });

  it("tombe sur 0.42 (fallback FR) si country_code inconnu", () => {
    const settings = makeKmSettings({ km_country_code: "XX" });
    const result = computeKmItems([makeMission()], [makeLieu()], settings, DOMICILE);

    expect(result.items[0].amount).toBeCloseTo(KM_ONE_WAY * 0.42, 3);
  });

  it("retrouve un lieu par nom si lieu_id ne correspond pas", () => {
    const lieuAutreId = makeLieu({ id: "autre-id" });
    const mission = makeMission({ lieu_id: "inexistant", lieu: "Bureau" });
    const result = computeKmItems([mission], [lieuAutreId], makeKmSettings(), DOMICILE);

    expect(result.items[0].kmOneWay).toBeCloseTo(KM_ONE_WAY, 3);
  });

  it("produit kmOneWay=null si le lieu est introuvable (ni par id ni par nom)", () => {
    const mission = makeMission({ lieu_id: "unknown-id", lieu: "Introuvable" });
    const result = computeKmItems([mission], [], makeKmSettings(), DOMICILE);

    expect(result.items[0].kmOneWay).toBeNull();
    expect(result.items[0].kmTotal).toBeNull();
    expect(result.items[0].amount).toBeNull();
    expect(result.totalKm).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("cumule totalKm et totalAmount sur plusieurs missions", () => {
    const lieu2 = makeLieu({ id: "lieu-2", latitude: 50.2, longitude: 4.0 });
    const km2 = haversineKm(DOMICILE.lat, DOMICILE.lng, 50.2, 4.0);
    const m1 = makeMission({ id: "m1", lieu_id: "lieu-1" });
    const m2 = makeMission({ id: "m2", lieu_id: "lieu-2" });

    const result = computeKmItems([m1, m2], [makeLieu(), lieu2], makeKmSettings(), DOMICILE);

    expect(result.items).toHaveLength(2);
    expect(result.totalKm).toBeCloseTo(KM_ONE_WAY + km2, 3);
    expect(result.totalAmount).toBeCloseTo((KM_ONE_WAY + km2) * 0.42, 3);
  });

  it("ignore les missions sans lieu trouvé dans le total mais crée tout de même l'item", () => {
    const mSansLieu = makeMission({ id: "no-lieu", lieu_id: "unknown", lieu: "Inconnu" });
    const mAvecLieu = makeMission({ id: "with-lieu", lieu_id: "lieu-1" });

    const result = computeKmItems(
      [mSansLieu, mAvecLieu],
      [makeLieu()],
      makeKmSettings(),
      DOMICILE
    );

    expect(result.items).toHaveLength(2);
    // Premier item sans lieu → null
    expect(result.items[0].kmOneWay).toBeNull();
    // Second item avec lieu → calculé
    expect(result.items[1].kmOneWay).toBeCloseTo(KM_ONE_WAY, 3);
    // Total ne compte que les items valides
    expect(result.totalKm).toBeCloseTo(KM_ONE_WAY, 3);
  });

  it("inclut le typeLabel dans le labelLieuOuClient si lieu.type est défini (non 'client')", () => {
    const lieuAvecType = makeLieu({ type: "ecole" });
    const result = computeKmItems([makeMission()], [lieuAvecType], makeKmSettings(), DOMICILE);

    expect(result.items[0].labelLieuOuClient).toContain("ECOLE");
  });

  it("n'ajoute pas de typeLabel si lieu.type est 'client'", () => {
    const lieuClient = makeLieu({ type: "client" });
    const result = computeKmItems([makeMission()], [lieuClient], makeKmSettings(), DOMICILE);

    expect(result.items[0].labelLieuOuClient).not.toContain("(");
  });
});

// ─── 2. useBilanKm — recalculerFraisKm : gardes early-return ─────────────────

describe("useBilanKm — recalculerFraisKm : gardes early-return", () => {
  it("appelle triggerAlert et ne touche pas à l'API si bilanPeriodValue est vide", async () => {
    const params = makeParams({ bilanPeriodValue: "" });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("période"));
    expect(bilanRepository.upsertFraisKmRows).not.toHaveBeenCalled();
  });

  it("appelle triggerAlert si domicile est null (pas dans profile ni domicileLatLng)", async () => {
    const params = makeParams({
      domicileLatLng: null,
      kmSettings: makeKmSettings({ km_domicile_lat: null, km_domicile_lng: null }),
    });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Domicile non configuré"));
    expect(bilanRepository.upsertFraisKmRows).not.toHaveBeenCalled();
  });

  it("appelle triggerAlert si filteredMissions est vide", async () => {
    const params = makeParams({ filteredMissions: [] });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucune mission"));
    expect(bilanRepository.upsertFraisKmRows).not.toHaveBeenCalled();
  });

  it("appelle triggerAlert si l'utilisateur n'est pas connecté (authService retourne null)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue(null);
    const params = makeParams();
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("non connecté"));
    expect(bilanRepository.upsertFraisKmRows).not.toHaveBeenCalled();
  });

  it("appelle triggerAlert si aucune mission ne correspond à un lieu trouvé (rows vide)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);

    // Aucun lieu dans la liste → le hook ne trouve pas de lieu pour la mission →
    // rows restera vide → triggerAlert "Aucun lieu géocodé"
    // Note : Number(null)=0 est isFinite(0)=true, donc lieu avec lat=null calcule
    // quand même une distance vers (0,0). Pour forcer rows vide, on met lieux=[].
    const params = makeParams({ lieux: [] });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Aucun lieu géocodé"));
    expect(bilanRepository.upsertFraisKmRows).not.toHaveBeenCalled();
  });
});

// ─── 3. useBilanKm — recalculerFraisKm : chemin nominal ──────────────────────

describe("useBilanKm — recalculerFraisKm : chemin nominal", () => {
  it("appelle upsertFraisKmRows avec les rows correctes et génère le bilan", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const mission = makeMission({ id: "m1", patron_id: "patron-1" });
    const params = makeParams({ filteredMissions: [mission] });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm("patron-1"); });

    expect(bilanRepository.upsertFraisKmRows).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(bilanRepository.upsertFraisKmRows).mock.calls[0][0];
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
    expect(params.genererBilan).toHaveBeenCalledWith("patron-1");
  });

  it("double la distance_km avec km_include_retour=true", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const params = makeParams({
      kmSettings: makeKmSettings({ km_include_retour: true }),
    });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    const rows = vi.mocked(bilanRepository.upsertFraisKmRows).mock.calls[0][0];
    expect(rows[0].distance_km).toBeCloseTo(KM_ONE_WAY * 2, 2);
  });

  it("utilise domicileLatLng en priorité sur km_domicile_lat/lng des settings", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    // km_domicile_lat/lng différents de domicileLatLng : domicileLatLng doit gagner
    const domicileOverride = { lat: 50.0, lng: 4.0 }; // même que DOMICILE
    const params = makeParams({
      domicileLatLng: domicileOverride,
      kmSettings: makeKmSettings({ km_domicile_lat: 99.0, km_domicile_lng: 99.0 }),
    });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    // Si domicileLatLng est utilisé (lat=50, lng=4), la distance ~KM_ONE_WAY
    // Si km_domicile_lat=99 était utilisé, la distance serait très différente
    const rows = vi.mocked(bilanRepository.upsertFraisKmRows).mock.calls[0][0];
    expect(rows[0].distance_km).toBeCloseTo(KM_ONE_WAY, 1);
  });

  it("utilise le fallback km_domicile_lat/lng si domicileLatLng est null", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const params = makeParams({
      domicileLatLng: null,
      // km_domicile_lat/lng = coordonnées du domicile
      kmSettings: makeKmSettings({
        km_domicile_lat: DOMICILE.lat,
        km_domicile_lng: DOMICILE.lng,
      }),
    });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    const rows = vi.mocked(bilanRepository.upsertFraisKmRows).mock.calls[0][0];
    expect(rows[0].distance_km).toBeCloseTo(KM_ONE_WAY, 2);
  });

  it("affiche le message de succès avec le nombre de lignes", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const params = makeParams();
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringMatching(/1.*ligne/i));
  });

  it("traite plusieurs missions : une avec GPS, une sans — ne persiste que la valide", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const lieuAvecGPS = makeLieu({ id: "lieu-gps" });
    const mAvecGPS = makeMission({ id: "m-gps", lieu_id: "lieu-gps" });
    // Mission sans lieu correspondant → sera ignorée
    const mSansGPS = makeMission({ id: "m-nogps", lieu_id: "unknown", lieu: "Introuvable" });

    const params = makeParams({
      lieux: [lieuAvecGPS],
      filteredMissions: [mAvecGPS, mSansGPS],
    });
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    const rows = vi.mocked(bilanRepository.upsertFraisKmRows).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].mission_id).toBe("m-gps");
  });
});

// ─── 4. useBilanKm — isRecalculatingKm (état de chargement) ──────────────────

describe("useBilanKm — isRecalculatingKm", () => {
  it("démarre à false", () => {
    const params = makeParams();
    const { result } = renderHook(() => useBilanKm(params));
    expect(result.current.isRecalculatingKm).toBe(false);
  });

  it("repasse à false après un recalcul réussi", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockResolvedValue(undefined);

    const params = makeParams();
    const { result } = renderHook(() => useBilanKm(params));

    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(result.current.isRecalculatingKm).toBe(false);
  });

  it("repasse à false même après une erreur API (finally)", async () => {
    vi.mocked(authService.getCurrentUserOrNull).mockResolvedValue({ id: "uid" } as never);
    vi.mocked(bilanRepository.upsertFraisKmRows).mockRejectedValue(new Error("DB crash"));

    const params = makeParams();
    const { result } = renderHook(() => useBilanKm(params));

    // Ne throw pas vers l'extérieur — le hook catchait l'erreur
    await act(async () => { await result.current.recalculerFraisKm(); });

    expect(result.current.isRecalculatingKm).toBe(false);
    expect(params.triggerAlert).toHaveBeenCalledWith(expect.stringContaining("Erreur"));
  });
});

export const COUNTRY_RATE_PRESETS = {
  BE: { label: "Belgique", ratePerKm: 0.4269, currency: "EUR" },
  FR: { label: "France", ratePerKm: 0.6010, currency: "EUR" },
  LU: { label: "Luxembourg", ratePerKm: 0.5000, currency: "EUR" },
  NL: { label: "Pays-Bas", ratePerKm: 0.2300, currency: "EUR" },
  DE: { label: "Allemagne", ratePerKm: 0.3000, currency: "EUR" },
};

export const DEFAULT_KM_SETTINGS = {
  enabled: false,
  countryCode: "BE",
  ratePerKm: COUNTRY_RATE_PRESETS.BE.ratePerKm,
  roundTrip: true,
  homeLabel: "",
  homeLat: null,
  homeLng: null,
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeKmSettings = (features = {}) => {
  const raw = features?.km_settings || {};
  const countryCode = raw.countryCode || raw.country_code || DEFAULT_KM_SETTINGS.countryCode;
  const presetRate = COUNTRY_RATE_PRESETS[countryCode]?.ratePerKm ?? DEFAULT_KM_SETTINGS.ratePerKm;
  const ratePerKm = toNumberOrNull(raw.ratePerKm ?? raw.rate_per_km) ?? presetRate;

  return {
    enabled: raw.enabled === true,
    countryCode,
    ratePerKm,
    roundTrip: raw.roundTrip !== false,
    homeLabel: (raw.homeLabel || raw.home_label || "").toString(),
    homeLat: toNumberOrNull(raw.homeLat ?? raw.home_lat),
    homeLng: toNumberOrNull(raw.homeLng ?? raw.home_lng),
  };
};

export const serializeKmSettings = (settings) => ({
  enabled: settings.enabled === true,
  countryCode: settings.countryCode || DEFAULT_KM_SETTINGS.countryCode,
  ratePerKm: Number(settings.ratePerKm) || DEFAULT_KM_SETTINGS.ratePerKm,
  roundTrip: settings.roundTrip !== false,
  homeLabel: (settings.homeLabel || "").trim(),
  homeLat: toNumberOrNull(settings.homeLat),
  homeLng: toNumberOrNull(settings.homeLng),
});

export const haversineDistanceKm = (aLat, aLng, bLat, bLng) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const earthKm = 6371;

  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthKm * c;
};

export const buildKmExpenseFromMission = ({ kmSettings, lieu, patronId, dateIso }) => {
  if (!kmSettings?.enabled) return null;
  if (!patronId || !dateIso) return null;

  const homeLat = toNumberOrNull(kmSettings.homeLat);
  const homeLng = toNumberOrNull(kmSettings.homeLng);
  const workLat = toNumberOrNull(lieu?.latitude);
  const workLng = toNumberOrNull(lieu?.longitude);

  if (homeLat === null || homeLng === null || workLat === null || workLng === null) {
    return null;
  }

  const oneWayKmRaw = haversineDistanceKm(homeLat, homeLng, workLat, workLng);
  const billedKm = kmSettings.roundTrip ? oneWayKmRaw * 2 : oneWayKmRaw;
  const ratePerKm = Number(kmSettings.ratePerKm) || DEFAULT_KM_SETTINGS.ratePerKm;
  const amount = billedKm * ratePerKm;

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const oneWayKm = Number(oneWayKmRaw.toFixed(2));
  const finalKm = Number(billedKm.toFixed(2));
  const finalAmount = Number(amount.toFixed(2));
  const countryLabel = COUNTRY_RATE_PRESETS[kmSettings.countryCode]?.label || kmSettings.countryCode || "BE";

  return {
    description: `[KM] ${countryLabel} ${finalKm} km x ${ratePerKm.toFixed(4)} €/km`,
    montant: finalAmount,
    date_frais: dateIso,
    patron_id: patronId,
    kmMeta: {
      source: "gps",
      countryCode: kmSettings.countryCode,
      oneWayKm,
      billedKm: finalKm,
      ratePerKm,
      roundTrip: kmSettings.roundTrip === true,
      homeLabel: kmSettings.homeLabel || "",
      lieuNom: lieu?.nom || "",
    },
  };
};

export const parseKmExpense = (frais) => {
  const description = (frais?.description || "").trim();
  if (!description) return null;

  const isKmCandidate = description.startsWith("[KM]") || /\b(km|klm|kilometr(?:e|es)?|kilom[eé]tr(?:e|es)?)\b/i.test(description);
  if (!isKmCandidate) return null;

  const montant = Number(frais.montant) || 0;
  const kmMatch = description.match(/(\d+(?:[.,]\d+)?)\s*(?:km|klm|kilometr(?:e|es)?|kilom[eé]tr(?:e|es)?)/i);
  const rateMatch = description.match(/(?:x|@)?\s*(\d+(?:[.,]\d+)?)\s*€\/?km/i);
  const countryMatch = description.match(/^\[KM\]\s*([^\d]+)/i);

  const parsedKm = kmMatch ? Number(kmMatch[1].replace(",", ".")) : null;
  const parsedRate = rateMatch ? Number(rateMatch[1].replace(",", ".")) : null;
  const countryLabel = countryMatch ? countryMatch[1].trim() : "";

  return {
    id: frais.id,
    dateFrais: frais.date_frais,
    description,
    montant,
    billedKm: Number.isFinite(parsedKm) ? parsedKm : 0,
    ratePerKm: Number.isFinite(parsedRate) ? parsedRate : 0,
    countryLabel,
  };
};


export const getCountryRateLabel = (countryCode) => {
  const preset = COUNTRY_RATE_PRESETS[countryCode];
  if (!preset) return countryCode || "-";
  return `${preset.label} (${preset.ratePerKm.toFixed(4)} €/km)`;
};

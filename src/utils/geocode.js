// Cache par adresse normalisée
const geocodeCache = {};

/**
 * Géocode une adresse en utilisant Nominatim (OpenStreetMap)
 * @param {string} address - Adresse à géocoder
 * @returns {Promise<{lat: number, lng: number, normalizedAddress?: string} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address?.trim()) return null;

  const key = address.trim().toLowerCase();
  if (geocodeCache[key]) return geocodeCache[key];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "fr",
        "User-Agent": "HeuresDeGeo/1.0 (https://github.com/ggmusique/heuregeo)",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.length) return null;

    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      normalizedAddress: data[0].display_name,
    };
    geocodeCache[key] = result;
    return result;
  } catch (err) {
    console.error("Erreur géocodage:", err);
    return null;
  }
};

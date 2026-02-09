import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook pour gérer la géolocalisation
 * @param {Function} onSuccess - Callback appelé avec (adresse, lat, lng)
 * @param {Function} onError - Callback appelé avec le message d'erreur
 */
export const useGeolocation = (onSuccess, onError) => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ lat: null, lng: null });

  // Refs pour éviter les problèmes de cleanup
  const isMounted = useRef(true);
  const isRequesting = useRef(false);

  // Cleanup au démontage
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Récupère la position actuelle et l'adresse associée
   */
  const getCurrentLocation = useCallback(async () => {
    // Vérifier si géolocalisation supportée
    if (!navigator.geolocation) {
      onError?.("Géolocalisation non supportée.");
      return;
    }

    // Éviter les appels multiples
    if (isRequesting.current) return;

    isRequesting.current = true;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Vérifier si toujours monté
        if (!isMounted.current) {
          isRequesting.current = false;
          return;
        }

        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "fr",
                "User-Agent": "HeuresDeGeo/1.0",
              },
            }
          );

          // Vérifier si toujours monté après le fetch
          if (!isMounted.current) {
            isRequesting.current = false;
            return;
          }

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();

          if (data?.display_name) {
            const addr = data.address || {};
            const suggested =
              addr.road && addr.city
                ? `${addr.road}, ${addr.city}`
                : data.display_name.split(", ").slice(0, 3).join(", ");

            onSuccess?.(suggested, latitude, longitude);
          } else {
            onError?.("Adresse introuvable.");
          }
        } catch (err) {
          console.error("Erreur géocodage:", err);
          if (isMounted.current) {
            onError?.("Erreur géocodage.");
          }
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
          isRequesting.current = false;
        }
      },
      (err) => {
        if (!isMounted.current) {
          isRequesting.current = false;
          return;
        }

        setLoading(false);
        isRequesting.current = false;

        // Messages d'erreur personnalisés
        const errorMessages = {
          1: "Géolocalisation refusée.",
          2: "Position indisponible.",
          3: "Délai dépassé.",
        };

        const msg = errorMessages[err.code] || "Erreur géolocalisation.";
        onError?.(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onSuccess, onError]);

  /**
   * Réinitialise la position
   */
  const resetPosition = useCallback(() => {
    setPosition({ lat: null, lng: null });
  }, []);

  return {
    loading,
    position,
    getCurrentLocation,
    resetPosition,
  };
};

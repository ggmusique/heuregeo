import React, { useState, useEffect, useMemo } from "react";

/**
 * ✅ LieuModal (GPS OK + précision ±Xm + Vider GPS)
 */
export const LieuModal = ({
  show,
  editMode = false,
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
  onGetGPS = null,
}) => {
  // ========= STATE DU FORMULAIRE =========
  const [nom, setNom] = useState("");
  const [adresseComplete, setAdresseComplete] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ NOUVEAU : précision GPS (en mètres)
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // ========= MODE ÉDITION : pré-remplissage =========
  useEffect(() => {
    if (editMode && initialData) {
      setNom(initialData.nom || "");
      setAdresseComplete(initialData.adresse_complete || "");
      setLatitude(initialData.latitude?.toString() || "");
      setLongitude(initialData.longitude?.toString() || "");
      setNotes(initialData.notes || "");
    } else {
      setNom("");
      setAdresseComplete("");
      setLatitude("");
      setLongitude("");
      setNotes("");
    }

    // ✅ On reset aussi le state "UI"
    setErrorMsg("");
    setGpsAccuracy(null);
  }, [editMode, initialData, show]);

  // ========= VALIDATION =========
  const isNomOk = useMemo(() => !!nom.trim(), [nom]);

  const isLatOk = useMemo(() => {
    if (!latitude) return true;
    const v = parseFloat(latitude);
    return !isNaN(v) && v >= -90 && v <= 90;
  }, [latitude]);

  const isLonOk = useMemo(() => {
    if (!longitude) return true;
    const v = parseFloat(longitude);
    return !isNaN(v) && v >= -180 && v <= 180;
  }, [longitude]);

  // ✅ GPS rempli + valide
  const gpsIsOk = useMemo(() => {
    const hasLat = !!latitude;
    const hasLon = !!longitude;
    return hasLat && hasLon && isLatOk && isLonOk;
  }, [latitude, longitude, isLatOk, isLonOk]);

  const canSubmit = useMemo(() => {
    return isNomOk && isLatOk && isLonOk && !loading && !gpsLoading;
  }, [isNomOk, isLatOk, isLonOk, loading, gpsLoading]);

  // ========= ACTIONS GPS =========
  const handleClearGPS = () => {
    setLatitude("");
    setLongitude("");
    setGpsAccuracy(null); // ✅ aussi effacer la précision
  };

  const handleGetCurrentLocation = () => {
    setErrorMsg("");

    if (!("geolocation" in navigator)) {
      setErrorMsg("Géolocalisation non disponible sur cet appareil.");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));

          // ✅ NOUVEAU : précision (accuracy) en mètres
          const acc = position.coords?.accuracy;
          setGpsAccuracy(typeof acc === "number" ? Math.round(acc) : null);

          // Optionnel : reverse geocoding
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          )
            .then((res) => res.json())
            .then((data) => {
              if (data?.display_name) setAdresseComplete(data.display_name);
            })
            .catch(() => {});
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setErrorMsg("Impossible d'obtenir votre position (GPS refusé ou indisponible).");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  // ========= SUBMIT =========
  const handleSubmit = () => {
    setErrorMsg("");

    if (!nom.trim()) {
      setErrorMsg("Le nom du lieu est obligatoire.");
      return;
    }
    if (!isLatOk) {
      setErrorMsg("Latitude invalide (doit être entre -90 et 90).");
      return;
    }
    if (!isLonOk) {
      setErrorMsg("Longitude invalide (doit être entre -180 et 180).");
      return;
    }

    onSubmit?.({
      nom: nom.trim(),
      adresse_complete: adresseComplete.trim() || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      notes: notes.trim() || null,
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      <div
        className={`w-full max-w-md p-8 rounded-[40px] border-2 ${
          darkMode
            ? "bg-[#121420] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        <h3 className="text-xl font-black uppercase mb-6 text-center italic">
          {editMode ? "Modifier le lieu" : "Nouveau Lieu"}
        </h3>

        {/* ====== ERREUR UI ====== */}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-200 text-xs font-bold">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ====== NOM ====== */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-indigo-300 tracking-wider opacity-80">
            Nom du lieu <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Bureau Intel Liège"
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
            } backdrop-blur-md`}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
          />
        </div>

        {/* ====== ADRESSE ====== */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-2 text-green-300 tracking-wider opacity-80">
            Adresse complète (optionnel)
          </label>
          <textarea
            placeholder="Rue, ville, pays..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-green-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500"
            } backdrop-blur-md`}
            value={adresseComplete}
            onChange={(e) => setAdresseComplete(e.target.value)}
            rows={2}
          />
        </div>

        {/* ====== GPS ====== */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <label className="block text-[10px] font-black uppercase text-purple-300 tracking-wider opacity-80">
              Coordonnées GPS (optionnel)
            </label>

            {/* ✅ Badge GPS OK + précision */}
            {gpsIsOk && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                ✅ GPS OK
                {typeof gpsAccuracy === "number" ? ` • ± ${gpsAccuracy}m` : ""}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setLatitude("");
                setLongitude("");
                setGpsAccuracy(null);
              }}
              disabled={gpsLoading || (!latitude && !longitude)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                gpsLoading || (!latitude && !longitude)
                  ? "bg-gray-600 cursor-not-allowed opacity-60"
                  : "bg-white/10 hover:bg-white/15 active:scale-95"
              } text-white`}
              title="Effacer latitude/longitude"
            >
              🧹 Vider GPS
            </button>

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                gpsLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 active:scale-95"
              } text-white`}
            >
              {gpsLoading ? "⏳ GPS..." : "📍 Position actuelle"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.000001"
              placeholder="Latitude"
              className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md`}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <input
              type="number"
              step="0.000001"
              placeholder="Longitude"
              className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                darkMode
                  ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md`}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>

          {(!isLatOk || !isLonOk) && (
            <p className="mt-2 text-[10px] text-red-300/80 font-bold">
              ⚠️ Latitude: -90 à 90, Longitude: -180 à 180
            </p>
          )}
        </div>

        {/* ====== NOTES ====== */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase mb-2 text-cyan-300 tracking-wider opacity-80">
            Notes (optionnel)
          </label>
          <textarea
            placeholder="Informations supplémentaires..."
            className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
              darkMode
                ? "bg-black/20 border-white/5 text-white focus:border-cyan-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
            } backdrop-blur-md`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* ====== BOUTONS ====== */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black backdrop-blur-md hover:bg-white/10 transition-all"
          >
            ANNULER
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black text-white backdrop-blur-md transition-all ${
              !canSubmit
                ? "bg-gray-600 opacity-50 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {loading ? "..." : editMode ? "MODIFIER" : "CRÉER"}
          </button>
        </div>

        <p className="text-[9px] text-white/40 text-center mt-4">
          <span className="text-red-400">*</span> Champ obligatoire
        </p>
      </div>
    </div>
  );
};

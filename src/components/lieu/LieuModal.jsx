import React, { useState, useEffect } from "react";
import { geocodeAddress } from "../../utils/geocode";

export const LieuModal = ({
  show = false,
  editMode = false,
  initialData = null,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  darkMode = true,
}) => {
  const [formData, setFormData] = useState({
    nom: "",
    adresse_complete: "",
    latitude: "",
    longitude: "",
    notes: "",
    type: "client",
  });
  const [geocodeStatus, setGeocodeStatus] = useState("idle"); // idle | searching | ok | error
  const [geocodeError, setGeocodeError] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    if (show && editMode && initialData) {
      setFormData({
        nom: initialData.nom || "",
        adresse_complete: initialData.adresse_complete || "",
        latitude: initialData.latitude || "",
        longitude: initialData.longitude || "",
        notes: initialData.notes || "",
        type: initialData.type || "client",
      });
      setGeocodeStatus(initialData.latitude && initialData.longitude ? "ok" : "idle");
      setGeocodeError("");
      setPendingSubmit(false);
    } else if (show && !editMode) {
      setFormData({
        nom: initialData?.nom || "",
        adresse_complete: initialData?.adresse_complete || "",
        latitude: "",
        longitude: "",
        notes: initialData?.notes || "",
        type: "client",
      });
      setGeocodeStatus("idle");
      setGeocodeError("");
      setPendingSubmit(false);
    }
  }, [show, editMode, initialData]);

  const hasCoords = () => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  };

  const doGeocode = async () => {
    const query = [formData.adresse_complete, formData.nom].map((s) => (s || "").trim()).filter(Boolean).join(", ");
    if (!query) {
      setGeocodeStatus("error");
      setGeocodeError("Saisir le nom ou l'adresse du lieu.");
      return null;
    }
    setGeocodeStatus("searching");
    setGeocodeError("");
    const result = await geocodeAddress(query);
    if (result) {
      setFormData((prev) => ({
        ...prev,
        latitude: result.lat.toString(),
        longitude: result.lng.toString(),
        adresse_complete: result.normalizedAddress || prev.adresse_complete,
      }));
      setGeocodeStatus("ok");
      return result;
    } else {
      setFormData((prev) => ({ ...prev, latitude: "", longitude: "" }));
      setGeocodeStatus("error");
      setGeocodeError("Adresse introuvable. Vérifiez l'orthographe ou ajoutez le code postal / la ville.");
      return null;
    }
  };

  const submitData = (lat, lng, forceMissing = false) => {
    const dataToSubmit = {
      nom: formData.nom.trim(),
      adresse_complete: formData.adresse_complete.trim() || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      notes: formData.notes.trim() || null,
      type: formData.type || "client",
    };
    onSubmit(dataToSubmit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      alert("Le nom de la ville est obligatoire");
      return;
    }
    if (hasCoords()) {
      submitData(formData.latitude, formData.longitude, false);
      return;
    }
    // Try geocoding
    setPendingSubmit(true);
    const result = await doGeocode();
    if (result) {
      submitData(result.lat, result.lng, false);
      setPendingSubmit(false);
    } else {
      setPendingSubmit(false);
      // Don't submit yet - show error options
    }
  };

  const handleSaveAnyway = () => {
    submitData(null, null, true);
  };

  const handleRetryGeocode = async () => {
    const result = await doGeocode();
    if (result) {
      submitData(result.lat, result.lng, false);
    }
  };

  if (!show) return null;

  const inputCls = `w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${
    darkMode
      ? "bg-black/20 border-white/5 text-white focus:border-purple-500"
      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
  } backdrop-blur-md placeholder:text-white/40`;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md p-6 rounded-[30px] max-h-[90vh] overflow-y-auto ${
          darkMode
            ? "bg-[#1a1f2e] border-2 border-purple-500/40"
            : "bg-white border-2 border-slate-200"
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase mb-6 text-center">
          {editMode ? "✏️ Modifier Lieu" : "➕ Nouveau Lieu"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider">
              Nom de la ville <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Dinant, Ciney, Seraing, Atelier..."
              className={inputCls}
              required
            />
          </div>

          {/* Type de lieu */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider">
              Type de lieu
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={inputCls}
            >
              <option value="client">📍 Client</option>
              <option value="atelier">🏭 Atelier</option>
              <option value="bureau">🏢 Bureau</option>
              <option value="domicile">🏠 Domicile</option>
              <option value="autre">📌 Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-60">
              Adresse complète (optionnel)
            </label>
            <input
              type="text"
              value={formData.adresse_complete}
              onChange={(e) => setFormData({ ...formData, adresse_complete: e.target.value })}
              placeholder="Rue, numéro, code postal..."
              className={inputCls}
            />
          </div>

          {/* COORDONNÉES STATUS */}
          <div className={`p-4 rounded-2xl border ${
            geocodeStatus === "ok" ? "border-green-500/40 bg-green-500/10" :
            geocodeStatus === "error" ? "border-red-500/40 bg-red-500/10" :
            geocodeStatus === "searching" ? "border-yellow-500/40 bg-yellow-500/10" :
            "border-white/10 bg-white/5"
          }`}>
            <p className="text-[10px] font-black uppercase text-white/60 mb-2 tracking-wider">
              Coordonnées GPS
            </p>
            {geocodeStatus === "ok" && (
              <div className="flex items-center justify-between">
                <span className="text-green-400 text-sm font-bold">✅ Coordonnées OK</span>
                <button
                  type="button"
                  onClick={doGeocode}
                  className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-all"
                >
                  {editMode ? "Mettre à jour GPS" : "Recalculer"}
                </button>
              </div>
            )}
            {geocodeStatus === "idle" && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Non renseignées</span>
                <button
                  type="button"
                  onClick={doGeocode}
                  className="text-[10px] font-black uppercase text-purple-300 hover:text-purple-100 transition-all"
                >
                  {editMode ? "Mettre à jour GPS" : "Chercher les coordonnées"}
                </button>
              </div>
            )}
            {geocodeStatus === "searching" && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-yellow-400 text-sm">Recherche des coordonnées…</span>
              </div>
            )}
            {geocodeStatus === "error" && (
              <div className="space-y-2">
                <p className="text-red-400 text-sm">{geocodeError}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetryGeocode}
                    className="flex-1 py-2 text-[10px] font-black uppercase rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-all"
                  >
                    Réessayer
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAnyway}
                    className="flex-1 py-2 text-[10px] font-black uppercase rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                  >
                    Enregistrer quand même
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GPS manual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-40">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => {
                  setFormData({ ...formData, latitude: e.target.value });
                  if (e.target.value && formData.longitude) setGeocodeStatus("ok");
                  else if (!e.target.value) setGeocodeStatus("idle");
                }}
                placeholder="Ex: 50.1234"
                className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                  darkMode ? "bg-black/20 border-white/5 text-white focus:border-purple-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
                } backdrop-blur-md placeholder:text-white/30`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-40">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => {
                  setFormData({ ...formData, longitude: e.target.value });
                  if (formData.latitude && e.target.value) setGeocodeStatus("ok");
                  else if (!e.target.value) setGeocodeStatus("idle");
                }}
                placeholder="Ex: 4.5678"
                className={`w-full p-3 rounded-xl font-bold outline-none border-2 transition-all text-sm ${
                  darkMode ? "bg-black/20 border-white/5 text-white focus:border-purple-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
                } backdrop-blur-md placeholder:text-white/30`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-purple-300 tracking-wider opacity-60">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Infos complémentaires..."
              rows={3}
              className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all resize-none ${
                darkMode ? "bg-black/20 border-white/5 text-white focus:border-purple-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500"
              } backdrop-blur-md placeholder:text-white/40`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[11px] text-white/60 hover:text-white transition-all border border-white/10"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || pendingSubmit || geocodeStatus === "searching"}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl font-black uppercase text-[11px] text-white transition-all disabled:opacity-50 active:scale-95"
            >
              {loading || pendingSubmit || geocodeStatus === "searching" ? "..." : editMode ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

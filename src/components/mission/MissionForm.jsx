import React, { useState, useCallback, useEffect, useMemo } from "react";
import { DateSelector } from "../common/DateSelector";
import { PatronSelectorCompact } from "../patron/PatronSelector";
import {
  PAUSE_OPTIONS,
  TARIF_OPTIONS,
  TIME_OPTIONS,
} from "../../constants/options";
import { calculerDuree } from "../../utils/calculators";
import { ClientSelector } from "../client/ClientSelector";
import { WeatherIcon } from "../common/WeatherIcon";
import { LieuSelector } from "../lieu/LieuSelector";

const JOURNEE_TYPE = { debut: "08:00", fin: "17:00", pause: 30 };
const MAX_TIME_MINUTES = 23 * 60 + 45;
const MAX_PAUSE_MINUTES = 180;

const adjustTime = (time, deltaMinutes) => {
  const [h, m] = time.split(":").map(Number);
  const total = Math.max(0, Math.min(MAX_TIME_MINUTES, h * 60 + m + deltaMinutes));
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

export const MissionForm = ({
  editMode = false,
  initialData = null,
  clientsUniques = [],
  lieuxUniques = [],
  onCopyLast,
  onSubmit,
  onCancel,
  darkMode = true,
  isIOS = false,
  loading = false,
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
  onAddNewPatron = () => {},
  showRateEditorControl = true,
  clients = [],
  selectedClientId = null,
  onClientChange = () => {},
  onAddNewClient = () => {},
  lieux = [],
  selectedLieuId = null,
  onLieuChange = () => {},
  onAddNewLieu = () => {},
  missions = [],
}) => {
  const [pause, setPause] = useState(initialData?.pause ?? 30);
  const [dateMission, setDateMission] = useState(() => {
    return initialData?.date_iso || new Date().toISOString().split("T")[0];
  });
  const [debut, setDebut] = useState(initialData?.debut || "08:00");
  const [fin, setFin] = useState(initialData?.fin || "17:00");
  const [tarifHoraire, setTarifHoraire] = useState(
    initialData?.tarif?.toString?.() || "15"
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherCity, setWeatherCity] = useState("");
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const clearError = useCallback((field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return (Array.isArray(clients) ? clients : []).find(
      (c) => c.id === selectedClientId
    );
  }, [clients, selectedClientId]);

  const selectedLieu = useMemo(() => {
    if (!selectedLieuId) return null;
    return (Array.isArray(lieux) ? lieux : []).find((l) => l.id === selectedLieuId);
  }, [lieux, selectedLieuId]);

  const selectedPatron = useMemo(() => {
    if (!selectedPatronId) return null;
    return (Array.isArray(patrons) ? patrons : []).find((p) => p.id === selectedPatronId) || null;
  }, [patrons, selectedPatronId]);

  const patronRate = selectedPatron?.taux_horaire != null ? Number(selectedPatron.taux_horaire) : null;
  const currentRate = Number.parseFloat(tarifHoraire);
  const isCustomRate = Number.isFinite(currentRate) && patronRate != null && currentRate !== patronRate;

  useEffect(() => {
    if (!editMode || !initialData) return;
    if (initialData.lieu_id && onLieuChange) {
      onLieuChange(initialData.lieu_id);
    }
  }, [editMode, initialData, onLieuChange]);

  useEffect(() => {
    if (!dateMission) return;
    let alive = true;
    const loadWeatherAndCity = async () => {
      if (!navigator.geolocation) {
        if (!alive) return;
        setWeatherCity("Géolocalisation non supportée");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`
            );
            if (!weatherRes.ok) throw new Error("Météo HTTP error");
            const weatherData = await weatherRes.json();
            if (!alive) return;
            if (weatherData?.current) {
              const code = weatherData.current.weathercode;
              let icon = "01d";
              let desc = "Ensoleillé";
              if (code >= 61 && code <= 67) { icon = "09d"; desc = "Pluie"; }
              else if (code >= 71 && code <= 77) { icon = "13d"; desc = "Neige"; }
              else if (code >= 80 && code <= 86) { icon = "09d"; desc = "Averses"; }
              else if (code >= 95) { icon = "11d"; desc = "Orage"; }
              else if (code >= 2 && code <= 3) { icon = "02d"; desc = "Nuageux"; }
              setWeather({ temp: Math.round(weatherData.current.temperature_2m), icon, desc });
            } else {
              setWeather(null);
            }
          } catch (err) {
            if (!alive) return;
            setWeather(null);
          }
          try {
            const cityRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
            );
            if (!cityRes.ok) throw new Error("Ville HTTP error");
            const cityData = await cityRes.json();
            if (!alive) return;
            const city =
              cityData?.address?.city ||
              cityData?.address?.town ||
              cityData?.address?.village ||
              cityData?.address?.municipality ||
              "Position actuelle";
            setWeatherCity(city);
          } catch (err) {
            if (!alive) return;
            setWeatherCity("Position actuelle");
          }
        },
        (err) => {
          if (!alive) return;
          setWeatherCity("Localisation indisponible");
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };
    loadWeatherAndCity();
    return () => { alive = false; };
  }, [dateMission]);

  useEffect(() => {
    if (!selectedPatronId || !Array.isArray(patrons) || patrons.length === 0) return;
    const patron = patrons.find((p) => p.id === selectedPatronId);
    if (patron?.taux_horaire != null) {
      setTarifHoraire(patron.taux_horaire.toString());
    }
  }, [selectedPatronId, patrons]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;

    const errors = {};

    if (!dateMission || !debut || !fin) {
      errors.horaires = "Date et horaires requis.";
    } else {
      const [hD, mD] = debut.split(":").map(Number);
      const [hF, mF] = fin.split(":").map(Number);
      const minutesDebut = hD * 60 + mD;
      const minutesFin = hF * 60 + mF;
      if (minutesFin <= minutesDebut) {
        errors.fin = "L'heure de fin doit être après le début.";
      } else {
        const grossDuration = minutesFin - minutesDebut;
        if (pause >= grossDuration) {
          errors.pause = "La pause dépasse la durée de la mission.";
        }
      }
    }

    if (!selectedPatronId) errors.patron = "Patron obligatoire.";
    if (!selectedClientId) errors.client = "Client obligatoire.";
    if (!selectedLieuId) errors.lieu = "Lieu obligatoire.";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const dureeH = calculerDuree(debut, fin, pause);
    const tarifNum = parseFloat(tarifHoraire);
    const montant = dureeH * (Number.isFinite(tarifNum) ? tarifNum : 0);
    const lieuTexte = selectedLieu?.nom || "";
    const missionData = {
      client: selectedClient?.nom || "",
      client_id: selectedClientId || null,
      lieu: lieuTexte,
      lieu_id: selectedLieuId || null,
      debut,
      fin,
      date_iso: dateMission,
      duree: dureeH,
      montant,
      pause,
      patron_id: selectedPatronId || null,
    };
    setIsSubmitting(true);
    onSubmit?.(missionData);
    setTimeout(() => { setIsSubmitting(false); }, 1000);
  }, [
    isSubmitting, dateMission, debut, fin, pause, tarifHoraire,
    selectedPatronId, selectedClientId, selectedClient,
    selectedLieuId, selectedLieu, onSubmit,
  ]);

  const safeDate = useMemo(() => {
    const d = new Date(dateMission);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [dateMission]);

  const getMonthName = () => safeDate.toLocaleString("fr-FR", { month: "long" }).toUpperCase();
  const getDay = () => safeDate.getDate().toString().padStart(2, "0");
  const getYear = () => safeDate.getFullYear();

  const adjustBtnClass = darkMode
    ? "flex-1 py-1 rounded-xl text-[11px] font-black border transition-all active:scale-95 bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
    : "flex-1 py-1 rounded-xl text-[11px] font-black border transition-all active:scale-95 bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200";

  return (
    <section
      className={`relative p-8 rounded-[50px] shadow-2xl border backdrop-blur-2xl overflow-hidden ${
        darkMode ? "bg-white/5 border-indigo-500/20" : "bg-white/70 border-slate-200/80"
      }`}
    >
      <div
        className={`relative mb-6 rounded-[28px] overflow-hidden backdrop-blur-2xl shadow-xl border ${
          darkMode ? "border-yellow-600/20" : "bg-white/35 border-white/25"
        }`}
        style={{
          background: weather
            ? weather.temp < 10
              ? "linear-gradient(135deg, #0a1628, #1a2a4a)"
              : weather.temp < 20
              ? "linear-gradient(135deg, #0d1f3c, #1e3a5f)"
              : "linear-gradient(135deg, #1a2a4a, #2a3a6a)"
            : "linear-gradient(135deg, #0d1f3c, #1e3a5f)",
        }}
      >
        <div className="relative z-10 flex flex-row items-center justify-between gap-3 px-4 py-3 sm:py-4 md:gap-5 md:px-6 md:py-5">
          <div className="flex items-center gap-3 flex-1">
            {weather ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl backdrop-blur-md border border-white/25 shadow-md shrink-0">
                  <WeatherIcon code={weather.icon} className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white drop-shadow leading-none">
                    {weather.temp}°
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-white/90 capitalize">
                    {weather.desc}
                  </div>
                  {weatherCity && (
                    <div className="text-[10px] sm:text-xs text-white/70 font-medium truncate max-w-[140px] sm:max-w-[180px]">
                      📍 {weatherCity}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl" />
                <div className="space-y-1">
                  <div className="h-7 w-16 bg-white/25 rounded" />
                  <div className="h-4 w-24 bg-white/25 rounded" />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDatePicker((v) => !v)}
            className="shrink-0 flex flex-col items-center justify-center px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-br from-[#C9A84C] via-[#A07830] to-[#7A5C20] rounded-2xl backdrop-blur-xl border border-yellow-600/50 shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer min-w-[110px] sm:min-w-[130px] md:min-w-[150px]"
          >
            <div className="text-[9px] sm:text-[10px] font-black uppercase text-yellow-100/90 tracking-wider mb-0.5">
              DATE MISSION
            </div>
            <div className="text-center leading-tight">
              <div className="text-xs sm:text-sm font-black uppercase text-white/90">
                {getMonthName()}
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg my-0.5">
                {getDay()}
              </div>
              <div className="text-xs sm:text-sm font-black text-white/90">
                {getYear()}
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] font-black uppercase text-yellow-100/90 tracking-wider mt-1">
              CHANGER
            </div>
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className={`w-full max-w-sm p-6 rounded-[30px] ${
              darkMode
                ? "bg-[#1a1f2e] border-2 border-indigo-500/40"
                : "bg-white border-2 border-slate-200"
            } shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black uppercase mb-4 text-center text-white">
              Choisir la date
            </h3>
            <DateSelector
              dateMission={dateMission}
              setDateMission={(newDate) => {
                setDateMission(newDate);
                setShowDatePicker(false);
              }}
              isIOS={isIOS}
            />
            <button
              onClick={() => setShowDatePicker(false)}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black uppercase text-[11px] text-white transition-all"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <PatronSelectorCompact
          patrons={patrons}
          selectedPatronId={selectedPatronId}
          onSelect={(id) => { onPatronChange(id); clearError("patron"); }}
          required={true}
          darkMode={darkMode}
          onAddNew={onAddNewPatron}
        />
        {formErrors.patron && (
          <p className="mt-1 text-xs font-black text-red-400">{formErrors.patron}</p>
        )}

        {showRateEditorControl && (
          <div className={`mt-3 p-3 rounded-xl border ${darkMode ? "bg-emerald-900/15 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-wider">Taux mission</p>
                <p className="text-sm font-black text-emerald-300">
                  {Number.isFinite(currentRate) ? `${currentRate.toFixed(2)} €/h` : "Non défini"}
                </p>
                {patronRate != null && (
                  <p className="text-[10px] opacity-70">Taux patron: {Number(patronRate).toFixed(2)} €/h</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRateEditor((v) => !v)}
                className="px-3 py-2 rounded-lg border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/10 transition-all"
              >
                {showRateEditor ? "Fermer" : "Modifier le taux du jour"}
              </button>
            </div>

            {isCustomRate && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-300">
                Taux personnalisé actif
              </p>
            )}

            {showRateEditor && (
              <div className="mt-3">
                <select
                  value={tarifHoraire}
                  onChange={(e) => setTarifHoraire(e.target.value)}
                  className={`w-full p-3 rounded-xl font-black text-sm border-2 outline-none ${
                    darkMode
                      ? "bg-black/30 border-emerald-500/30 text-white"
                      : "bg-white border-emerald-300 text-slate-900"
                  }`}
                >
                  {TARIF_OPTIONS.map((val) => (
                    <option key={val} value={val}>
                      {val.toFixed(2)} €/h
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onSelect={(id) => { onClientChange(id); clearError("client"); }}
          required={true}
          darkMode={darkMode}
          onAddNew={onAddNewClient}
        />
        {formErrors.client && (
          <p className="mt-1 text-xs font-black text-red-400">{formErrors.client}</p>
        )}
      </div>

      <div className="mb-6">
        <LieuSelector
          lieux={lieux}
          selectedLieuId={selectedLieuId}
          onSelect={(id) => { onLieuChange(id); clearError("lieu"); }}
          required={true}
          darkMode={darkMode}
          onAddNew={() => {
            const prefill = selectedClient?.nom
              ? { nom: "", notes: `Lieu pour ${selectedClient.nom}` }
              : null;
            onAddNewLieu(prefill);
          }}
          selectedClientId={selectedClientId}
          missions={missions}
        />
        {formErrors.lieu && (
          <p className="mt-1 text-xs font-black text-red-400">{formErrors.lieu}</p>
        )}
      </div>

      {/* Preset + Duplicate row */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => { setDebut(JOURNEE_TYPE.debut); setFin(JOURNEE_TYPE.fin); setPause(JOURNEE_TYPE.pause); }}
          className={`flex-1 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
            darkMode
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
              : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
          }`}
        >
          ☀️ Journée type
        </button>
        {onCopyLast && (
          <button
            type="button"
            onClick={onCopyLast}
            className={`flex-1 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
              darkMode
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                : "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            📋 Dupliquer
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Début */}
        <div className="flex flex-col gap-1">
          <div
            className={`p-4 rounded-[28px] border-2 bg-black/40 relative text-center flex flex-col items-center justify-center min-h-[90px] ${
              formErrors.fin ? "border-red-500" : darkMode ? "border-slate-700" : "border-slate-300"
            } backdrop-blur-md`}
          >
            <span className="text-[9px] font-black opacity-40 uppercase block mb-1">Début</span>
            <span className="text-xl font-black text-indigo-400">{debut}</span>
            <select
              value={debut}
              onChange={(e) => { setDebut(e.target.value); clearError("fin"); clearError("horaires"); }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setDebut(adjustTime(debut, -15)); clearError("fin"); }} className={adjustBtnClass}>−</button>
            <button type="button" onClick={() => { setDebut(adjustTime(debut, 15)); clearError("fin"); }} className={adjustBtnClass}>+</button>
          </div>
        </div>

        {/* Pause */}
        <div className="flex flex-col gap-1">
          <div
            className={`p-4 bg-black/40 rounded-[28px] border-2 relative flex flex-col items-center justify-center text-center min-h-[90px] ${
              formErrors.pause ? "border-red-500" : darkMode ? "border-slate-700" : "border-slate-300"
            } backdrop-blur-md`}
          >
            <span className="text-[9px] font-black opacity-40 uppercase block mb-1">Pause</span>
            <div className="font-black text-xl text-indigo-400">{pause}m</div>
            <select
              value={pause}
              onChange={(e) => { setPause(parseInt(e.target.value, 10)); clearError("pause"); }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {PAUSE_OPTIONS.map((val) => (<option key={val} value={val}>{val} min</option>))}
            </select>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setPause((p) => Math.max(0, p - 15)); clearError("pause"); }} className={adjustBtnClass}>−</button>
            <button type="button" onClick={() => { setPause((p) => Math.min(MAX_PAUSE_MINUTES, p + 15)); clearError("pause"); }} className={adjustBtnClass}>+</button>
          </div>
        </div>

        {/* Fin */}
        <div className="flex flex-col gap-1">
          <div
            className={`p-4 rounded-[28px] border-2 bg-black/40 relative text-center flex flex-col items-center justify-center min-h-[90px] ${
              formErrors.fin ? "border-red-500" : darkMode ? "border-slate-700" : "border-slate-300"
            } backdrop-blur-md`}
          >
            <span className="text-[9px] font-black opacity-40 uppercase block mb-1">Fin</span>
            <span className="text-xl font-black text-purple-400">{fin}</span>
            <select
              value={fin}
              onChange={(e) => { setFin(e.target.value); clearError("fin"); clearError("horaires"); }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setFin(adjustTime(fin, -15)); clearError("fin"); }} className={adjustBtnClass}>−</button>
            <button type="button" onClick={() => { setFin(adjustTime(fin, 15)); clearError("fin"); }} className={adjustBtnClass}>+</button>
          </div>
        </div>
      </div>

      <div className="mt-2 mb-10 min-h-[20px] text-center">
        {(formErrors.fin || formErrors.pause || formErrors.horaires) && (
          <p className="text-xs font-black text-red-400">
            {formErrors.fin || formErrors.pause || formErrors.horaires}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || isSubmitting}
          className="relative w-full py-6 group overflow-hidden rounded-[30px] font-black uppercase tracking-widest text-[13px] transition-all active:scale-95 disabled:opacity-50 border border-yellow-600/50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3c] to-[#1e3a5f]" />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          <span className="relative z-10 text-yellow-100 drop-shadow">
            {isSubmitting
              ? "Enregistrement..."
              : editMode ? "Mettre à jour" : "Enregistrer la mission"}
          </span>
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="py-4 text-white/60 font-bold uppercase text-[11px] hover:text-white transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </section>
  );
};
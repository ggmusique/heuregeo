import React, { useState, useCallback, useEffect } from "react";
import { DateSelector } from "../common/DateSelector";
import { PatronSelectorCompact } from "../patron/PatronSelector";
import { useGeolocation } from "../../hooks/useGeolocation";
import {
  PAUSE_OPTIONS,
  TARIF_OPTIONS,
  TIME_OPTIONS,
} from "../../constants/options";
import { calculerDuree } from "../../utils/calculators";
import { ClientSelector } from "../client/ClientSelector";

export const MissionForm = ({
  editMode = false,
  initialData = null,
  clientsUniques = [],
  lieuxUniques = [],
  onSubmit,
  onCancel,
  onCopyLast,
  darkMode = true,
  isIOS = false,
  loading = false,
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
  clients = [],
  selectedClientId = null,
  onClientChange = () => {},
  onAddNewClient = () => {},
}) => {
  const [client, setClient] = useState(initialData?.client || "");
  const [lieu, setLieu] = useState(initialData?.lieu || "");
  const [pause, setPause] = useState(initialData?.pause || 30);
  const [dateMission, setDateMission] = useState(
    initialData?.date_iso || new Date().toISOString().split("T")[0]
  );
  const [debut, setDebut] = useState(initialData?.debut || "08:00");
  const [fin, setFin] = useState(initialData?.fin || "17:00");
  const [tarifHoraire, setTarifHoraire] = useState(initialData?.tarif || "15");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [weather, setWeather] = useState(null);
  const [weatherCity, setWeatherCity] = useState(""); // ← pour afficher la ville dans la météo

  const {
    loading: geoLoading,
    position,
    getCurrentLocation,
  } = useGeolocation(
    (address) => setLieu(address), // ← bouton manuel seulement
    (error) => alert(error)
  );

  // Géoloc + météo + ville AUTOMATIQUE (indépendante du champ lieu)
  useEffect(() => {
    if (!dateMission) return;

    const loadWeatherAndCity = async () => {
      if (!navigator.geolocation) {
        setWeatherCity("Géolocalisation non supportée");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // 1. Météo Open-Meteo
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`
            );
            const weatherData = await weatherRes.json();

            if (weatherData.current) {
              const code = weatherData.current.weathercode;
              let icon = "01d";
              let desc = "Ensoleillé";

              if (code >= 61 && code <= 67) {
                icon = "09d";
                desc = "Pluie";
              } else if (code >= 71 && code <= 77) {
                icon = "13d";
                desc = "Neige";
              } else if (code >= 80 && code <= 86) {
                icon = "09d";
                desc = "Averses";
              } else if (code >= 95) {
                icon = "11d";
                desc = "Orage";
              } else if (code >= 2 && code <= 3) {
                icon = "02d";
                desc = "Nuageux";
              }

              setWeather({
                temp: Math.round(weatherData.current.temperature_2m),
                icon,
                desc,
              });
            }
          } catch (err) {
            console.warn("Météo indisponible", err);
            setWeather(null);
          }

          // 2. Ville via Nominatim (reverse geocoding)
          try {
            const cityRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
            );
            const cityData = await cityRes.json();

            const city =
              cityData.address?.city ||
              cityData.address?.town ||
              cityData.address?.village ||
              cityData.address?.municipality ||
              "Position actuelle";

            setWeatherCity(city);
          } catch (err) {
            console.warn("Ville indisponible", err);
            setWeatherCity("Position actuelle");
          }
        },
        (err) => {
          console.warn("Géoloc refusée", err);
          setWeatherCity("Localisation indisponible");
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    };

    loadWeatherAndCity();
  }, [dateMission]);

  // Auto-remplir tarif depuis patron
  useEffect(() => {
    if (selectedPatronId && patrons.length > 0) {
      const patron = patrons.find((p) => p.id === selectedPatronId);
      if (patron && patron.taux_horaire) {
        setTarifHoraire(patron.taux_horaire.toString());
      }
    }
  }, [selectedPatronId, patrons]);

  const handleSubmit = useCallback(() => {
    // Validation de base
    if (!dateMission || !debut || !fin) {
      alert("Veuillez remplir la date et les horaires.");
      return;
    }

    if (!selectedPatronId) {
      alert("Veuillez sélectionner un patron pour cette mission.");
      return;
    }

    if (!selectedClientId) {
      alert("Veuillez sélectionner un client pour cette mission.");
      return;
    }

    const dureeH = calculerDuree(debut, fin, pause);

    // Récupérer le nom du client et du lieu depuis les objets
    const client = clients.find((c) => c.id === selectedClientId);
    const missionData = {
      client: client?.nom || "", // Nom du client
      lieu: client?.lieu_travail || client?.adresse || "", // ✅ NOUVEAU : Lieu depuis le client
      debut,
      fin,
      date_iso: dateMission,
      duree: dureeH,
      montant: dureeH * parseFloat(tarifHoraire),
      pause,
      patron_id: selectedPatronId,
      client_id: selectedClientId,
    };

    onSubmit(missionData);
  }, [
    dateMission,
    debut,
    fin,
    pause,
    tarifHoraire,
    selectedPatronId,
    selectedClientId,
    clients, // ✅ AJOUTER
    onSubmit,
  ]);

  // Helpers calendrier
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getMonthName = (dateStr) => {
    return new Date(dateStr)
      .toLocaleString("fr-FR", { month: "long" })
      .toUpperCase();
  };

  const getDay = (dateStr) => {
    return new Date(dateStr).getDate().toString().padStart(2, "0");
  };

  const getYear = (dateStr) => {
    return new Date(dateStr).getFullYear();
  };

  return (
    <section
      className={`relative p-8 rounded-[50px] shadow-2xl border backdrop-blur-2xl overflow-hidden ${
        darkMode
          ? "bg-white/5 border-indigo-500/20"
          : "bg-white/70 border-slate-200/80"
      }`}
    >
      {/* CARTE MÉTÉO + DATE */}
      <div
        className={`relative mb-6 rounded-[28px] overflow-hidden backdrop-blur-2xl shadow-xl border ${
          darkMode
            ? "bg-white/6 border-white/12"
            : "bg-white/35 border-white/25"
        }`}
        style={{
          background: weather
            ? weather.temp < 10
              ? "linear-gradient(135deg, #4c669f, #3b5998)"
              : weather.temp < 20
              ? "linear-gradient(135deg, #667eea, #764ba2)"
              : "linear-gradient(135deg, #f12711, #f5af19)"
            : "linear-gradient(135deg, #667eea, #764ba2)",
        }}
      >
        <div className="relative z-10 flex flex-row items-center justify-between gap-3 px-4 py-3 sm:py-4 md:gap-5 md:px-6 md:py-5">
          {/* MÉTÉO */}
          <div className="flex items-center gap-3 flex-1">
            {weather ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl backdrop-blur-md border border-white/25 shadow-md shrink-0">
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`}
                    alt={weather.desc}
                    className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-lg"
                  />
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

          {/* CALENDRIER */}
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="shrink-0 flex flex-col items-center justify-center px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-br from-purple-700/85 via-indigo-600/80 to-purple-900/85 rounded-2xl backdrop-blur-xl border border-purple-400/35 shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer min-w-[110px] sm:min-w-[130px] md:min-w-[150px]"
          >
            <div className="text-[9px] sm:text-[10px] font-black uppercase text-purple-200/85 tracking-wider mb-0.5">
              DATE MISSION
            </div>
            <div className="text-center leading-tight">
              <div className="text-xs sm:text-sm font-black uppercase text-white/90">
                {getMonthName(dateMission)}
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg my-0.5">
                {getDay(dateMission)}
              </div>
              <div className="text-xs sm:text-sm font-black text-white/90">
                {getYear(dateMission)}
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] font-black uppercase text-purple-200/85 tracking-wider mt-1">
              CHANGER
            </div>
          </button>
        </div>
      </div>

      {/* MODAL DATE PICKER */}
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

      {/* PATRON + TARIF */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1">
          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={darkMode}
          />
        </div>

        <div
          className={`shrink-0 w-[64px] h-[64px] rounded-2xl border-2 flex items-center justify-center relative overflow-hidden transition-all active:scale-90 mt-5 ${
            darkMode
              ? "bg-green-900/20 border-green-700/60 text-green-300 hover:border-green-500"
              : "bg-green-100/70 border-green-300 text-green-700 hover:border-green-500"
          }`}
        >
          <div className="text-2xl">€</div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-xs font-bold text-green-200 pointer-events-none">
            {tarifHoraire}€/h
          </div>
          <select
            value={tarifHoraire}
            onChange={(e) => setTarifHoraire(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            {TARIF_OPTIONS.map((val) => (
              <option key={val} value={val}>
                {val.toFixed(2)} €
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CLIENT + DERNIER JOB */}
      <div className="mb-6">
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onSelect={onClientChange}
          required={true}
          darkMode={darkMode}
          onAddNew={onAddNewClient}
        />
      </div>

      {/* LIEU + GEOLOC (manuel seulement) */}
      {selectedClientId &&
        clients.find((c) => c.id === selectedClientId)?.lieu_travail && (
          <div className="mb-4 p-4 bg-purple-600/20 rounded-2xl border border-purple-500/30">
            <div className="text-[10px] font-black uppercase text-purple-300 mb-1">
              Lieu de travail
            </div>
            <div className="text-sm text-white">
              📍 {clients.find((c) => c.id === selectedClientId)?.lieu_travail}
            </div>
          </div>
        )}

      {/* HORAIRES */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div
          className={`p-4 rounded-[28px] border-2 bg-black/40 relative text-center flex flex-col items-center justify-center min-h-[90px] ${
            darkMode ? "border-slate-700" : "border-slate-300"
          } backdrop-blur-md`}
        >
          <span className="text-[9px] font-black opacity-40 uppercase block mb-1">
            Début
          </span>
          <span className="text-xl font-black text-indigo-400">{debut}</span>
          <select
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`p-4 bg-black/40 rounded-[28px] border-2 relative flex flex-col items-center justify-center text-center min-h-[90px] ${
            darkMode ? "border-slate-700" : "border-slate-300"
          } backdrop-blur-md`}
        >
          <span className="text-[9px] font-black opacity-40 uppercase block mb-1">
            Pause
          </span>
          <div className="font-black text-xl text-indigo-400">{pause}m</div>
          <select
            value={pause}
            onChange={(e) => setPause(parseInt(e.target.value))}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          >
            {PAUSE_OPTIONS.map((val) => (
              <option key={val} value={val}>
                {val} min
              </option>
            ))}
          </select>
        </div>

        <div
          className={`p-4 rounded-[28px] border-2 bg-black/40 relative text-center flex flex-col items-center justify-center min-h-[90px] ${
            darkMode ? "border-slate-700" : "border-slate-300"
          } backdrop-blur-md`}
        >
          <span className="text-[9px] font-black opacity-40 uppercase block mb-1">
            Fin
          </span>
          <span className="text-xl font-black text-purple-400">{fin}</span>
          <select
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOUTONS D'ACTION */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="relative w-full py-6 group overflow-hidden rounded-[30px] font-black uppercase tracking-widest text-[13px] transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700" />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
          <span className="relative z-10 text-white drop-shadow">
            {editMode ? "Mettre à jour" : "Enregistrer la mission"}
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

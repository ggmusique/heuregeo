import React, { useMemo } from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";
import { COUNTRY_RATE_PRESETS } from "../../../utils/kmUtils";

/**
 * Modale de saisie manuelle des frais kilométriques
 */
export const FraisKmModal = ({
  show,
  distanceKm,
  setDistanceKm,
  countryCode,
  setCountryCode,
  ratePerKm,
  setRatePerKm,
  date,
  setDate,
  onSubmit,
  onCancel,
  loading = false,
  darkMode = true,
  isIOS = false,
  patrons = [],
  selectedPatronId = null,
  onPatronChange = () => {},
  autoCalcLieuNom = null,
}) => {
  if (!show) return null;

  const distanceNum = useMemo(() => {
    const d = (distanceKm ?? "").toString().replace(",", ".");
    const n = parseFloat(d);
    return Number.isFinite(n) ? n : NaN;
  }, [distanceKm]);

  const rateNum = useMemo(() => {
    const r = (ratePerKm ?? "").toString().replace(",", ".");
    const n = parseFloat(r);
    return Number.isFinite(n) ? n : NaN;
  }, [ratePerKm]);

  const montantCalcule = useMemo(() => {
    if (!Number.isFinite(distanceNum) || !Number.isFinite(rateNum)) return null;
    return Number((distanceNum * rateNum).toFixed(2));
  }, [distanceNum, rateNum]);

  const distanceOk = Number.isFinite(distanceNum) && distanceNum > 0;
  const rateOk = Number.isFinite(rateNum) && rateNum > 0;
  const patronOk = !!selectedPatronId;

  const canSubmit = distanceOk && rateOk && patronOk && !loading;

  const handleCountryChange = (e) => {
    const code = e.target.value;
    setCountryCode(code);
    const preset = COUNTRY_RATE_PRESETS[code];
    if (preset) setRatePerKm(preset.ratePerKm.toString());
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      <div
        className={`w-full max-w-sm p-8 rounded-[40px] border-2 ${
          darkMode
            ? "bg-[#121420] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        <h3 className="text-xl font-black uppercase mb-6 text-center italic">
          🚗 Frais kilométriques
        </h3>

        {/* Sélecteur de patron */}
        <div className="mb-6">
          <PatronSelectorCompact
            patrons={patrons}
            selectedPatronId={selectedPatronId}
            onSelect={onPatronChange}
            required={true}
            darkMode={darkMode}
          />
        </div>

        {/* Pays */}
        <p className="text-[11px] font-black uppercase mb-2 text-cyan-300 tracking-wider opacity-80">
          Pays
        </p>
        <select
          value={countryCode}
          onChange={handleCountryChange}
          className={`w-full p-4 rounded-2xl mb-4 font-bold outline-none border backdrop-blur-md transition-all ${
            darkMode
              ? "bg-black/20 text-white border-white/5"
              : "bg-slate-50 text-slate-900 border-slate-200"
          }`}
        >
          {Object.entries(COUNTRY_RATE_PRESETS).map(([code, preset]) => (
            <option key={code} value={code}>
              {preset.label} ({preset.ratePerKm.toFixed(4)} €/km)
            </option>
          ))}
        </select>

        {/* Auto-calc note */}
        {autoCalcLieuNom && distanceOk && (
          <div className="mb-3 p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
              📍 Distance calculée auto : domicile → {autoCalcLieuNom}
            </span>
          </div>
        )}

        {/* Distance */}
        <input
          type="text"
          inputMode="decimal"
          placeholder="Distance (km)"
          className={`w-full p-5 rounded-2xl mb-2 font-bold outline-none border backdrop-blur-md transition-all ${
            darkMode
              ? "bg-black/20 text-white border-white/5"
              : "bg-slate-50 text-slate-900 border-slate-200"
          } ${!distanceOk ? "border-red-500/40" : ""}`}
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
        />
        {!distanceOk && (
          <p className="text-[10px] text-red-300 mb-3">Distance obligatoire (doit être &gt; 0)</p>
        )}

        {/* Taux */}
        <input
          type="text"
          inputMode="decimal"
          placeholder="Taux (€/km)"
          className={`w-full p-5 rounded-2xl mb-2 font-bold outline-none border backdrop-blur-md transition-all ${
            darkMode
              ? "bg-black/20 text-white border-white/5"
              : "bg-slate-50 text-slate-900 border-slate-200"
          } ${!rateOk ? "border-red-500/40" : ""}`}
          value={ratePerKm}
          onChange={(e) => setRatePerKm(e.target.value)}
        />

        {/* Montant calculé */}
        {montantCalcule !== null && (
          <div className="mb-4 p-3 rounded-2xl bg-cyan-600/10 border border-cyan-500/20 text-center">
            <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">
              Montant : {montantCalcule.toFixed(2)} €
            </span>
          </div>
        )}

        {/* Date */}
        <p className="text-[11px] font-black uppercase mb-2 text-cyan-300 tracking-wider opacity-80">
          Date
        </p>
        <DateSelector
          dateMission={date}
          setDateMission={setDate}
          isIOS={isIOS}
        />

        {/* Boutons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black backdrop-blur-md"
          >
            ANNULER
          </button>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black text-white backdrop-blur-md transition-all ${
              canSubmit
                ? "bg-cyan-600 active:scale-95"
                : "bg-gray-600/40 opacity-60 cursor-not-allowed"
            }`}
          >
            {loading ? "..." : "VALIDER"}
          </button>
        </div>
      </div>
    </div>
  );
};

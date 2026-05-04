import React, { useState, useCallback, useEffect, useMemo } from "react";
import { DateSelector } from "../common/DateSelector";
import {
  PAUSE_OPTIONS,
  TARIF_OPTIONS,
  TIME_OPTIONS,
} from "../../constants/options";
import { calculerDuree } from "../../utils/calculators";
import { useLabels } from "../../contexts/LabelsContext";
import { useWeather } from "../../hooks/useWeather";
import { GlassCard } from "../ui/GlassCard";
import { NeonButton } from "../ui/NeonButton";
import { NeonSelect } from "../ui/NeonSelect";

const JOURNEE_TYPE = { debut: "08:00", fin: "17:00", pause: 30 };
const MAX_TIME_MINUTES = 23 * 60 + 45;
const MAX_PAUSE_MINUTES = 180;

const adjustTime = (time: string, deltaMinutes: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = Math.max(0, Math.min(MAX_TIME_MINUTES, h * 60 + m + deltaMinutes));
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

interface MissionFormProps {
  editMode?: boolean;
  initialData?: any;
  clientsUniques?: any[];
  lieuxUniques?: any[];
  onCopyLast?: () => void;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  darkMode?: boolean;
  isIOS?: boolean;
  loading?: boolean;
  patrons?: any[];
  selectedPatronId?: string | null;
  onPatronChange?: (id: string | null) => void;
  onAddNewPatron?: () => void;
  showRateEditorControl?: boolean;
  clients?: any[];
  selectedClientId?: string | null;
  onClientChange?: (id: string | null) => void;
  onAddNewClient?: () => void;
  lieux?: any[];
  selectedLieuId?: string | null;
  onLieuChange?: (id: string | null) => void;
  onAddNewLieu?: (prefill?: { nom: string; notes: string } | null) => void;
  missions?: any[];
}

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
}: MissionFormProps) => {
  const L = useLabels();
  const [pause, setPause] = useState<number>(initialData?.pause ?? 30);
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
  const { weather, weatherCity } = useWeather(dateMission);
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearError = useCallback((field: string) => {
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
    if (!selectedPatronId || !Array.isArray(patrons) || patrons.length === 0) return;
    const patron = patrons.find((p) => p.id === selectedPatronId);
    if (patron?.taux_horaire != null) {
      setTarifHoraire(patron.taux_horaire.toString());
    }
  }, [selectedPatronId, patrons]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;

    const errors: Record<string, string> = {};

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

    if (!selectedPatronId) errors.patron = `${L.patron} obligatoire.`;
    if (!selectedClientId) errors.client = `${L.client} obligatoire.`;
    if (!selectedLieuId) errors.lieu = `${L.lieu} obligatoire.`;

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

  const shortDate = useMemo(() =>
    safeDate.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "long" }),
    [safeDate]
  );

  // Live duration + amount summary
  const dureeCalculee = useMemo(() => {
    if (!debut || !fin) return null;
    const [hD, mD] = debut.split(":").map(Number);
    const [hF, mF] = fin.split(":").map(Number);
    const minutesDebut = hD * 60 + mD;
    const minutesFin = hF * 60 + mF;
    if (minutesFin <= minutesDebut) return null;
    if (pause >= minutesFin - minutesDebut) return null;
    const dureeH = calculerDuree(debut, fin, pause);
    if (dureeH <= 0) return null;
    const tarifNum = parseFloat(tarifHoraire);
    const tarifFin = Number.isFinite(tarifNum) ? tarifNum : null;
    const montant = tarifFin != null ? dureeH * tarifFin : null;
    const totalMinutes = Math.round(dureeH * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const dureeStr = m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
    return { dureeStr, montant, tarifFin };
  }, [debut, fin, pause, tarifHoraire]);

  // NeonSelect options
  const patronOptions = useMemo(() =>
    (Array.isArray(patrons) ? patrons : []).map((p) => ({ value: String(p.id), label: String(p.nom) })),
    [patrons]
  );
  const clientOptions = useMemo(() =>
    (Array.isArray(clients) ? clients : []).map((c) => ({ value: String(c.id), label: String(c.nom) })),
    [clients]
  );
  const lieuOptions = useMemo(() =>
    (Array.isArray(lieux) ? lieux : []).map((l) => ({ value: String(l.id), label: String(l.nom) })),
    [lieux]
  );
  const tarifSelectOptions = useMemo(() =>
    TARIF_OPTIONS.map((val) => ({ value: val.toString(), label: `${val.toFixed(2)} €/h` })),
    []
  );

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    padding: "2rem",
    borderRadius: editMode ? "var(--radius-lg)" : "var(--radius-xxl)",
    background: "var(--color-surface)",
    backdropFilter: "var(--blur-card)",
    WebkitBackdropFilter: "var(--blur-card)",
    border: "1px solid var(--color-border)",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    overflow: "hidden",
  };

  const sectionTitleStyle: React.CSSProperties = {
    textAlign: "center",
    color: "var(--color-text-dim)",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    fontWeight: 700,
    marginBottom: "0.75rem",
  };

  return (
    <section style={sectionStyle}>

      {/* ── DatePicker modal ──────────────────────────────────────────── */}
      {showDatePicker && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "2px solid var(--color-border-primary)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "24rem",
              boxShadow: "var(--glow-primary)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "var(--color-text)", textAlign: "center", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", marginBottom: "1rem" }}>
              Choisir la date
            </h3>
            <DateSelector
              dateMission={dateMission}
              setDateMission={(newDate) => { setDateMission(newDate); setShowDatePicker(false); }}
              isIOS={isIOS}
            />
            <div style={{ marginTop: "1rem" }}>
              <NeonButton fullWidth onClick={() => setShowDatePicker(false)}>Valider</NeonButton>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOC 1 — QUAND ? ─────────────────────────────────────────── */}
      {editMode ? (
        <GlassCard color="primary" padding="sm" className="mb-6">
          <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
            ✏️&nbsp; Modification&nbsp;·&nbsp;
            <span>{selectedClient?.nom || ""}</span>
            &nbsp;·&nbsp;
            <span style={{ color: "var(--color-primary)" }}>{shortDate}</span>
          </p>
        </GlassCard>
      ) : (
        <GlassCard color="primary" className="mb-5">
          <div className="flex items-center justify-between gap-4">
            {/* Weather chip */}
            <div>
              {weather ? (
                <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                  {weather.icon} {weather.temp}°{weatherCity ? ` · ${weatherCity}` : ""}
                </span>
              ) : (
                <span style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>⛅ …</span>
              )}
            </div>

            {/* Date button */}
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-primary)",
                border: "1px solid var(--color-border-primary)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1.25rem",
                cursor: "pointer",
                color: "var(--color-bg)",
                transition: "var(--transition-fast)",
                minWidth: "110px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8 }}>
                {getMonthName()}
              </span>
              <span style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1.1 }}>
                {getDay()}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700 }}>
                {getYear()}
              </span>
              <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginTop: "2px" }}>
                DATE MISSION · Appuyer pour changer
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <NeonButton
              variant="ghost"
              size="sm"
              onClick={() => { setDebut(JOURNEE_TYPE.debut); setFin(JOURNEE_TYPE.fin); setPause(JOURNEE_TYPE.pause); }}
            >
              ☀️ Journée type
            </NeonButton>
            {onCopyLast && (
              <NeonButton variant="ghost" size="sm" onClick={onCopyLast}>
                📋 Dupliquer
              </NeonButton>
            )}
          </div>
        </GlassCard>
      )}

      {/* ── BLOC 2 — POUR QUI ? ──────────────────────────────────────── */}
      <p style={sectionTitleStyle}>POUR QUI ?</p>

      <div className="flex flex-col gap-4 mb-6">
        <NeonSelect
          label="PATRON"
          color="primary"
          value={selectedPatronId || ""}
          onChange={(id) => { onPatronChange(id || null); clearError("patron"); }}
          options={patronOptions}
          onAddNew={onAddNewPatron}
          error={formErrors.patron}
          required
        />

        {showRateEditorControl && (
          <div>
            <NeonButton
              variant="ghost"
              size="sm"
              onClick={() => setShowRateEditor((v) => !v)}
            >
              💶 Taux horaire · {Number.isFinite(currentRate) ? `${currentRate.toFixed(2)} €/h` : "—"}
              {isCustomRate && (
                <span style={{
                  marginLeft: "8px",
                  fontSize: "10px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border-primary)",
                  color: "var(--color-primary)",
                  borderRadius: "var(--radius-pill)",
                  padding: "1px 6px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  Taux personnalisé
                </span>
              )}
            </NeonButton>
            {showRateEditor && (
              <div style={{ marginTop: "8px" }}>
                <NeonSelect
                  label="TARIF"
                  color="green"
                  value={tarifHoraire}
                  onChange={setTarifHoraire}
                  options={tarifSelectOptions}
                />
              </div>
            )}
          </div>
        )}

        <NeonSelect
          label="CLIENT"
          color="cyan"
          value={selectedClientId || ""}
          onChange={(id) => { onClientChange(id || null); clearError("client"); }}
          options={clientOptions}
          onAddNew={onAddNewClient}
          error={formErrors.client}
          required
        />

        <NeonSelect
          label="LIEU"
          color="violet"
          value={selectedLieuId || ""}
          onChange={(id) => { onLieuChange(id || null); clearError("lieu"); }}
          options={lieuOptions}
          onAddNew={() => {
            const prefill = selectedClient?.nom
              ? { nom: "", notes: `Lieu pour ${selectedClient.nom}` }
              : null;
            onAddNewLieu(prefill);
          }}
          error={formErrors.lieu}
          required
        />
      </div>

      {/* ── BLOC 3 — COMBIEN DE TEMPS ? ─────────────────────────────── */}
      <p style={sectionTitleStyle}>COMBIEN DE TEMPS ?</p>

      <GlassCard color="neutral" className="mb-3">
        <div className="grid grid-cols-3 gap-3">

          {/* Début */}
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "var(--color-text-dim)", letterSpacing: "0.1em" }}>Début</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--color-accent-cyan)" }}>{debut}</span>
              <select
                value={debut}
                onChange={(e) => { setDebut(e.target.value); clearError("fin"); clearError("horaires"); }}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              >
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="flex gap-1">
              <NeonButton variant="ghost" size="sm" onClick={() => { setDebut(adjustTime(debut, -15)); clearError("fin"); }}>−</NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => { setDebut(adjustTime(debut, 15)); clearError("fin"); }}>+</NeonButton>
            </div>
          </div>

          {/* Pause */}
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "var(--color-text-dim)", letterSpacing: "0.1em" }}>Pause</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--color-primary)" }}>{pause}m</span>
              <select
                value={pause}
                onChange={(e) => { setPause(parseInt(e.target.value, 10)); clearError("pause"); }}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              >
                {PAUSE_OPTIONS.map((val) => (<option key={val} value={val}>{val} min</option>))}
              </select>
            </div>
            <div className="flex gap-1">
              <NeonButton variant="ghost" size="sm" onClick={() => { setPause((p) => Math.max(0, p - 15)); clearError("pause"); }}>−</NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => { setPause((p) => Math.min(MAX_PAUSE_MINUTES, p + 15)); clearError("pause"); }}>+</NeonButton>
            </div>
          </div>

          {/* Fin */}
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "var(--color-text-dim)", letterSpacing: "0.1em" }}>Fin</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--color-accent-violet)" }}>{fin}</span>
              <select
                value={fin}
                onChange={(e) => { setFin(e.target.value); clearError("fin"); clearError("horaires"); }}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              >
                {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="flex gap-1">
              <NeonButton variant="ghost" size="sm" onClick={() => { setFin(adjustTime(fin, -15)); clearError("fin"); }}>−</NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => { setFin(adjustTime(fin, 15)); clearError("fin"); }}>+</NeonButton>
            </div>
          </div>

        </div>
      </GlassCard>

      {/* Duration summary */}
      {dureeCalculee && (
        <GlassCard color="green" padding="sm" className="mb-3" glow>
          <p style={{ textAlign: "center", color: "var(--color-text)", fontSize: "14px", fontWeight: 700 }}>
            ⏱&nbsp; {dureeCalculee.dureeStr}
            {dureeCalculee.montant != null && ` · ${dureeCalculee.montant.toFixed(2)} €`}
            {dureeCalculee.tarifFin != null && ` (${dureeCalculee.tarifFin.toFixed(2)} €/h)`}
          </p>
        </GlassCard>
      )}

      {/* Time errors */}
      {(formErrors.fin || formErrors.pause || formErrors.horaires) && (
        <p style={{ color: "var(--color-accent-red)", fontSize: "12px", textAlign: "center", fontWeight: 700, marginBottom: "0.75rem" }}>
          {formErrors.fin || formErrors.pause || formErrors.horaires}
        </p>
      )}

      {/* ── BOUTON VALIDER ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mt-4">
        <NeonButton
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting || loading}
          onClick={handleSubmit}
        >
          {editMode ? "Mettre à jour" : "Enregistrer la mission"}
        </NeonButton>

        {(editMode || onCancel) && (
          <NeonButton variant="ghost" onClick={onCancel}>
            Annuler
          </NeonButton>
        )}
      </div>

    </section>
  );
};
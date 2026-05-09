import React from "react";
import { tokens } from "../../utils/designTokens";
import { Card } from "../common/Card";
import { SectionLabel, AccentSpan } from "../common/SectionLabel";
import { formatEuro, formatHeures, formatDateFR } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";
import { WeatherIcon } from "../common/WeatherIcon";
import type { Mission, FraisDivers } from "../../types/entities";
import type { BilanContent, MissionWithWeather } from "../../hooks/useBilan";
import type { KmSettings } from "../../hooks/useKmDomicile";

// ─── Ligne label / valeur ──────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

function Row({ label, value, valueColor }: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span
        style={{
          fontWeight: 700,
          color: valueColor || "var(--color-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Bouton d'export ───────────────────────────────────────────────────────────

interface ExportBtnProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
}

function ExportBtn({ label, onClick, disabled, color }: ExportBtnProps) {
  const base: React.CSSProperties = {
    ...tokens.button.base,
    flex: 1,
    minWidth: "100px",
    padding: "12px 8px",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    textAlign: "center",
    transition: tokens.transitions.default,
  };

  const enabledStyle = {
    ...base,
    background: `${color}20`,
    color,
    border: `1px solid ${color}40`,
  };

  const disabledStyle = {
    ...base,
    ...tokens.button.ghost,
    opacity: 0.3,
    cursor: "not-allowed",
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={disabled ? disabledStyle : enabledStyle}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

interface BilanPanelProps {
  bilanContent: BilanContent;
  bilanPeriodType?: "semaine" | "mois" | "annee";
  bilanPaye?: boolean;
  sortedMissions?: MissionWithWeather[];
  onMarquerCommePaye?: () => void;
  isViewer?: boolean;
  canExportExcel?: boolean;
  canExportPDF?: boolean;
  canExportCSV?: boolean;
  canFacture?: boolean;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onExportCSVWithFrais?: () => void;
  onExportFacture?: () => void;
  onFraisEdit?: (frais: FraisDivers) => void;
  onFraisDelete?: (frais: FraisDivers) => void;
  kmSettings?: KmSettings | null;
  onRecalculerFraisKm?: () => void;
  isRecalculatingKm?: boolean;
  domicileLatLng?: { lat: number; lng: number } | null;
}

export function BilanPanel({
  bilanContent,
  bilanPeriodType,
  bilanPaye,
  sortedMissions = [],
  onMarquerCommePaye,
  isViewer = false,
  canExportExcel = true,
  canExportPDF = true,
  canExportCSV = true,
  canFacture = false,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  onExportCSVWithFrais,
  onExportFacture,
  onFraisEdit,
  onFraisDelete,
  kmSettings,
  onRecalculerFraisKm,
  isRecalculatingKm = false,
  domicileLatLng = null,
}: BilanPanelProps) {
  const L = useLabels();

  if (!bilanContent || !bilanContent.titre) return null;

  const hasFrais = (bilanContent.fraisDivers?.length ?? 0) > 0;
  const hasKmFrais =
    kmSettings?.km_enable === true &&
    (bilanContent.fraisKilometriques?.items?.length ?? 0) > 0;
  const hasAcomptes =
    bilanContent.acomptesDansPeriode > 0 ||
    bilanContent.totalAcomptes > 0 ||
    bilanContent.soldeAcomptesAvant > 0 ||
    bilanContent.soldeAcomptesApres > 0;

  const resteAPercevoir = (() => {
    const v1 = Number(bilanContent?.resteAPercevoir);
    const v2 = Number(bilanContent?.resteCettePeriode);
    return Number.isFinite(v1) && v1 > 0 ? v1 : Number.isFinite(v2) ? v2 : 0;
  })();

  const gap = tokens.grid.gap;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>

      {/* ── En-tête : titre + KPIs ──────────────────────────────────────── */}
      <Card elevated>
        <SectionLabel>
          {bilanContent.titre}
          {bilanContent.selectedPatronNom &&
            bilanContent.selectedPatronNom !== "Tous les patrons (Global)" && (
              <>
                {" — "}
                <AccentSpan>{bilanContent.selectedPatronNom}</AccentSpan>
              </>
            )}
        </SectionLabel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap,
            marginBottom: tokens.spacing.md,
          }}
        >
          {/* Heures */}
          <div
            style={{
              ...tokens.card.base,
              ...tokens.card.compact,
              textAlign: "center",
            }}
          >
            <div style={tokens.text.label}>Heures</div>
            <div
              style={{
                fontFamily: tokens.font.mono,
                fontSize: "20px",
                fontWeight: 600,
                color: tokens.colors.gold.primary,
                marginTop: "4px",
              }}
            >
              {formatHeures(bilanContent.totalH)}
            </div>
          </div>

          {/* Total Brut */}
          <div
            style={{
              ...tokens.card.base,
              ...tokens.card.compact,
              textAlign: "center",
            }}
          >
            <div style={tokens.text.label}>Total Brut</div>
            <div
              style={{
                fontFamily: tokens.font.mono,
                fontSize: "20px",
                fontWeight: 600,
                color: tokens.colors.emerald.primary,
                marginTop: "4px",
              }}
            >
              {formatEuro(bilanContent.totalE)}
            </div>
          </div>

          {/* Impayé précédent (si présent) */}
          {bilanContent.impayePrecedent > 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                ...tokens.card.base,
                ...tokens.card.compact,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderColor: `${tokens.colors.amber.primary}40`,
              }}
            >
              <div
                style={{
                  ...tokens.text.label,
                  marginBottom: 0,
                  color: tokens.colors.amber.primary,
                }}
              >
                ⏳ Impayé précédent
              </div>
              <div
                style={{
                  fontFamily: tokens.font.mono,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: tokens.colors.amber.primary,
                }}
              >
                +{formatEuro(bilanContent.impayePrecedent)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Frais divers ──────────────────────────────────────────────────── */}
      {bilanPeriodType === "semaine" && hasFrais && (
        <Card>
          <SectionLabel>Frais</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[...bilanContent.fraisDivers]
              .sort((a, b) => new Date(a.date_frais ?? "").getTime() - new Date(b.date_frais ?? "").getTime())
              .map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      ...tokens.text.caption,
                      flex: 1,
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {f.description} — {formatDateFR(f.date_frais ?? "")}
                  </span>
                  <span
                    style={{
                      fontFamily: tokens.font.mono,
                      fontWeight: 700,
                      color: tokens.colors.amber.primary,
                    }}
                  >
                    +{formatEuro(f.montant)}
                  </span>
                  {!isViewer && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => onFraisEdit?.(f)}
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(59,130,246,0.15)",
                          color: "#60A5FA",
                          border: "1px solid rgba(59,130,246,0.3)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-label="Modifier le frais"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => onFraisDelete?.(f)}
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(239,68,68,0.15)",
                          color: "#F87171",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-label="Supprimer le frais"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ── Frais kilométriques ────────────────────────────────────────────── */}
      {kmSettings?.km_enable === true && bilanPeriodType === "semaine" &&
        (hasKmFrais ? (
          <Card>
            <SectionLabel>🚗 Frais kilométriques</SectionLabel>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {bilanContent.fraisKilometriques.items
                .filter((item: any) => item.amount !== null)
                .map((item: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {formatDateFR(item.date)}
                      </span>
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "var(--color-text-dim)",
                        }}
                      >
                        {item.labelLieuOuClient}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ ...tokens.text.caption, marginRight: "8px" }}>
                        {Math.round(item.kmTotal)} km
                      </span>
                      <span
                        style={{
                          fontFamily: tokens.font.mono,
                          fontWeight: 700,
                          color: tokens.colors.cyan.primary,
                        }}
                      >
                        {formatEuro(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              {bilanContent.fraisKilometriques.items
                .filter((item: any) => item.amount === null)
                .map((item: any, i: number) => (
                  <div
                    key={`missing-${i}`}
                    style={{ ...tokens.text.caption, fontStyle: "italic" }}
                  >
                    {formatDateFR(item.date)} — {item.labelLieuOuClient}
                  </div>
                ))}
            </div>
            <div
              style={{
                paddingTop: "12px",
                borderTop: `1px solid ${tokens.colors.border.default}`,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={tokens.text.caption}>
                {Math.round(bilanContent.fraisKilometriques.totalKm)} km total
              </span>
              <span
                style={{
                  fontFamily: tokens.font.mono,
                  fontWeight: 700,
                  color: tokens.colors.cyan.primary,
                }}
              >
                {formatEuro(bilanContent.fraisKilometriques.totalAmount)}
              </span>
            </div>
          </Card>
        ) : (
          <Card compact>
            <div style={{ ...tokens.text.caption, fontStyle: "italic" }}>
              🚗 Frais kilométriques —{" "}
              {!domicileLatLng
                ? "adresse domicile manquante ou non géocodée (vérifiez Paramètres → Km)"
                : "coordonnées GPS manquantes pour les lieux de mission"}
            </div>
          </Card>
        ))}

      {/* ── Suivi acomptes & impayés ───────────────────────────────────────── */}
      {bilanPeriodType === "semaine" && hasAcomptes && (
        <Card>
          <SectionLabel>Suivi du solde acompte & impayés</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Row
              label="💳 Acompte disponible précédent"
              value={formatEuro(bilanContent.soldeAcomptesAvant)}
              valueColor={tokens.colors.cyan.primary}
            />
            {bilanContent.acomptesDansPeriode > 0 && (
              <Row
                label="📥 Reçus cette période"
                value={`+${formatEuro(bilanContent.acomptesDansPeriode)}`}
                valueColor={tokens.colors.cyan.primary}
              />
            )}
            {bilanContent.totalAcomptes > 0 && (
              <Row
                label="✂️ Consommé cette période"
                value={`-${formatEuro(bilanContent.totalAcomptes)}`}
                valueColor="#F87171"
              />
            )}
            <div
              style={{
                paddingTop: "12px",
                borderTop: `1px solid ${tokens.colors.border.default}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ ...tokens.text.label, marginBottom: 0 }}>
                Solde restant à reporter
              </span>
              <span
                style={{
                  fontFamily: tokens.font.mono,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: tokens.colors.emerald.primary,
                }}
              >
                {formatEuro(bilanContent.soldeAcomptesApres)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Statut paiement ────────────────────────────────────────────────── */}
      {bilanPeriodType === "semaine" &&
        (bilanPaye ? (
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: `${tokens.colors.emerald.primary}20`,
                  border: `1px solid ${tokens.colors.emerald.primary}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                ✓
              </div>
              <div>
                <div style={tokens.text.label}>Statut du paiement</div>
                <div
                  style={{
                    fontFamily: tokens.font.base,
                    fontSize: "22px",
                    fontWeight: 900,
                    color: tokens.colors.emerald.primary,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Payé
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ borderColor: "rgba(239,68,68,0.4)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <span style={tokens.text.label}>Reste à percevoir (Net)</span>
              <span
                style={{
                  fontFamily: tokens.font.mono,
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#FB923C",
                }}
              >
                {formatEuro(resteAPercevoir)}
              </span>
            </div>
            {!isViewer && (
              <button
                onClick={onMarquerCommePaye}
                style={{
                  ...tokens.button.base,
                  width: "100%",
                  background: "rgba(139,32,32,0.8)",
                  color: "#ffffff",
                  border: "1px solid rgba(239,68,68,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "12px",
                }}
              >
                💰 Marquer comme payé
              </button>
            )}
          </Card>
        ))}

      {/* ── Boutons d'export ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <ExportBtn
          label={canExportExcel ? "Excel" : "🔒 Excel"}
          onClick={onExportExcel}
          disabled={!canExportExcel}
          color={tokens.colors.emerald.primary}
        />
        <ExportBtn
          label={canExportPDF ? "PDF" : "🔒 PDF"}
          onClick={onExportPDF}
          disabled={!canExportPDF}
          color="#F87171"
        />
        {canFacture && (
          <ExportBtn
            label="🧾 Facture"
            onClick={onExportFacture}
            disabled={false}
            color={tokens.colors.amber.primary}
          />
        )}
        <ExportBtn
          label={canExportCSV ? `CSV ${L.missions}` : `🔒 CSV ${L.missions}`}
          onClick={onExportCSV}
          disabled={!canExportCSV}
          color={tokens.colors.indigo.primary}
        />
        {bilanPeriodType === "semaine" && hasFrais && (
          <ExportBtn
            label={canExportCSV ? "CSV + Frais" : "🔒 CSV + Frais"}
            onClick={onExportCSVWithFrais}
            disabled={!canExportCSV}
            color={tokens.colors.cyan.primary}
          />
        )}
      </div>

      {/* ── Recalcul KM ────────────────────────────────────────────────────── */}
      {kmSettings?.km_enable === true && !isViewer && onRecalculerFraisKm && (
        <button
          onClick={onRecalculerFraisKm}
          disabled={isRecalculatingKm}
          style={{
            ...tokens.button.base,
            width: "100%",
            ...(isRecalculatingKm
              ? {
                  ...tokens.button.ghost,
                  opacity: 0.4,
                  cursor: "not-allowed",
                }
              : {
                  background: `${tokens.colors.cyan.primary}20`,
                  color: tokens.colors.cyan.primary,
                  border: `1px solid ${tokens.colors.cyan.primary}40`,
                }),
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            padding: "12px",
          }}
        >
          {isRecalculatingKm ? "⏳ Recalcul en cours…" : "🚗 Recalculer KM"}
        </button>
      )}

      {/* ── Détail des missions (semaine) ──────────────────────────────────── */}
      {bilanPeriodType === "semaine" && sortedMissions.length > 0 && (
        <div>
          <SectionLabel>Détail des missions</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap }}>
            {sortedMissions.map((m, i) => {
              const date = new Date(m.date_iso ?? "");
              const day = date.getDate().toString().padStart(2, "0");
              const monthShort = date
                .toLocaleString("fr-FR", { month: "short" })
                .toUpperCase();

              return (
                <Card key={i} compact>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    {/* Date + infos mission */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {/* Badge date */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: "44px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            color: tokens.colors.gold.primary,
                            letterSpacing: "0.1em",
                          }}
                        >
                          {monthShort}
                        </div>
                        <div
                          style={{
                            ...tokens.card.base,
                            padding: "4px",
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderColor: `${tokens.colors.gold.primary}40`,
                          }}
                        >
                          <span style={{ fontWeight: 900, fontSize: "18px" }}>
                            {day}
                          </span>
                        </div>
                      </div>

                      {/* Infos */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            textTransform: "uppercase",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.client}
                        </div>
                        <div style={tokens.text.caption}>
                          {m.debut} → {m.fin}
                          {m.pause > 0 && ` (${m.pause} min)`}
                        </div>
                        {m.lieu && (
                          <div style={{ ...tokens.text.caption, marginTop: "2px" }}>
                            {m.lieu}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Montant + météo */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "24px",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: `${tokens.colors.gold.primary}cc`,
                          }}
                        >
                          {formatHeures(m.duree || 0)}
                        </div>
                        <div
                          style={{
                            fontFamily: tokens.font.mono,
                            fontSize: "16px",
                            fontWeight: 700,
                            color: tokens.colors.emerald.primary,
                          }}
                        >
                          {formatEuro(m.montant)}
                        </div>
                      </div>

                      {m.weather ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            minWidth: "80px",
                          }}
                        >
                          <WeatherIcon
                            code={m.weather.icon}
                            className="w-7 h-7 flex-shrink-0"
                          />
                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "11px",
                              lineHeight: 1.3,
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>
                              {m.weather.tempMin}–{m.weather.tempMax}°
                            </div>
                            <div
                              style={{
                                ...tokens.text.caption,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "56px",
                              }}
                            >
                              {m.weather.desc}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ ...tokens.text.caption, fontStyle: "italic" }}
                        >
                          ?
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Regroupement mois / année ──────────────────────────────────────── */}
      {bilanPeriodType !== "semaine" &&
        (bilanContent.groupedData?.length ?? 0) > 0 && (
          <div>
            <SectionLabel>Regroupement</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap,
              }}
            >
              {bilanContent.groupedData.map((group: any, index: number) => (
                <Card key={index} compact>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: "15px",
                      marginBottom: "10px",
                    }}
                  >
                    {group.label}
                  </div>
                  <Row
                    label="Heures"
                    value={formatHeures(group.h)}
                    valueColor={`${tokens.colors.gold.primary}cc`}
                  />
                  <div style={{ marginTop: "6px" }}>
                    <Row
                      label="Montant"
                      value={formatEuro(group.e)}
                      valueColor={tokens.colors.emerald.primary}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

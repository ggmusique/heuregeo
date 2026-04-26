import React, { useMemo, useCallback } from "react";
import { getDateParts } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { tokens, mergeStyles } from "../../utils/designTokens";
import { Card } from "../common/Card";

// ─── Styles ──────────────────────────────────────────────────────────────────

const cardStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: tokens.spacing.lg,
  marginBottom: tokens.spacing.md,
  overflow: "hidden",
  fontFamily: tokens.font.base,
};

const dateBadgeStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "60px",
  height: "60px",
  background: tokens.colors.bg.surfaceElevated,
  border: `1px solid ${tokens.colors.border.accent}`,
  borderRadius: "14px",
  backdropFilter: tokens.effects.blur,
  flexShrink: 0,
};

const dateMonthStyle = {
  ...tokens.text.badge,
  color: tokens.colors.gold.primary,
  lineHeight: 1,
  marginBottom: "4px",
};

const dateDayStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: tokens.colors.text.primary,
  fontFamily: tokens.font.mono,
  lineHeight: 1,
};

const infoContainerStyle = { flex: 1, overflow: "hidden" };

const clientLabelStyle = {
  fontWeight: 700,
  textTransform: "uppercase",
  fontSize: "14px",
  color: tokens.colors.text.primary,
  margin: "0 0 4px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontFamily: tokens.font.base,
};

const hoursRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const hoursTextStyle = {
  ...tokens.text.caption,
  textTransform: "uppercase",
  fontWeight: 600,
  letterSpacing: "0.05em",
  margin: 0,
  fontFamily: tokens.font.mono,
};

const pauseBadgeStyle = {
  ...tokens.text.badge,
  padding: "3px 8px",
  borderRadius: "20px",
  background: tokens.colors.amber.glow,
  border: `1px solid ${tokens.colors.amber.primary}4D`,
  color: tokens.colors.amber.primary,
};

const patronRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: tokens.spacing.sm,
};

const patronNameStyle = {
  ...tokens.text.badge,
  color: tokens.colors.text.muted,
};

const actionsContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: tokens.spacing.lg,
};

const amountStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: tokens.colors.emerald.primary,
  fontFamily: tokens.font.mono,
  whiteSpace: "nowrap",
};

const buttonGroupStyle = { display: "flex", flexDirection: "column", gap: "10px" };

const btnBase = mergeStyles(tokens.button.base, {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  padding: 0,
  outline: "none",
  transition: tokens.transitions.default,
});

const btnEditStyle = mergeStyles(btnBase, {
  background: tokens.colors.border.default,
  border: `1px solid ${tokens.colors.border.hover}`,
});

const btnDeleteStyle = mergeStyles(btnBase, {
  background: tokens.colors.rose.glow,
  border: `1px solid ${tokens.colors.rose.primary}4D`,
});

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ✅ Carte mission avec actions - Multi-Patrons
 * + ✅ Badge "⏱ pause" si pause > 0
 * + ✅ Texte heures affiche la pause
 */
export const MissionCard = React.memo(
  ({ mission, onEdit, onDelete, patronNom = null, patronColor = null }) => {
    if (!mission) return null;

    const dateIso = mission?.date_iso || "";
    const { day, month } = useMemo(() => getDateParts(dateIso), [dateIso]);

    const clientLabel = (mission?.client || "Client").toString();
    const debut = mission?.debut || "--:--";
    const fin = mission?.fin || "--:--";
    const duree = Number(mission?.duree) || 0;
    const montant = Number(mission?.montant) || 0;

    // ✅ Pause (minutes)
    const pauseMin = Number(mission?.pause) || 0;
    const hasPause = pauseMin > 0;

    const handleEdit = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit?.(mission);
      },
      [onEdit, mission]
    );

    const handleDelete = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(mission?.id);
      },
      [onDelete, mission]
    );

    const monthShort = (month || "JAN").substring(0, 3);
    const safePatronColor = patronColor || tokens.colors.gold.primary;

    const patronDotStyle = useMemo(
      () => ({
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: safePatronColor,
        flexShrink: 0,
      }),
      [safePatronColor]
    );

    return (
      <Card style={cardStyle}>
        {/* Date */}
        <div style={dateBadgeStyle}>
          <span style={dateMonthStyle}>{monthShort}</span>
          <span style={dateDayStyle}>{day}</span>
        </div>

        {/* Infos */}
        <div style={infoContainerStyle}>
          <p style={clientLabelStyle}>{clientLabel}</p>

          {/* ✅ Ligne heures + badge pause */}
          <div style={hoursRowStyle}>
            <p style={hoursTextStyle}>
              {formatHeures(duree)}
              {hasPause ? ` (pause ${pauseMin} min)` : ""} • {debut}-{fin}
            </p>
            {hasPause && <span style={pauseBadgeStyle}>⏱ pause</span>}
          </div>

          {/* Patron */}
          {patronNom && (
            <div style={patronRowStyle} title={`Patron: ${patronNom}`}>
              <div style={patronDotStyle} />
              <span style={patronNameStyle}>{patronNom}</span>
            </div>
          )}
        </div>

        {/* Montant + actions */}
        <div style={actionsContainerStyle}>
          <span style={amountStyle}>{formatEuro(montant)}</span>

          {(onEdit || onDelete) && (
            <div style={buttonGroupStyle}>
              <button
                type="button"
                onPointerDown={handleEdit}
                onClick={handleEdit}
                style={btnEditStyle}
                aria-label="Modifier mission"
                title="Modifier"
              >
                ✏️
              </button>

              <button
                type="button"
                onPointerDown={handleDelete}
                onClick={handleDelete}
                style={btnDeleteStyle}
                aria-label="Supprimer mission"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </Card>
    );
  }
);

MissionCard.displayName = "MissionCard";

import React, { useMemo, useCallback } from "react";
import { getDateParts } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { tokens } from "../../utils/designTokens";
import { Card } from "../common/Card";

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

    return (
      <Card
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: tokens.spacing.lg,
          marginBottom: tokens.spacing.md,
          overflow: "hidden",
          fontFamily: tokens.font.base,
        }}
      >
        {/* Date */}
        <div
          style={{
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
          }}
        >
          <span
            style={{
              ...tokens.text.badge,
              color: tokens.colors.gold.primary,
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            {monthShort}
          </span>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: tokens.colors.text.primary,
              fontFamily: tokens.font.mono,
              lineHeight: 1,
            }}
          >
            {day}
          </span>
        </div>

        {/* Infos */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p
            style={{
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "14px",
              color: tokens.colors.text.primary,
              margin: "0 0 4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: tokens.font.base,
            }}
          >
            {clientLabel}
          </p>

          {/* ✅ Ligne heures + badge pause */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                ...tokens.text.caption,
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
                margin: 0,
                fontFamily: tokens.font.mono,
              }}
            >
              {formatHeures(duree)}
              {hasPause ? ` (pause ${pauseMin} min)` : ""} • {debut}-{fin}
            </p>

            {hasPause && (
              <span
                style={{
                  ...tokens.text.badge,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  background: tokens.colors.amber.glow,
                  border: `1px solid ${tokens.colors.amber.primary}4D`,
                  color: tokens.colors.amber.primary,
                }}
              >
                ⏱ pause
              </span>
            )}
          </div>

          {/* Patron */}
          {patronNom && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: tokens.spacing.sm,
              }}
              title={`Patron: ${patronNom}`}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: safePatronColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  ...tokens.text.badge,
                  color: tokens.colors.text.muted,
                }}
              >
                {patronNom}
              </span>
            </div>
          )}
        </div>

        {/* Montant + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.lg }}>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: tokens.colors.emerald.primary,
              fontFamily: tokens.font.mono,
              whiteSpace: "nowrap",
            }}
          >
            {formatEuro(montant)}
          </span>

          {(onEdit || onDelete) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onPointerDown={handleEdit}
                onClick={handleEdit}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: tokens.colors.border.default,
                  border: `1px solid ${tokens.colors.border.hover}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  cursor: "pointer",
                  transition: tokens.transitions.default,
                  outline: "none",
                }}
                aria-label="Modifier mission"
                title="Modifier"
              >
                ✏️
              </button>

              <button
                type="button"
                onPointerDown={handleDelete}
                onClick={handleDelete}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: `${tokens.colors.rose.glow}`,
                  border: `1px solid ${tokens.colors.rose.primary}4D`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  cursor: "pointer",
                  transition: tokens.transitions.default,
                  outline: "none",
                }}
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

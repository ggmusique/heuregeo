import React, { memo } from "react";
import { tokens } from "../../utils/designTokens";

interface Props {
  icon?: any;
  label: string;
  value: any;
  delta?: number | null;
  accentColor?: string;
  delay?: number;
  ariaLabel?: string;
}

export const KPICard = memo(function KPICard({ icon, label, value, delta, accentColor, delay = 0, ariaLabel }: Props) {
  const colorMap = tokens.colors as unknown as Record<string, typeof tokens.colors.gold>;
  const color = (accentColor ? colorMap[accentColor] : null) ?? tokens.colors.gold;

  return (
    <article
      className="kpi-card group"
      style={{
        animation: `fadeInUp 0.5s ${delay}ms both`,
        background: tokens.colors.bg.surface,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 12px 40px ${color.glow}`;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
      role="region"
      aria-label={ariaLabel || label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.currentTarget.style.transform = "translateY(-2px)";
          setTimeout(() => {
            e.currentTarget.style.transform = "translateY(0)";
          }, 150);
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, ${color.primary}, transparent)`,
          borderRadius: "20px 20px 0 0",
        }}
        aria-hidden="true"
      />

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: `${color.glow}20`,
            display: "grid",
            placeItems: "center",
            fontSize: "16px",
            border: `1px solid ${color.glow}`,
            transition: "transform 0.2s ease",
          }}
          className="group-hover:scale-110"
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: tokens.colors.text.muted,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "24px",
          fontWeight: 600,
          color: color.primary,
          marginBottom: "8px",
          lineHeight: 1,
          transition: "transform 0.2s ease",
        }}
        className="group-hover:scale-[1.02]"
      >
        {value}
      </div>

      {delta !== undefined && delta !== null && (
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: delta >= 0 ? tokens.colors.emerald.primary : "#EF4444",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "opacity 0.2s ease",
          }}
          className="group-hover:opacity-100 opacity-90"
        >
          {delta >= 0 ? "▴" : "▾"} {Math.abs(delta)}%
          <span style={{ color: tokens.colors.text.muted, fontWeight: 400 }}>vs sem. préc.</span>
        </div>
      )}
    </article>
  );
});

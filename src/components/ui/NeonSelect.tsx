import React, { useState } from "react";

interface NeonSelectOption {
  value: string;
  label: string;
}

interface NeonSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: NeonSelectOption[];
  color?: "primary" | "cyan" | "violet" | "green";
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onAddNew?: () => void;
  addNewLabel?: string;
}

const borderColorVar: Record<string, string> = {
  primary: "var(--color-border-primary)",
  cyan:    "var(--color-border-cyan)",
  violet:  "var(--color-border-violet)",
  green:   "var(--color-border-green)",
};

const glowVar: Record<string, string> = {
  primary: "var(--glow-primary)",
  cyan:    "var(--glow-cyan)",
  violet:  "var(--glow-violet)",
  green:   "var(--glow-green)",
};

export function NeonSelect({
  label,
  value,
  onChange,
  options,
  color = "cyan",
  error,
  disabled = false,
  required = false,
  onAddNew,
  addNewLabel = "+",
}: NeonSelectProps) {
  const [focused, setFocused] = useState(false);

  const isFloating = focused || value !== "";

  const selectStyle: React.CSSProperties = {
    background: "var(--color-bg-input)",
    border: `1px solid ${focused ? borderColorVar[color] : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    color: value ? "var(--color-text)" : "var(--color-text-dim)",
    transition: "var(--transition-normal)",
    boxShadow: focused ? glowVar[color] : "none",
    outline: "none",
    width: "100%",
    padding: "22px 16px 8px",
    fontSize: "14px",
    appearance: "none" as React.CSSProperties["appearance"],
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    left: "16px",
    top: isFloating ? "6px" : "50%",
    transform: isFloating ? "translateY(0)" : "translateY(-50%)",
    fontSize: isFloating ? "11px" : "14px",
    color: focused
      ? borderColorVar[color]
      : isFloating
      ? "var(--color-text-muted)"
      : "var(--color-text-dim)",
    transition: "var(--transition-fast)",
    pointerEvents: "none",
    fontWeight: isFloating ? 600 : 400,
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: error ? "4px" : "0" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <label style={labelStyle}>{label}{required && " *"}</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            required={required}
            style={selectStyle}
          >
            <option value="" disabled hidden />
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            style={{
              background: "var(--color-bg-input)",
              border: `1px solid ${borderColorVar[color]}`,
              borderRadius: "var(--radius-sm)",
              color: borderColorVar[color],
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "18px",
              flexShrink: 0,
              transition: "var(--transition-fast)",
            }}
          >
            {addNewLabel}
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: "var(--color-accent-red)", fontSize: "12px", marginTop: "4px", paddingLeft: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

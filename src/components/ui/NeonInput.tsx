import React, { useState } from "react";

interface NeonInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color?: "primary" | "cyan" | "violet" | "green";
  type?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
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

export function NeonInput({
  label,
  value,
  onChange,
  color = "cyan",
  type = "text",
  placeholder = "",
  error,
  disabled = false,
  required = false,
}: NeonInputProps) {
  const [focused, setFocused] = useState(false);

  const isFloating = focused || value !== "";

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-input)",
    border: `1px solid ${focused ? borderColorVar[color] : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    color: "var(--color-text)",
    transition: "var(--transition-normal)",
    boxShadow: focused ? glowVar[color] : "none",
    outline: "none",
    width: "100%",
    padding: "22px 16px 8px",
    fontSize: "14px",
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
      <div style={{ position: "relative" }}>
        <label style={labelStyle}>{label}{required && " *"}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? placeholder : ""}
          disabled={disabled}
          required={required}
          style={inputStyle}
        />
      </div>
      {error && (
        <p style={{ color: "var(--color-accent-red)", fontSize: "12px", marginTop: "4px", paddingLeft: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

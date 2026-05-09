import React from "react";

interface NeonButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "cyan" | "violet" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
  glow?: boolean;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, transparent))",
    border: "1px solid var(--color-border-primary)",
    color: "var(--color-bg)",
    fontWeight: 700,
  },
  cyan: {
    background: "color-mix(in srgb, var(--color-accent-cyan) 10%, transparent)",
    border: "1px solid var(--color-border-cyan)",
    color: "var(--color-accent-cyan)",
  },
  violet: {
    background: "color-mix(in srgb, var(--color-accent-violet) 10%, transparent)",
    border: "1px solid var(--color-border-violet)",
    color: "var(--color-accent-violet)",
  },
  ghost: {
    background: "var(--color-surface-offset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text)",
  },
  danger: {
    background: "color-mix(in srgb, var(--color-accent-red) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--color-accent-red) 40%, transparent)",
    color: "var(--color-accent-red)",
  },
};

const variantHoverGlow: Record<string, string> = {
  primary: "var(--glow-primary)",
  cyan:    "var(--glow-cyan)",
  violet:  "var(--glow-violet)",
  ghost:   "none",
  danger:  "none",
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: "8px 16px",  fontSize: "12px", borderRadius: "var(--radius-sm)" },
  md: { padding: "12px 24px", fontSize: "14px", borderRadius: "var(--radius-md)" },
  lg: { padding: "16px 32px", fontSize: "16px", borderRadius: "var(--radius-lg)" },
};

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "14px",
        height: "14px",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "neon-spin 0.7s linear infinite",
        marginRight: "8px",
        verticalAlign: "middle",
      }}
    />
  );
}

export function NeonButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = "button",
  glow = false,
}: NeonButtonProps) {
  const isDisabled = disabled || loading;

  const [hovered, setHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
    transition: "var(--transition-fast)",
    width: fullWidth ? "100%" : undefined,
    boxShadow: (glow || hovered) && !isDisabled ? variantHoverGlow[variant] : "none",
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  return (
    <>
      <style>{`@keyframes neon-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={baseStyle}
      >
        {loading && <Spinner />}
        {children}
      </button>
    </>
  );
}

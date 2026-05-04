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
    background: "linear-gradient(135deg, var(--color-primary), rgba(201,168,76,0.7))",
    border: "1px solid var(--color-border-primary)",
    color: "var(--color-bg)",
    fontWeight: 700,
  },
  cyan: {
    background: "rgba(34,211,238,0.10)",
    border: "1px solid var(--color-border-cyan)",
    color: "var(--color-accent-cyan)",
  },
  violet: {
    background: "rgba(167,139,250,0.10)",
    border: "1px solid var(--color-border-violet)",
    color: "var(--color-accent-violet)",
  },
  ghost: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "var(--color-text)",
  },
  danger: {
    background: "rgba(248,113,113,0.10)",
    border: "1px solid rgba(248,113,113,0.4)",
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

import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-surface-offset)] text-[var(--color-text)] border border-[var(--color-border-primary)] " +
    "hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] " +
    "focus:ring-2 focus:ring-[var(--color-primary)]/30 " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  secondary:
    "bg-[var(--color-surface-offset)] text-[var(--color-text)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-primary)] " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]/30 " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  ghost:
    "bg-transparent text-[var(--color-text)] " +
    "hover:bg-[var(--color-surface-offset)] " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]/30",
  danger:
    "bg-[var(--color-surface-offset)] text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30 " +
    "hover:bg-[var(--color-accent-red)]/10 hover:border-[var(--color-accent-red)] hover:text-[var(--color-accent-red)] " +
    "focus:ring-2 focus:ring-[var(--color-accent-red)]/30 " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  success:
    "bg-[var(--color-surface-offset)] text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/30 " +
    "hover:bg-[var(--color-accent-green)]/10 hover:border-[var(--color-accent-green)] hover:text-[var(--color-accent-green)] " +
    "focus:ring-2 focus:ring-[var(--color-accent-green)]/30 " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  outline:
    "bg-transparent border-2 border-[var(--color-border-primary)] text-[var(--color-text)] " +
    "hover:bg-[var(--color-border-primary)]/5 " +
    "focus:ring-2 focus:ring-[var(--color-border-primary)]/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[11px] rounded-xl",
  md: "px-6 py-3 text-[12px] rounded-2xl",
  lg: "px-8 py-4 text-[13px] rounded-2xl",
  xl: "px-10 py-5 text-[14px] rounded-3xl",
};

const baseClasses =
  "inline-flex items-center justify-center font-medium uppercase tracking-wider " +
  "transition-[opacity,transform,background-color,border-color,color] duration-150 " +
  "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, fullWidth = false, children, className = "", disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
import React from "react";
import { tokens, mergeStyles } from "../../utils/designTokens";

interface CardProps {
  children?: React.ReactNode;
  elevated?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  role?: React.AriaRole;
  "aria-label"?: string;
}

export function Card({
  children,
  elevated = false,
  compact = false,
  style = {},
  className = "",
  onClick,
  role,
  "aria-label": ariaLabel,
}: CardProps) {
  const baseStyle = tokens.card.base;
  const elevatedStyle = elevated ? tokens.card.elevated : {};
  const compactStyle = compact ? tokens.card.compact : {};

  const mergedStyle = mergeStyles(baseStyle, elevatedStyle, compactStyle, style);

  return (
    <div
      className={className}
      style={mergedStyle}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

import React from "react";
import { tokens } from "../../utils/designTokens";

export function Card({ children, elevated = false, style = {}, className }) {
  const computedStyle = {
    ...tokens.card.base,
    ...(elevated ? tokens.card.elevated : {}),
    ...style,
  };

  return (
    <div style={computedStyle} className={className}>
      {children}
    </div>
  );
}

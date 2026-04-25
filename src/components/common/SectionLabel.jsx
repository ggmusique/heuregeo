import React from "react";
import { tokens } from "../../utils/designTokens";

export function SectionLabel({ children, accent = false }) {
  const labelStyle = {
    ...tokens.text.label,
  };

  const content = accent ? (
    <span style={{ color: tokens.colors.gold.primary }}>{children}</span>
  ) : (
    children
  );

  return <div style={labelStyle}>{content}</div>;
}

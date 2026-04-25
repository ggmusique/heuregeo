export const tokens = {
  colors: {
    bg: {
      surface: "rgba(10, 22, 40, 0.7)",
      surfaceElevated: "rgba(15, 31, 61, 0.8)",
    },
    text: {
      muted: "rgba(255,255,255,0.35)",
      secondary: "rgba(255,255,255,0.6)",
    },
    gold: {
      primary: "#D4AF37",
      glow: "rgba(212,175,55,0.3)",
    },
    indigo: {
      primary: "#6366f1",
      glow: "rgba(99,102,241,0.3)",
    },
    emerald: {
      primary: "#10B981",
      glow: "rgba(16,185,129,0.3)",
    },
    amber: {
      primary: "#F59E0B",
      glow: "rgba(245,158,11,0.3)",
    },
    cyan: {
      primary: "#06B6D4",
      glow: "rgba(6,182,212,0.3)",
    },
  },

  card: {
    base: {
      background: "rgba(10, 22, 40, 0.7)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      padding: "14px",
      backdropFilter: "blur(12px)",
    },
    elevated: {
      background: "rgba(15, 31, 61, 0.8)",
      border: "1px solid rgba(212,175,55,0.25)",
    },
  },

  text: {
    label: {
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.2em",
      color: "rgba(255,255,255,0.35)",
    },
    mono: {
      fontFamily: "'DM Mono', monospace",
    },
    heading: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 700,
    },
  },

  font: {
    base: "'Syne', sans-serif",
    mono: "'DM Mono', monospace",
  },

  spacing: {
    gapSm: "14px",
    gapMd: "16px",
    sectionPadding: "24px",
  },

  borderRadius: {
    card: "20px",
    badge: "10px",
    input: "12px",
  },

  transitions: {
    standard: "0.2s ease",
  },
};

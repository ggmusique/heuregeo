export const chartColors = {
  indigo: {
    primary: "#6366f1",
    gradient: ["rgba(99,102,241,0.8)", "rgba(99,102,241,0.1)"],
  },
  amber: {
    primary: "#F59E0B",
    gradient: ["rgba(245,158,11,0.8)", "rgba(245,158,11,0.1)"],
  },
  emerald: {
    primary: "#10B981",
    gradient: ["rgba(16,185,129,0.8)", "rgba(16,185,129,0.1)"],
  },
  cyan: {
    primary: "#06B6D4",
    gradient: ["rgba(6,182,212,0.8)", "rgba(6,182,212,0.1)"],
  },
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: "easeInOutQuart" },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(10,22,40,0.95)",
      borderColor: "rgba(212,175,55,0.3)",
      borderWidth: 1,
      titleColor: "#D4AF37",
      bodyColor: "rgba(255,255,255,0.7)",
      padding: 12,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: "rgba(255,255,255,0.3)",
        font: { size: 11 },
      },
      border: { display: false },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.05)", drawBorder: false },
      ticks: {
        color: "rgba(255,255,255,0.3)",
        font: { size: 11 },
        callback: (v) => v.toLocaleString("fr-FR") + " €",
      },
      border: { display: false },
    },
  },
};

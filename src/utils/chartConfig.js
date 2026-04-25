export const chartColors = {
  indigo: {
    primary: "#6366F1",
    gradient: ["rgba(99,102,241,0.9)", "rgba(99,102,241,0.2)"],
  },
  amber: {
    primary: "#F59E0B",
    gradient: ["rgba(245,158,11,0.9)", "rgba(245,158,11,0.2)"],
  },
  emerald: {
    primary: "#10B981",
  },
  cyan: {
    primary: "#06B6D4",
  },
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(3,10,24,0.95)",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      titleColor: "#fff",
      bodyColor: "rgba(255,255,255,0.85)",
      padding: 10,
      cornerRadius: 10,
      displayColors: false,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "rgba(255,255,255,0.45)",
        font: { size: 10 },
      },
      grid: { display: false },
    },
    y: {
      ticks: {
        color: "rgba(255,255,255,0.45)",
        font: { size: 10 },
      },
      grid: {
        color: "rgba(255,255,255,0.07)",
      },
      beginAtZero: true,
    },
  },
};

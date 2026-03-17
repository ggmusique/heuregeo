// src/utils/chartConfig.js
export const chartColors = {
  gold: { primary: '#D4AF37', gradient: ['rgba(212,175,55,0.8)', 'rgba(212,175,55,0.1)'] },
  indigo: { primary: '#4F46E5', gradient: ['rgba(79,70,229,0.8)', 'rgba(79,70,229,0.1)'] },
  emerald: { primary: '#10B981', gradient: ['rgba(16,185,129,0.8)', 'rgba(16,185,129,0.1)'] },
  cyan: { primary: '#06B6D4', gradient: ['rgba(6,182,212,0.8)', 'rgba(6,182,212,0.1)'] },
  amber: { primary: '#F59E0B', gradient: ['rgba(245,158,11,0.8)', 'rgba(245,158,11,0.1)'] },
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10,22,40,0.95)',
      titleColor: '#D4AF37',
      bodyColor: 'rgba(255,255,255,0.9)',
      borderColor: 'rgba(212,175,55,0.3)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label} : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(ctx.raw) }`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11, family: "'DM Mono', monospace" } },
      border: { color: 'rgba(255,255,255,0.1)' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
      ticks: {
        color: 'rgba(255,255,255,0.5)',
        font: { size: 10, family: "'DM Mono', monospace" },
        callback: (value) => value >= 1000 ? (value/1000).toFixed(1) + 'k€' : value + '€',
      },
      border: { color: 'rgba(255,255,255,0.1)' },
    },
  },
};

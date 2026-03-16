import React, { useMemo, useEffect, useRef, useState } from "react";
import { getWeekNumber } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

function getMonthKey(dateIso) {
  return dateIso ? dateIso.slice(0, 7) : null;
}

function fmtMonthShort(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(y, parseInt(m) - 1).toLocaleString("fr-FR", { month: "short" });
}

function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ─── Styles injectés une seule fois ───────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');

  .geo-dash {
    font-family: 'Syne', sans-serif;
    background: transparent;
    color: #fff;
    padding: 0 0 40px;
  }
  .geo-dash * { box-sizing: border-box; margin: 0; padding: 0; }

  .geo-dash .gdash-header {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
    padding: 18px 0 16px;
    border-bottom: 1px solid rgba(212,175,55,0.2);
    margin-bottom: 20px;
  }
  .geo-dash .gdash-title {
    font-size: 22px; font-weight: 800; font-style: italic;
    letter-spacing: 0.12em; color: #D4AF37; text-transform: uppercase;
  }
  .geo-dash .gdash-sub {
    font-size: 11px; color: rgba(255,255,255,0.4);
    letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px;
  }
  .geo-dash .gdash-week-badge {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: rgba(255,255,255,0.45);
    padding: 5px 12px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
  }

  .geo-dash .gdash-patron-strip {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 20px;
  }
  .geo-dash .gdash-patron-label {
    font-size: 10px; color: rgba(255,255,255,0.35);
    text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;
  }
  .geo-dash .gdash-patron-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.18s; background: transparent;
    color: rgba(255,255,255,0.55); font-family: 'Syne', sans-serif;
  }
  .geo-dash .gdash-patron-chip:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.18); }
  .geo-dash .gdash-patron-chip.active {
    border-color: rgba(212,175,55,0.5); background: rgba(212,175,55,0.1); color: #D4AF37;
  }
  .geo-dash .gdash-patron-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  .geo-dash .gdash-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0,1fr));
    gap: 12px; margin-bottom: 20px;
  }
  @media (max-width: 680px) { .geo-dash .gdash-kpi-row { grid-template-columns: repeat(2, minmax(0,1fr)); } }

  .geo-dash .gdash-kpi {
    background: rgba(10,22,40,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 16px 18px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s;
  }
  .geo-dash .gdash-kpi:hover { border-color: rgba(255,255,255,0.15); }
  .geo-dash .gdash-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 16px 16px 0 0;
  }
  .geo-dash .gdash-kpi.k-gold::before  { background: linear-gradient(90deg,#D4AF37,transparent); }
  .geo-dash .gdash-kpi.k-indigo::before { background: linear-gradient(90deg,#4F46E5,transparent); }
  .geo-dash .gdash-kpi.k-emerald::before{ background: linear-gradient(90deg,#10B981,transparent); }
  .geo-dash .gdash-kpi.k-cyan::before   { background: linear-gradient(90deg,#06B6D4,transparent); }

  .geo-dash .gdash-kpi-icon {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; margin-bottom: 10px;
  }
  .geo-dash .gdash-kpi.k-gold   .gdash-kpi-icon { background: rgba(212,175,55,0.12); }
  .geo-dash .gdash-kpi.k-indigo .gdash-kpi-icon { background: rgba(79,70,229,0.15); }
  .geo-dash .gdash-kpi.k-emerald.gdash-kpi-icon { background: rgba(16,185,129,0.12); }
  .geo-dash .gdash-kpi.k-cyan   .gdash-kpi-icon { background: rgba(6,182,212,0.12); }

  .geo-dash .gdash-kpi-label {
    font-size: 9px; color: rgba(255,255,255,0.35);
    text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700; margin-bottom: 6px;
  }
  .geo-dash .gdash-kpi-value {
    font-family: 'DM Mono', monospace;
    font-size: 20px; font-weight: 500; line-height: 1; margin-bottom: 5px;
  }
  .geo-dash .gdash-kpi.k-gold   .gdash-kpi-value { color: #D4AF37; }
  .geo-dash .gdash-kpi.k-indigo .gdash-kpi-value { color: #818CF8; }
  .geo-dash .gdash-kpi.k-emerald .gdash-kpi-value { color: #10B981; }
  .geo-dash .gdash-kpi.k-cyan   .gdash-kpi-value { color: #06B6D4; }
  .geo-dash .gdash-kpi-delta { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.35); }
  .geo-dash .gdash-kpi-delta.up   { color: #10B981; }
  .geo-dash .gdash-kpi-delta.down { color: #EF4444; }

  .geo-dash .gdash-mid {
    display: grid; grid-template-columns: 1fr 320px; gap: 16px; margin-bottom: 20px;
  }
  @media (max-width: 780px) { .geo-dash .gdash-mid { grid-template-columns: 1fr; } }

  .geo-dash .gdash-panel {
    background: rgba(10,22,40,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 18px 20px;
  }
  .geo-dash .gdash-panel-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.2em; color: rgba(255,255,255,0.35);
    margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;
  }
  .geo-dash .gdash-panel-accent { color: #D4AF37; }

  .geo-dash .gdash-chart-wrap { position: relative; height: 190px; width: 100%; }

  .geo-dash .gdash-mission-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 6px; border-radius: 8px; cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.15s;
  }
  .geo-dash .gdash-mission-item:hover { background: rgba(255,255,255,0.03); }
  .geo-dash .gdash-mission-item:last-child { border-bottom: none; }
  .geo-dash .gdash-mission-badge {
    width: 38px; height: 38px; flex-shrink: 0;
    border-radius: 10px; background: rgba(79,70,229,0.15);
    border: 1px solid rgba(79,70,229,0.3);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'DM Mono', monospace;
  }
  .geo-dash .gdash-m-day   { font-size: 13px; font-weight: 500; line-height: 1; color: #818CF8; }
  .geo-dash .gdash-m-month { font-size: 8px; color: rgba(255,255,255,0.35); text-transform: uppercase; }
  .geo-dash .gdash-m-client { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .geo-dash .gdash-m-meta  { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .geo-dash .gdash-m-amount {
    font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500;
    color: #10B981; white-space: nowrap; text-align: right;
  }

  .geo-dash .gdash-bottom {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
  }
  @media (max-width: 780px) { .geo-dash .gdash-bottom { grid-template-columns: 1fr; } }

  .geo-dash .gdash-bilan-card {
    background: linear-gradient(135deg, rgba(15,31,61,0.95), rgba(10,22,40,0.95));
    border: 1px solid rgba(212,175,55,0.25); border-radius: 16px; padding: 18px 20px;
  }
  .geo-dash .gdash-bilan-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;
  }
  .geo-dash .gdash-bilan-row:last-of-type { border-bottom: none; }
  .geo-dash .gdash-bilan-lbl { color: rgba(255,255,255,0.4); }
  .geo-dash .gdash-bilan-val { font-family: 'DM Mono', monospace; font-weight: 500; font-size: 12px; }
  .geo-dash .gdash-bilan-total {
    margin-top: 10px; padding-top: 10px;
    border-top: 1px solid rgba(212,175,55,0.2);
    display: flex; justify-content: space-between; align-items: center;
  }
  .geo-dash .gdash-bilan-total-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #D4AF37; font-weight: 700; }
  .geo-dash .gdash-bilan-total-val { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 500; color: #D4AF37; }

  .geo-dash .gdash-bar-row { margin-bottom: 11px; }
  .geo-dash .gdash-bar-label { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
  .geo-dash .gdash-bar-name { color: rgba(255,255,255,0.7); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
  .geo-dash .gdash-bar-val  { font-family: 'DM Mono', monospace; color: rgba(255,255,255,0.4); font-size: 10px; }
  .geo-dash .gdash-bar-track { height: 4px; background: rgba(255,255,255,0.07); border-radius: 4px; overflow: hidden; }
  .geo-dash .gdash-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.9s cubic-bezier(0.16,1,0.3,1); }

  .geo-dash .gdash-impayes-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;
  }
  .geo-dash .gdash-impayes-row:last-child { border-bottom: none; }
  .geo-dash .gdash-empty {
    text-align: center; padding: 24px 0;
    font-size: 12px; color: rgba(255,255,255,0.25); font-style: italic;
  }

  .geo-dash .gdash-action-btn {
    width: 100%; margin-top: 12px; padding: 9px;
    border-radius: 10px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.15em;
    cursor: pointer; font-family: 'Syne', sans-serif;
    transition: background 0.2s; border: none;
  }
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
  styleInjected = true;
}

// ─── Palette couleurs patrons ──────────────────────────────────────────────────
const PATRON_COLORS = [
  "#8B5CF6", "#10B981", "#F59E0B", "#06B6D4",
  "#F472B6", "#EF4444", "#3B82F6", "#84CC16",
];

// ─── Composant principal ───────────────────────────────────────────────────────

export function DashboardPanel({
  missions = [],
  fraisDivers = [],
  listeAcomptes = [],
  patrons = [],
  clients = [],
  lieux = [],
  profile,
  darkMode = true,
}) {
  injectStyle();

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [selectedPatronId, setSelectedPatronId] = useState(null); // null = tous
  const [barsReady, setBarsReady] = useState(false);

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  // ── Filtre missions selon patron sélectionné ──────────────────────────────
  const filteredMissions = useMemo(() => {
    if (!selectedPatronId) return missions;
    return missions.filter((m) => m.patron_id === selectedPatronId);
  }, [missions, selectedPatronId]);

  // ── Semaine courante ──────────────────────────────────────────────────────
  const missionsThisWeek = useMemo(() => {
    return filteredMissions.filter((m) => {
      if (!m.date_iso) return false;
      const d = new Date(m.date_iso + "T12:00:00");
      return getWeekNumber(d) === currentWeek && getISOWeekYear(d) === currentYear;
    });
  }, [filteredMissions, currentWeek, currentYear]);

  const missionsLastWeek = useMemo(() => {
    return filteredMissions.filter((m) => {
      if (!m.date_iso) return false;
      const d = new Date(m.date_iso + "T12:00:00");
      return getWeekNumber(d) === currentWeek - 1 && getISOWeekYear(d) === currentYear;
    });
  }, [filteredMissions, currentWeek, currentYear]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const caWeek = missionsThisWeek.reduce((s, m) => s + (m.montant || 0), 0);
    const caLastWeek = missionsLastWeek.reduce((s, m) => s + (m.montant || 0), 0);
    const hWeek = missionsThisWeek.reduce((s, m) => s + (m.duree || 0), 0);
    const hLastWeek = missionsLastWeek.reduce((s, m) => s + (m.duree || 0), 0);
    const nbMissions = missionsThisWeek.length;
    const tauxMoyen = hWeek > 0 ? caWeek / hWeek : 0;

    const caDelta = caLastWeek > 0 ? Math.round(((caWeek - caLastWeek) / caLastWeek) * 100) : null;
    const hDelta = hWeek - hLastWeek;

    return { caWeek, hWeek, nbMissions, tauxMoyen, caDelta, hDelta };
  }, [missionsThisWeek, missionsLastWeek]);

  // ── Bilan semaine courante ────────────────────────────────────────────────
  const bilanSemaine = useMemo(() => {
    const caWeek = kpis.caWeek;

    const fraisWeek = fraisDivers
      .filter((f) => {
        if (!f.date_frais) return false;
        const d = new Date(f.date_frais + "T12:00:00");
        const ok = getWeekNumber(d) === currentWeek && getISOWeekYear(d) === currentYear;
        return ok && (!selectedPatronId || f.patron_id === selectedPatronId);
      })
      .reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);

    const acomptesWeek = listeAcomptes
      .filter((a) => {
        if (!a.date_acompte) return false;
        const d = new Date(a.date_acompte + "T12:00:00");
        const ok = getWeekNumber(d) === currentWeek && getISOWeekYear(d) === currentYear;
        return ok && (!selectedPatronId || a.patron_id === selectedPatronId);
      })
      .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

    const resteApercevoir = Math.max(0, caWeek + fraisWeek - acomptesWeek);
    return { caWeek, fraisWeek, acomptesWeek, resteApercevoir };
  }, [kpis.caWeek, fraisDivers, listeAcomptes, currentWeek, currentYear, selectedPatronId]);

  // ── Top clients ───────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map = {};
    filteredMissions.forEach((m) => {
      const key = m.client_id || m.client || "?";
      const name = m.client || clients.find((c) => c.id === m.client_id)?.nom || "Client";
      if (!map[key]) map[key] = { name, ca: 0 };
      map[key].ca += m.montant || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5);
  }, [filteredMissions, clients]);

  // ── Impayés récents ───────────────────────────────────────────────────────
  const impayes = useMemo(() => {
    // On simule les semaines avec missions non payées sur les 8 dernières semaines
    const result = [];
    for (let w = currentWeek - 1; w >= Math.max(1, currentWeek - 8); w--) {
      const mWeek = filteredMissions.filter((m) => {
        if (!m.date_iso) return false;
        const d = new Date(m.date_iso + "T12:00:00");
        return getWeekNumber(d) === w && getISOWeekYear(d) === currentYear;
      });
      if (mWeek.length === 0) continue;
      const total = mWeek.reduce((s, m) => s + (m.montant || 0), 0);
      if (total > 0) result.push({ week: w, total });
      if (result.length >= 4) break;
    }
    return result;
  }, [filteredMissions, currentWeek, currentYear]);

  // ── Données graphique CA 6 derniers mois ─────────────────────────────────
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const labels = months.map(fmtMonthShort);
    const caData = months.map((ym) =>
      filteredMissions
        .filter((m) => getMonthKey(m.date_iso) === ym)
        .reduce((s, m) => s + (m.montant || 0), 0)
    );
    const fraisData = months.map((ym) =>
      fraisDivers
        .filter((f) => {
          const ok = getMonthKey(f.date_frais) === ym;
          return ok && (!selectedPatronId || f.patron_id === selectedPatronId);
        })
        .reduce((s, f) => s + (parseFloat(f.montant) || 0), 0)
    );
    return { labels, caData, fraisData };
  }, [filteredMissions, fraisDivers, selectedPatronId]);

  // ── Missions récentes triées ──────────────────────────────────────────────
  const recentMissions = useMemo(() => {
    return [...missionsThisWeek]
      .sort((a, b) => (b.date_iso || "").localeCompare(a.date_iso || ""))
      .slice(0, 5);
  }, [missionsThisWeek]);

  // ── Chart.js ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;

    const load = async () => {
      // Charger Chart.js dynamiquement si pas déjà chargé
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      chartInstance.current = new window.Chart(chartRef.current, {
        type: "bar",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Missions",
              data: chartData.caData,
              backgroundColor: "rgba(79,70,229,0.65)",
              borderRadius: 6, borderSkipped: false,
            },
            {
              label: "Frais",
              data: chartData.fraisData,
              backgroundColor: "rgba(245,158,11,0.55)",
              borderRadius: 6, borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(10,22,40,0.96)",
              borderColor: "rgba(212,175,55,0.3)", borderWidth: 1,
              titleColor: "#D4AF37", bodyColor: "rgba(255,255,255,0.7)",
              padding: 10,
              callbacks: { label: (ctx) => ` ${ctx.dataset.label} : ${Math.round(ctx.raw).toLocaleString("fr-FR")} €` },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "rgba(255,255,255,0.4)", font: { size: 11 } },
              border: { color: "rgba(255,255,255,0.08)" },
            },
            y: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: {
                color: "rgba(255,255,255,0.4)",
                font: { size: 10, family: "'DM Mono', monospace" },
                callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k €" : v + " €",
              },
              border: { color: "rgba(255,255,255,0.08)" },
            },
          },
        },
      });
    };
    load();
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [chartData]);

  // ── Animation barres clients ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 100);
    return () => clearTimeout(t);
  }, [topClients]);

  // ── Couleurs patrons ───────────────────────────────────────────────────────
  const patronColorMap = useMemo(() => {
    const map = {};
    patrons.forEach((p, i) => {
      map[p.id] = p.couleur || PATRON_COLORS[i % PATRON_COLORS.length];
    });
    return map;
  }, [patrons]);

  const maxClientCA = topClients[0]?.ca || 1;

  const nowStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="geo-dash">

      {/* ── Header ── */}
      <div className="gdash-header">
        <div>
          <div className="gdash-title">
            Heures de {profile?.prenom?.trim()?.toUpperCase() || "Géo"}
          </div>
          <div className="gdash-sub">Dashboard · {nowStr}</div>
        </div>
        <div className="gdash-week-badge">Semaine {currentWeek} · {currentYear}</div>
      </div>

      {/* ── Patron tabs ── */}
      {patrons.length > 0 && (
        <div className="gdash-patron-strip">
          <span className="gdash-patron-label">Patron</span>
          <button
            className={"gdash-patron-chip" + (!selectedPatronId ? " active" : "")}
            onClick={() => setSelectedPatronId(null)}
          >
            Tous
          </button>
          {patrons.map((p) => (
            <button
              key={p.id}
              className={"gdash-patron-chip" + (selectedPatronId === p.id ? " active" : "")}
              onClick={() => setSelectedPatronId(p.id)}
            >
              <span className="gdash-patron-dot" style={{ background: patronColorMap[p.id] }} />
              {p.nom}
            </button>
          ))}
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="gdash-kpi-row">
        <div className="gdash-kpi k-gold">
          <div className="gdash-kpi-icon">💶</div>
          <div className="gdash-kpi-label">CA cette semaine</div>
          <div className="gdash-kpi-value">{formatEuro(kpis.caWeek)}</div>
          {kpis.caDelta !== null ? (
            <div className={"gdash-kpi-delta " + (kpis.caDelta >= 0 ? "up" : "down")}>
              {kpis.caDelta >= 0 ? "▲" : "▼"} {Math.abs(kpis.caDelta)} % vs sem. préc.
            </div>
          ) : (
            <div className="gdash-kpi-delta">— première semaine</div>
          )}
        </div>
        <div className="gdash-kpi k-indigo">
          <div className="gdash-kpi-icon">⏱</div>
          <div className="gdash-kpi-label">Heures travaillées</div>
          <div className="gdash-kpi-value">{formatHeures(kpis.hWeek)}</div>
          <div className={"gdash-kpi-delta " + (kpis.hDelta >= 0 ? "up" : "down")}>
            {kpis.hDelta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(kpis.hDelta * 10) / 10)} h vs sem. préc.
          </div>
        </div>
        <div className="gdash-kpi k-emerald">
          <div className="gdash-kpi-icon">✓</div>
          <div className="gdash-kpi-label">Missions cette sem.</div>
          <div className="gdash-kpi-value">{kpis.nbMissions}</div>
          <div className="gdash-kpi-delta">
            {missionsThisWeek.length > 0
              ? new Set(missionsThisWeek.map((m) => m.client || m.client_id)).size + " client(s)"
              : "— aucune mission"}
          </div>
        </div>
        <div className="gdash-kpi k-cyan">
          <div className="gdash-kpi-icon">📍</div>
          <div className="gdash-kpi-label">Taux horaire moyen</div>
          <div className="gdash-kpi-value">
            {kpis.tauxMoyen > 0 ? (Math.round(kpis.tauxMoyen * 10) / 10).toLocaleString("fr-FR") + " €" : "—"}
          </div>
          <div className="gdash-kpi-delta">
            {kpis.hWeek > 0 ? formatHeures(kpis.hWeek) + " facturées" : "— aucune heure"}
          </div>
        </div>
      </div>

      {/* ── Milieu : graphique + missions ── */}
      <div className="gdash-mid">
        {/* Graphique CA */}
        <div className="gdash-panel">
          <div class="gdash-panel-title">
            <span>CA mensuel <span class="gdash-panel-accent">(6 derniers mois)</span></span>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:"rgba(255,255,255,0.35)" }}>
                <span style={{ width:8, height:8, borderRadius:2, background:"#4F46E5", display:"inline-block" }}></span>Missions
              </span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:"rgba(255,255,255,0.35)" }}>
                <span style={{ width:8, height:8, borderRadius:2, background:"#F59E0B", display:"inline-block" }}></span>Frais
              </span>
            </div>
          </div>
          <div className="gdash-chart-wrap">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Missions récentes */}
        <div className="gdash-panel">
          <div className="gdash-panel-title">
            <span>Missions <span className="gdash-panel-accent">cette semaine</span></span>
            <span style={{ fontSize:9, color:"rgba(79,70,229,0.8)", fontWeight:700 }}>
              {missionsThisWeek.length} / {filteredMissions.length} total
            </span>
          </div>
          {recentMissions.length === 0 ? (
            <div className="gdash-empty">Aucune mission cette semaine</div>
          ) : (
            recentMissions.map((m) => {
              const d = m.date_iso ? new Date(m.date_iso + "T12:00:00") : new Date();
              const day = d.getDate().toString().padStart(2, "0");
              const month = d.toLocaleString("fr-FR", { month: "short" });
              return (
                <div key={m.id} className="gdash-mission-item">
                  <div className="gdash-mission-badge">
                    <span className="gdash-m-day">{day}</span>
                    <span className="gdash-m-month">{month}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="gdash-m-client">{m.client || "—"}</div>
                    <div className="gdash-m-meta">
                      {m.lieu ? `📍 ${m.lieu} · ` : ""}{m.debut}–{m.fin}
                    </div>
                  </div>
                  <div className="gdash-m-amount">
                    <div>{formatEuro(m.montant || 0)}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                      {formatHeures(m.duree || 0)}
                    </div>
                  </div>
                  {patronColorMap[m.patron_id] && (
                    <span style={{ width:6, height:6, borderRadius:"50%", background:patronColorMap[m.patron_id], flexShrink:0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Bas : bilan + clients + impayés ── */}
      <div className="gdash-bottom">

        {/* Bilan semaine */}
        <div className="gdash-bilan-card">
          <div className="gdash-panel-title" style={{ marginBottom:12 }}>
            <span>Bilan <span className="gdash-panel-accent">semaine {currentWeek}</span></span>
          </div>
          <div className="gdash-bilan-row">
            <span className="gdash-bilan-lbl">Missions</span>
            <span className="gdash-bilan-val">{formatEuro(bilanSemaine.caWeek)}</span>
          </div>
          {bilanSemaine.fraisWeek > 0 && (
            <div className="gdash-bilan-row">
              <span className="gdash-bilan-lbl">Frais divers</span>
              <span className="gdash-bilan-val" style={{ color:"#F59E0B" }}>+{formatEuro(bilanSemaine.fraisWeek)}</span>
            </div>
          )}
          {bilanSemaine.acomptesWeek > 0 && (
            <div className="gdash-bilan-row">
              <span className="gdash-bilan-lbl">Acomptes reçus</span>
              <span className="gdash-bilan-val" style={{ color:"#06B6D4" }}>−{formatEuro(bilanSemaine.acomptesWeek)}</span>
            </div>
          )}
          <div className="gdash-bilan-total">
            <span className="gdash-bilan-total-lbl">Reste à percevoir</span>
            <span className="gdash-bilan-total-val">{formatEuro(bilanSemaine.resteApercevoir)}</span>
          </div>
        </div>

        {/* Top clients */}
        <div className="gdash-panel">
          <div className="gdash-panel-title">
            Top clients <span className="gdash-panel-accent">(CA cumulé)</span>
          </div>
          {topClients.length === 0 ? (
            <div className="gdash-empty">Aucun client trouvé</div>
          ) : (
            topClients.map((c, i) => {
              const pct = Math.round((c.ca / maxClientCA) * 100);
              const colors = ["#8B5CF6","#10B981","#F59E0B","#06B6D4","#F472B6"];
              return (
                <div key={i} className="gdash-bar-row">
                  <div className="gdash-bar-label">
                    <span className="gdash-bar-name">{c.name}</span>
                    <span className="gdash-bar-val">{Math.round(c.ca).toLocaleString("fr-FR")} €</span>
                  </div>
                  <div className="gdash-bar-track">
                    <div
                      className="gdash-bar-fill"
                      style={{ width: barsReady ? pct + "%" : "0%", background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Impayés récents */}
        <div className="gdash-panel">
          <div className="gdash-panel-title">
            Semaines <span className="gdash-panel-accent">précédentes</span>
          </div>
          {impayes.length === 0 ? (
            <div className="gdash-empty">Tout est à jour ✓</div>
          ) : (
            impayes.map((row) => (
              <div key={row.week} className="gdash-impayes-row">
                <span style={{ color:"rgba(255,255,255,0.55)", fontWeight:600, fontSize:12 }}>
                  Semaine {row.week}
                </span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#F59E0B", fontWeight:500 }}>
                  {formatEuro(row.total)}
                </span>
              </div>
            ))
          )}
          <div style={{
            marginTop:14, padding:"10px 12px", borderRadius:10,
            background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)",
            display:"flex", justifyContent:"space-between", alignItems:"center"
          }}>
            <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.15em", color:"rgba(16,185,129,0.8)", fontWeight:700 }}>
              CA total cumulé
            </span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:"#10B981", fontWeight:500 }}>
              {formatEuro(filteredMissions.reduce((s, m) => s + (m.montant || 0), 0))}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
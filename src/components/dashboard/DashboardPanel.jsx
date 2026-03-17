import React, { useMemo, useEffect, useRef, useState, memo } from "react";
import { getWeekNumber } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { chartColors, chartOptions } from "../../utils/chartConfig"; // NOUVEAU
import { tokens } from "../../utils/designTokens"; // NOUVEAU
import { KPICard } from "./KPICard"; // NOUVEAU

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}
function getMonthKey(dateIso) { return dateIso ? dateIso.slice(0, 7) : null; }
function fmtMonthShort(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(y, parseInt(m) - 1).toLocaleString("fr-FR", { month: "short" });
}

// ─── Composant principal ───────────────────────────────────────────────────────
export function DashboardPanel({
  missions = [], fraisDivers = [], listeAcomptes = [], patrons = [],
  clients = [], lieux = [], profile, darkMode = true,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [selectedPatronId, setSelectedPatronId] = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  // ── Filtre missions ──────────────────────────────────────────────────────
  const filteredMissions = useMemo(() => {
    if (!selectedPatronId) return missions;
    return missions.filter((m) => m.patron_id === selectedPatronId);
  }, [missions, selectedPatronId]);

  // ── Missions cette semaine / semaine dernière ───────────────────────────
  const getMissionsForWeek = (weekOffset = 0) => {
    const targetWeek = currentWeek + weekOffset;
    return filteredMissions.filter((m) => {
      if (!m.date_iso) return false;
      const d = new Date(m.date_iso + "T12:00:00");
      return getWeekNumber(d) === targetWeek && getISOWeekYear(d) === currentYear;
    });
  };

  const missionsThisWeek = useMemo(() => getMissionsForWeek(0), [filteredMissions, currentWeek, currentYear]);
  const missionsLastWeek = useMemo(() => getMissionsForWeek(-1), [filteredMissions, currentWeek, currentYear]);

  // ── KPIs calculés ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const calc = (list) => ({
      ca: list.reduce((s, m) => s + (m.montant || 0), 0),
      hours: list.reduce((s, m) => s + (m.duree || 0), 0),
      count: list.length,
    });
    const thisW = calc(missionsThisWeek);
    const lastW = calc(missionsLastWeek);
    
    return {
      ca: { value: thisW.ca, delta: lastW.ca ? Math.round(((thisW.ca - lastW.ca) / lastW.ca) * 100) : null },
      hours: { value: thisW.hours, delta: Math.round((thisW.hours - lastW.hours) * 10) / 10 },
      missionsCount: thisW.count,
      avgRate: thisW.hours > 0 ? thisW.ca / thisW.hours : 0,
      uniqueClients: new Set(missionsThisWeek.map(m => m.client || m.client_id)).size,
    };
  }, [missionsThisWeek, missionsLastWeek]);

  // ── Bilan semaine ────────────────────────────────────────────────────────
  const bilanSemaine = useMemo(() => {
    const filterWeek = (items, dateField) => items.filter((item) => {
      if (!item[dateField]) return false;
      const d = new Date(item[dateField] + "T12:00:00");
      return getWeekNumber(d) === currentWeek && getISOWeekYear(d) === currentYear && 
             (!selectedPatronId || item.patron_id === selectedPatronId);
    });
    
    const fraisWeek = filterWeek(fraisDivers, 'date_frais').reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
    const acomptesWeek = filterWeek(listeAcomptes, 'date_acompte').reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
    
    return {
      caWeek: kpis.ca.value,
      fraisWeek,
      acomptesWeek,
      resteApercevoir: Math.max(0, kpis.ca.value + fraisWeek - acomptesWeek),
    };
  }, [kpis.ca.value, fraisDivers, listeAcomptes, currentWeek, currentYear, selectedPatronId]);

  // ── Top clients ──────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map = {};
    filteredMissions.forEach((m) => {
      const key = m.client_id || m.client || "?";
      const name = m.client || clients.find((c) => c.id === m.client_id)?.nom || "Client";
      if (!map[key]) map[key] = { name, ca: 0 };
      map[key].ca += m.montant || 0;
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [filteredMissions, clients]);

  // ── Données graphique (6 derniers mois) ─────────────────────────────────
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const labels = months.map(fmtMonthShort);
    
    const getMonthlyCA = (ym) => filteredMissions
      .filter((m) => getMonthKey(m.date_iso) === ym)
      .reduce((s, m) => s + (m.montant || 0), 0);
    
    const getMonthlyFrais = (ym) => fraisDivers
      .filter((f) => getMonthKey(f.date_frais) === ym && (!selectedPatronId || f.patron_id === selectedPatronId))
      .reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
    
    return {
      labels,
      caData: months.map(getMonthlyCA),
      fraisData: months.map(getMonthlyFrais),
    };
  }, [filteredMissions, fraisDivers, selectedPatronId, now]);

  // ── Missions récentes ────────────────────────────────────────────────────
  const recentMissions = useMemo(() => 
    [...missionsThisWeek].sort((a, b) => (b.date_iso || "").localeCompare(a.date_iso || "")).slice(0, 5),
  [missionsThisWeek]);

  // ── Chart.js initialisation ─────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    
    const initChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      
      if (chartInstance.current) chartInstance.current.destroy();
      
      // Gradients pour les barres
      const caCtx = chartRef.current.getContext('2d');
      const caGradient = caCtx.createLinearGradient(0, 0, 0, 400);
      caGradient.addColorStop(0, chartColors.indigo.gradient[0]);
      caGradient.addColorStop(1, chartColors.indigo.gradient[1]);
      
      const fraisCtx = chartRef.current.getContext('2d');
      const fraisGradient = fraisCtx.createLinearGradient(0, 0, 0, 400);
      fraisGradient.addColorStop(0, chartColors.amber.gradient[0]);
      fraisGradient.addColorStop(1, chartColors.amber.gradient[1]);
      
      chartInstance.current = new window.Chart(chartRef.current, {
        type: "bar",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Missions",
              data: chartData.caData,
              backgroundColor: caGradient,
              borderRadius: 8, borderSkipped: false,
              barPercentage: 0.7, categoryPercentage: 0.8,
            },
            {
              label: "Frais",
              data: chartData.fraisData,
              backgroundColor: fraisGradient,
              borderRadius: 8, borderSkipped: false,
              barPercentage: 0.7, categoryPercentage: 0.8,
            },
          ],
        },
        options: {
          ...chartOptions,
          onHover: (e, activeElements) => {
            e.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
          },
        },
      });
      
      setChartLoaded(true);
    };
    
    initChart();
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [chartData]);

  // ── Animation barres clients ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 150);
    return () => clearTimeout(t);
  }, [topClients]);

  // ── Couleurs patrons ─────────────────────────────────────────────────────
  const patronColorMap = useMemo(() => {
    const map = {};
    patrons.forEach((p, i) => {
      map[p.id] = p.couleur || ["#8B5CF6","#10B981","#F59E0B","#06B6D4","#F472B6","#EF4444","#3B82F6","#84CC16"][i % 8];
    });
    return map;
  }, [patrons]);

  const maxClientCA = topClients[0]?.ca || 1;
  const nowStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="geo-dash" style={{ fontFamily: "'Syne', sans-serif", color: '#fff', padding: '0 0 40px' }}>
      
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', padding: '18px 0 16px',
        borderBottom: '1px solid rgba(212,175,55,0.2)', marginBottom: '24px',
      }}>
        <div>

        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: '11px',
          color: 'rgba(255,255,255,0.45)', padding: '6px 14px',
          borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          Semaine {currentWeek} · {currentYear}
        </div>
      </div>

{/* ── Patron selector ── */}
{patrons.length > 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
    <span style={{
      fontSize: '10px', color: 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      Patron
    </span>
    <select
      value={selectedPatronId || ""}
      onChange={(e) => setSelectedPatronId(e.target.value || null)}
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: '13px', fontWeight: 600,
        color: selectedPatronId ? '#D4AF37' : 'rgba(255,255,255,0.7)',
        background: 'rgba(10,22,40,0.9)',
        border: `1px solid ${selectedPatronId ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: '12px',
        padding: '8px 36px 8px 14px',
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(212,175,55,0.6)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        transition: 'border-color 0.2s, color 0.2s',
        minWidth: '180px',
      }}
    >
      <option value="" style={{ background: '#0A1628', color: '#fff' }}>
        Tous les patrons
      </option>
      {patrons.map((p) => (
        <option key={p.id} value={p.id} style={{ background: '#0A1628', color: '#fff' }}>
          {p.nom}
        </option>
      ))}
    </select>
  </div>
)}

      {/* ── KPIs Grid ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px', marginBottom: '24px',
      }}>
        <KPICard
          icon="💶" label="CA cette semaine" value={formatEuro(kpis.ca.value)}
          delta={kpis.ca.delta} accentColor="gold" delay={0}
          ariaLabel={`Chiffre d'affaires: ${formatEuro(kpis.ca.value)}`}
        />
        <KPICard
          icon="⏱" label="Heures travaillées" value={formatHeures(kpis.hours.value)}
          delta={kpis.hours.delta} accentColor="indigo" delay={100}
          ariaLabel={`${formatHeures(kpis.hours.value)} travaillées`}
        />
        <KPICard
          icon="✓" label="Missions" value={kpis.missionsCount}
          delta={null} accentColor="emerald" delay={200}
          ariaLabel={`${kpis.missionsCount} missions cette semaine`}
        />
        <KPICard
          icon="📍" label="Taux horaire"
          value={kpis.avgRate > 0 ? `${Math.round(kpis.avgRate * 10) / 10}€` : "—"}
          delta={null} accentColor="cyan" delay={300}
          ariaLabel={`Taux horaire moyen: ${kpis.avgRate.toFixed(2)} euros`}
        />
      </div>

      {/* ── Milieu : graphique + missions ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '24px',
      }} className="dashboard-grid">
        {/* Graphique CA */}
        <div style={{
          background: tokens.colors.bg.surface, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '20px', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)',
            marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>CA mensuel <span style={{ color: '#D4AF37' }}>(6 derniers mois)</span></span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: chartColors.indigo.primary, display: 'inline-block' }} aria-hidden="true"></span>Missions
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: chartColors.amber.primary, display: 'inline-block' }} aria-hidden="true"></span>Frais
              </span>
            </div>
          </div>
          <div style={{ position: 'relative', height: '220px', width: '100%' }}>
            {!chartLoaded && (
              <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: '12px' }} aria-label="Chargement du graphique" />
            )}
            <canvas ref={chartRef} role="img" aria-label="Graphique du chiffre d'affaires sur 6 mois" />
          </div>
        </div>

        {/* Missions récentes */}
        <div style={{
          background: tokens.colors.bg.surface, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '20px', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)',
            marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Missions <span style={{ color: '#D4AF37' }}>cette semaine</span></span>
            <span style={{ fontSize: '9px', color: chartColors.indigo.primary, fontWeight: 700 }}>
              {missionsThisWeek.length} / {filteredMissions.length}
            </span>
          </div>
          {recentMissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
              Aucune mission cette semaine
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMissions.map((m, idx) => {
                const d = m.date_iso ? new Date(m.date_iso + "T12:00:00") : new Date();
                const day = d.getDate().toString().padStart(2, "0");
                const month = d.toLocaleString("fr-FR", { month: "short" });
                return (
                  <div key={m.id || idx} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.15s ease, transform 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{
                      width: '42px', height: '42px', flexShrink: 0,
                      borderRadius: '12px', background: 'rgba(79,70,229,0.15)',
                      border: '1px solid rgba(79,70,229,0.3)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: chartColors.indigo.primary, lineHeight: 1 }}>{day}</span>
                      <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{month}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.client || "—"}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {m.lieu ? `📍 ${m.lieu} · ` : ""}{m.debut}–{m.fin}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: chartColors.emerald.primary }}>
                        {formatEuro(m.montant || 0)}
                      </div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        {formatHeures(m.duree || 0)}
                      </div>
                    </div>
                    {patronColorMap[m.patron_id] && (
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: patronColorMap[m.patron_id], flexShrink: 0,
                        boxShadow: `0 0 6px ${patronColorMap[m.patron_id]}`,
                      }} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bas : bilan + clients + impayés ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px',
      }}>
        {/* Bilan semaine */}
        <div style={{
          background: `linear-gradient(135deg, ${tokens.colors.bg.surfaceElevated}, ${tokens.colors.bg.surface})`,
          border: `1px solid ${tokens.colors.gold.glow}`, borderRadius: '20px', padding: '20px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '14px',
          }}>
            Bilan <span style={{ color: '#D4AF37' }}>semaine {currentWeek}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Missions</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{formatEuro(bilanSemaine.caWeek)}</span>
          </div>
          {bilanSemaine.fraisWeek > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Frais divers</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: chartColors.amber.primary }}>+{formatEuro(bilanSemaine.fraisWeek)}</span>
            </div>
          )}
          {bilanSemaine.acomptesWeek > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Acomptes reçus</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: chartColors.cyan.primary }}>−{formatEuro(bilanSemaine.acomptesWeek)}</span>
            </div>
          )}
          <div style={{
            marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${tokens.colors.gold.glow}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#D4AF37', fontWeight: 700 }}>
              Reste à percevoir
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '20px', fontWeight: 600, color: '#D4AF37' }}>
              {formatEuro(bilanSemaine.resteApercevoir)}
            </span>
          </div>
        </div>

        {/* Top clients */}
        <div style={{
          background: tokens.colors.bg.surface, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '20px', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '14px',
          }}>
            Top clients <span style={{ color: '#D4AF37' }}>(CA cumulé)</span>
          </div>
          {topClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
              Aucun client trouvé
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topClients.map((c, i) => {
                const pct = Math.round((c.ca / maxClientCA) * 100);
                const colors = [chartColors.indigo.primary, chartColors.emerald.primary, chartColors.amber.primary, chartColors.cyan.primary, '#F472B6'];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{c.name}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{Math.round(c.ca).toLocaleString("fr-FR")} €</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%', borderRadius: '4px',
                          width: barsReady ? pct + '%' : '0%',
                          background: colors[i % colors.length],
                          transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${c.name}: ${pct}% du CA`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Semaines précédentes */}
        <div style={{
          background: tokens.colors.bg.surface, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '20px', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '14px',
          }}>
            Semaines <span style={{ color: '#D4AF37' }}>précédentes</span>
          </div>
          {/* Ici tu peux ajouter la logique des impayés si nécessaire */}
          <div style={{
            marginTop: '14px', padding: '12px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: chartColors.emerald.primary, fontWeight: 700 }}>
              CA total cumulé
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', color: chartColors.emerald.primary, fontWeight: 600 }}>
              {formatEuro(filteredMissions.reduce((s, m) => s + (m.montant || 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { getWeekNumber } from "../../utils/dateUtils";
import { formatEuro, formatHeures } from "../../utils/formatters";
import { chartColors, chartOptions } from "../../utils/chartConfig";
import { tokens } from "../../utils/designTokens";
import { KPICard } from "./KPICard";
import { KM_RATES } from "../../utils/kmRatesByCountry";
import { haversineKm } from "../../utils/calculators";
import { supabase } from "../../services/supabase";

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
  return new Date(y, parseInt(m, 10) - 1).toLocaleString("fr-FR", { month: "short" });
}

export function DashboardPanel({
  missions = [],
  fraisDivers = [],
  listeAcomptes = [],
  patrons = [],
  clients = [],
  lieux = [],
  profile,
  darkMode = true,
  kmSettings = null,
  domicileLatLng = null,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [selectedPatronId, setSelectedPatronId] = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [allocByWeek, setAllocByWeek] = useState({});
  const [totalImpayesDB, setTotalImpayesDB] = useState(0);

  const now = useMemo(() => new Date(), []);
  const currentWeek = useMemo(() => getWeekNumber(now), [now]);
  const currentYear = useMemo(() => now.getFullYear(), [now]);

  const kmEnabled = kmSettings?.km_enable === true;

  const filteredMissions = useMemo(() => {
    if (!selectedPatronId) return missions;
    return missions.filter((m) => m.patron_id === selectedPatronId);
  }, [missions, selectedPatronId]);

  const getMissionsForWeek = useCallback(
    (weekOffset = 0) => {
      const targetWeek = currentWeek + weekOffset;
      return filteredMissions.filter((m) => {
        if (!m.date_iso) return false;
        const d = new Date(m.date_iso + "T12:00:00");
        return getWeekNumber(d) === targetWeek && getISOWeekYear(d) === currentYear;
      });
    },
    [filteredMissions, currentWeek, currentYear]
  );

  const missionsThisWeek = useMemo(() => getMissionsForWeek(0), [getMissionsForWeek]);
  const missionsLastWeek = useMemo(() => getMissionsForWeek(-1), [getMissionsForWeek]);

  const computeKmForMissions = useCallback(
    (missionsList) => {
      if (!kmEnabled || !missionsList?.length) {
        return { totalKm: 0, totalAmount: 0 };
      }

      const effectiveDomicile =
        domicileLatLng ??
        (Number.isFinite(kmSettings?.km_domicile_lat) && Number.isFinite(kmSettings?.km_domicile_lng)
          ? {
              lat: kmSettings.km_domicile_lat,
              lng: kmSettings.km_domicile_lng,
            }
          : null);

      if (!Number.isFinite(effectiveDomicile?.lat) || !Number.isFinite(effectiveDomicile?.lng)) {
        return { totalKm: 0, totalAmount: 0 };
      }

      const kmRateEffectif =
        kmSettings?.km_rate_mode === "CUSTOM"
          ? parseFloat(kmSettings?.km_rate) || 0
          : KM_RATES[kmSettings?.km_country_code || "FR"] || 0.42;

      const multiplicateur = kmSettings?.km_include_retour ? 2 : 1;

      let totalKm = 0;
      let totalAmount = 0;

      missionsList.forEach((m) => {
        const lieuById = lieux.find((l) => l.id === m.lieu_id);
        const lieuByName =
          !lieuById && m.lieu
            ? lieux.find((l) => l.nom?.toLowerCase().trim() === m.lieu?.toLowerCase().trim())
            : null;

        const lieu = lieuById || lieuByName;
        const latLieu = Number(lieu?.latitude);
        const lngLieu = Number(lieu?.longitude);

        if (Number.isFinite(latLieu) && Number.isFinite(lngLieu)) {
          const kmOneWay = haversineKm(effectiveDomicile.lat, effectiveDomicile.lng, latLieu, lngLieu);
          const kmTotal = kmOneWay * multiplicateur;
          totalKm += kmTotal;
          totalAmount += kmTotal * kmRateEffectif;
        }
      });

      return { totalKm, totalAmount };
    },
    [kmEnabled, kmSettings, domicileLatLng, lieux]
  );

  const kmThisWeek = useMemo(() => computeKmForMissions(missionsThisWeek), [computeKmForMissions, missionsThisWeek]);

  const kpis = useMemo(() => {
    const calc = (list) => ({
      ca: list.reduce((s, m) => s + (m.montant || 0), 0),
      hours: list.reduce((s, m) => s + (m.duree || 0), 0),
      count: list.length,
    });

    const thisW = calc(missionsThisWeek);
    const lastW = calc(missionsLastWeek);

    return {
      ca: {
        value: thisW.ca,
        delta: lastW.ca ? Math.round(((thisW.ca - lastW.ca) / lastW.ca) * 100) : null,
      },
      hours: {
        value: thisW.hours,
        delta: Math.round((thisW.hours - lastW.hours) * 10) / 10,
      },
      missionsCount: thisW.count,
      avgRate: thisW.hours > 0 ? thisW.ca / thisW.hours : 0,
      uniqueClients: new Set(missionsThisWeek.map((m) => m.client || m.client_id)).size,
    };
  }, [missionsThisWeek, missionsLastWeek]);

  const bilanSemaine = useMemo(() => {
    const filterWeek = (items, dateField) =>
      items.filter((item) => {
        if (!item[dateField]) return false;
        const d = new Date(item[dateField] + "T12:00:00");
        return (
          getWeekNumber(d) === currentWeek &&
          getISOWeekYear(d) === currentYear &&
          (!selectedPatronId || item.patron_id === selectedPatronId)
        );
      });

    const fraisWeek = filterWeek(fraisDivers, "date_frais").reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
    const acomptesWeek = filterWeek(listeAcomptes, "date_acompte").reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

    return {
      caWeek: kpis.ca.value,
      fraisWeek,
      acomptesWeek,
      kmWeek: kmThisWeek.totalAmount,
      resteApercevoir: Math.max(0, kpis.ca.value + fraisWeek + kmThisWeek.totalAmount - acomptesWeek),
    };
  }, [kpis.ca.value, fraisDivers, listeAcomptes, currentWeek, currentYear, selectedPatronId, kmThisWeek]);

  const previousWeeks = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const weekNum = currentWeek - (i + 1);
      if (weekNum < 1) return null;

      const weekMissions = filteredMissions.filter((m) => {
        if (!m.date_iso) return false;
        const d = new Date(m.date_iso + "T12:00:00");
        return getWeekNumber(d) === weekNum && getISOWeekYear(d) === currentYear;
      });

      const fraisWeek = fraisDivers
        .filter((f) => {
          if (!f.date_frais) return false;
          const d = new Date(f.date_frais + "T12:00:00");
          return (
            getWeekNumber(d) === weekNum &&
            getISOWeekYear(d) === currentYear &&
            (!selectedPatronId || f.patron_id === selectedPatronId)
          );
        })
        .reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);

      const acomptesWeek = listeAcomptes
        .filter((a) => {
          if (!a.date_acompte) return false;
          const d = new Date(a.date_acompte + "T12:00:00");
          return (
            getWeekNumber(d) === weekNum &&
            getISOWeekYear(d) === currentYear &&
            (!selectedPatronId || a.patron_id === selectedPatronId)
          );
        })
        .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

      const ca = weekMissions.reduce((s, m) => s + (m.montant || 0), 0);
      const hours = weekMissions.reduce((s, m) => s + (m.duree || 0), 0);
      const km = computeKmForMissions(weekMissions);

      return {
        weekNum,
        ca,
        hours,
        frais: fraisWeek,
        acomptes: acomptesWeek,
        km: km.totalAmount,
        kmKm: km.totalKm,
        reste: Math.max(0, ca - (allocByWeek[weekNum] || 0)),
        missionsCount: weekMissions.length,
      };
    }).filter(Boolean);
  }, [filteredMissions, fraisDivers, listeAcomptes, currentWeek, currentYear, selectedPatronId, computeKmForMissions, allocByWeek]);

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

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const labels = months.map(fmtMonthShort);

    const getMonthlyCA = (ym) =>
      filteredMissions
        .filter((m) => getMonthKey(m.date_iso) === ym)
        .reduce((s, m) => s + (m.montant || 0), 0);

    const getMonthlyFrais = (ym) =>
      fraisDivers
        .filter((f) => getMonthKey(f.date_frais) === ym && (!selectedPatronId || f.patron_id === selectedPatronId))
        .reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);

    return {
      labels,
      caData: months.map(getMonthlyCA),
      fraisData: months.map(getMonthlyFrais),
    };
  }, [filteredMissions, fraisDivers, selectedPatronId, now]);

  useEffect(() => {
    const fetchAllocs = async () => {
      try {
        let query = supabase.from("acompte_allocations").select("periode_index, amount, patron_id");

        if (selectedPatronId) {
          query = query.eq("patron_id", selectedPatronId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const map = {};
        (data || []).forEach((a) => {
          const idx = a.periode_index;
          map[idx] = (map[idx] || 0) + (parseFloat(a.amount) || 0);
        });
        setAllocByWeek(map);

        const { data: bilansImpayes, error: bilansError } = await supabase
          .from("bilans_status_v2")
          .select("reste_a_percevoir, patron_id")
          .eq("paye", false)
          .gt("reste_a_percevoir", 0.01);

        if (bilansError) throw bilansError;

        const totalImpayesFiltered = (bilansImpayes || [])
          .filter((b) => !selectedPatronId || b.patron_id === selectedPatronId)
          .reduce((s, b) => s + parseFloat(b.reste_a_percevoir || 0), 0);

        setTotalImpayesDB(totalImpayesFiltered);
      } catch (err) {
        console.error("DashboardPanel fetchAllocs error:", err);
      }
    };

    fetchAllocs();
  }, [selectedPatronId]);

  useEffect(() => {
    if (!chartRef.current) return;

    const initChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      if (chartInstance.current) {
        chartInstance.current.data.labels = chartData.labels;
        chartInstance.current.data.datasets[0].data = chartData.caData;
        chartInstance.current.data.datasets[1].data = chartData.fraisData;
        chartInstance.current.update("active");
        return;
      }

      const ctx = chartRef.current.getContext("2d");
      const caGradient = ctx.createLinearGradient(0, 0, 0, 400);
      caGradient.addColorStop(0, chartColors.indigo.gradient[0]);
      caGradient.addColorStop(1, chartColors.indigo.gradient[1]);

      const fraisGradient = ctx.createLinearGradient(0, 0, 0, 400);
      fraisGradient.addColorStop(0, chartColors.amber.gradient[0]);
      fraisGradient.addColorStop(1, chartColors.amber.gradient[1]);

      chartInstance.current = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Missions",
              data: chartData.caData,
              backgroundColor: caGradient,
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.7,
              categoryPercentage: 0.8,
            },
            {
              label: "Frais",
              data: chartData.fraisData,
              backgroundColor: fraisGradient,
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.7,
              categoryPercentage: 0.8,
            },
          ],
        },
        options: {
          ...chartOptions,
          onHover: (e, activeElements) => {
            e.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
          },
        },
      });

      setChartLoaded(true);
    };

    initChart();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartData]);

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 150);
    return () => clearTimeout(t);
  }, [topClients]);

  const patronColorMap = useMemo(() => {
    const map = {};
    patrons.forEach((p, i) => {
      map[p.id] =
        p.couleur ||
        ["#8B5CF6", "#10B981", "#F59E0B", "#06B6D4", "#F472B6", "#EF4444", "#3B82F6", "#84CC16"][i % 8];
    });
    return map;
  }, [patrons]);

  const maxClientCA = topClients[0]?.ca || 1;
  const maxWeekCA = Math.max(...previousWeeks.map((w) => w.ca), bilanSemaine.caWeek, 1);

  return (
    <div
      className="geo-dash"
      style={{
        fontFamily: "'Syne', sans-serif",
        color: "#fff",
        padding: "0 0 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "18px 0 16px",
          borderBottom: "1px solid rgba(212,175,55,0.2)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            fontWeight: 700,
          }}
        >
          Dashboard {profile?.prenom || ""}
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            color: "rgba(255,255,255,0.45)",
            padding: "6px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          Semaine {currentWeek} · {currentYear}
        </div>
      </div>

      {patrons.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Patron
          </span>

          <select
            value={selectedPatronId || ""}
            onChange={(e) => setSelectedPatronId(e.target.value || null)}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: selectedPatronId ? "#D4AF37" : "rgba(255,255,255,0.7)",
              background: "rgba(10,22,40,0.9)",
              border: `1px solid ${selectedPatronId ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "12px",
              padding: "8px 36px 8px 14px",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(212,175,55,0.6)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              transition: "border-color 0.2s, color 0.2s",
              minWidth: "180px",
            }}
          >
            <option value="" style={{ background: "#0A1628", color: "#fff" }}>
              Tous les patrons
            </option>
            {patrons.map((p) => (
              <option key={p.id} value={p.id} style={{ background: "#0A1628", color: "#fff" }}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: kmEnabled ? "repeat(auto-fit, minmax(175px, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <KPICard
          icon="💶"
          label="CA cette semaine"
          value={formatEuro(kpis.ca.value)}
          delta={kpis.ca.delta}
          accentColor="gold"
          delay={0}
          ariaLabel={`Chiffre d'affaires: ${formatEuro(kpis.ca.value)}`}
        />

        <KPICard
          icon="⏱"
          label="Heures travaillées"
          value={formatHeures(kpis.hours.value)}
          delta={kpis.hours.delta}
          accentColor="indigo"
          delay={100}
          ariaLabel={`${formatHeures(kpis.hours.value)} travaillées`}
        />

        <KPICard
          icon="✓"
          label="Missions"
          value={kpis.missionsCount}
          delta={null}
          accentColor="emerald"
          delay={200}
          ariaLabel={`${kpis.missionsCount} missions cette semaine`}
        />

        <KPICard
          icon="📍"
          label="Taux horaire"
          value={kpis.avgRate > 0 ? `${Math.round(kpis.avgRate * 10) / 10}€` : "—"}
          delta={null}
          accentColor="cyan"
          delay={300}
          ariaLabel={`Taux horaire moyen: ${kpis.avgRate.toFixed(2)} euros`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 260px",
          gap: "16px",
          marginBottom: "24px",
        }}
        className="dashboard-grid"
      >
        <div
          style={{
            background: tokens.colors.bg.surface,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              CA mensuel <span style={{ color: "#D4AF37" }}>(3 mois)</span>
            </span>

            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: chartColors.indigo.primary, display: "inline-block" }} aria-hidden="true" />
                Missions
              </span>

              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: chartColors.amber.primary, display: "inline-block" }} aria-hidden="true" />
                Frais
              </span>
            </div>
          </div>

          <div style={{ position: "relative", height: "140px", width: "100%" }}>
            {!chartLoaded && <div className="skeleton" style={{ position: "absolute", inset: 0, borderRadius: "12px" }} aria-label="Chargement du graphique" />}
            <canvas ref={chartRef} role="img" aria-label="Graphique du chiffre d'affaires sur 3 mois" />
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.bg.surface,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "16px",
            }}
          >
            Frais <span style={{ color: "#D4AF37" }}>kilométriques</span>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "18px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                fontSize: "8px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "rgba(16,185,129,0.7)",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "6px",
                padding: "2px 6px",
              }}
            >
              KM
            </div>

            <span style={{ fontSize: "18px", lineHeight: 1 }}>🚗</span>

            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.35)",
                marginTop: "2px",
              }}
            >
              Frais km
            </span>

            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "22px",
                fontWeight: 600,
                color: kmThisWeek.totalAmount > 0 ? "#10B981" : "rgba(255,255,255,0.25)",
                lineHeight: 1.1,
              }}
            >
              {kmThisWeek.totalAmount > 0 ? formatEuro(kmThisWeek.totalAmount) : "—"}
            </span>

            {kmThisWeek.totalKm > 0 && (
              <span style={{ fontSize: "10px", color: "rgba(16,185,129,0.6)", fontFamily: "'DM Mono', monospace" }}>
                {Math.round(kmThisWeek.totalKm)} km
              </span>
            )}

            <div
              style={{
                marginTop: "8px",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                fontSize: "11px",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.6,
              }}
            >
              {kmEnabled ? "Calcul basé sur les missions de la semaine en cours." : "Le kilométrage n'est pas activé dans les paramètres."}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${tokens.colors.bg.surfaceElevated}, ${tokens.colors.bg.surface})`,
            border: `1px solid ${tokens.colors.gold.glow}`,
            borderRadius: "20px",
            padding: "20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "14px",
            }}
          >
            Bilan <span style={{ color: "#D4AF37" }}>semaine {currentWeek}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Missions</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{formatEuro(bilanSemaine.caWeek)}</span>
          </div>

          {bilanSemaine.fraisWeek > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Frais divers</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: chartColors.amber.primary }}>+{formatEuro(bilanSemaine.fraisWeek)}</span>
            </div>
          )}

          {kmEnabled && bilanSemaine.kmWeek > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Frais km</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "#10B981" }}>+{formatEuro(bilanSemaine.kmWeek)}</span>
            </div>
          )}

          {bilanSemaine.acomptesWeek > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Acomptes reçus</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: chartColors.cyan.primary }}>-{formatEuro(bilanSemaine.acomptesWeek)}</span>
            </div>
          )}

          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: `1px solid ${tokens.colors.gold.glow}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.18em", color: "#D4AF37", fontWeight: 700 }}>Reste à percevoir</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "20px", fontWeight: 600, color: "#D4AF37" }}>{formatEuro(bilanSemaine.resteApercevoir)}</span>
          </div>
          {totalImpayesDB > 0 && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: `1px solid ${tokens.colors.gold.glow}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.18em", color: "#F97316", fontWeight: 700 }}>
                Total à percevoir (impayés inclus)
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "20px", fontWeight: 600, color: "#F97316" }}>
                {formatEuro(totalImpayesDB)}
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            background: tokens.colors.bg.surface,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "14px",
            }}
          >
            Top clients <span style={{ color: "#D4AF37" }}>(CA cumulé)</span>
          </div>

          {topClients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              Aucun client trouvé
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topClients.map((c, i) => {
                const pct = Math.round((c.ca / maxClientCA) * 100);
                const colors = [
                  chartColors.indigo.primary,
                  chartColors.emerald.primary,
                  chartColors.amber.primary,
                  chartColors.cyan.primary,
                  "#F472B6",
                ];

                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "60%",
                        }}
                      >
                        {c.name}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                        {Math.round(c.ca).toLocaleString("fr-FR")} €
                      </span>
                    </div>

                    <div style={{ height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "4px",
                          width: barsReady ? pct + "%" : "0%",
                          background: colors[i % colors.length],
                          transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
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

        <div
          style={{
            background: tokens.colors.bg.surface,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "14px",
            }}
          >
            Semaines <span style={{ color: "#D4AF37" }}>précédentes</span>
          </div>

          {previousWeeks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              Aucune donnée
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {previousWeeks.map((w, idx) => {
                const barPct = Math.round((w.ca / maxWeekCA) * 100);
                const hasData = w.ca > 0 || w.missionsCount > 0;
                const hasDetails = w.frais > 0 || (kmEnabled && w.km > 0) || w.acomptes > 0;

                return (
                  <div
                    key={w.weekNum}
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.05)",
                      opacity: hasData ? 1 : 0.4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 12px",
                        background: idx === 0 ? "rgba(212,175,55,0.04)" : "transparent",
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: idx === 0 ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${idx === 0 ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.07)"}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", lineHeight: 1 }}>S</span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            lineHeight: 1,
                            fontFamily: "'DM Mono', monospace",
                            color: idx === 0 ? "#D4AF37" : "rgba(255,255,255,0.55)",
                          }}
                        >
                          {w.weekNum}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginBottom: "5px" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "2px",
                              width: barsReady ? barPct + "%" : "0%",
                              background:
                                idx === 0
                                  ? "linear-gradient(90deg, #D4AF37, #F5D06A)"
                                  : `linear-gradient(90deg, ${chartColors.indigo.primary}, rgba(79,70,229,0.3))`,
                              transition: `width ${0.5 + idx * 0.08}s cubic-bezier(0.16, 1, 0.3, 1)`,
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: hasData ? "#fff" : "rgba(255,255,255,0.2)",
                            }}
                          >
                            {formatEuro(w.ca)}
                          </span>
                          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>·</span>
                          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{formatHeures(w.hours)}</span>
                          {w.missionsCount > 0 && (
                            <>
                              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>·</span>
                              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>{w.missionsCount}×</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {w.reste > 0.01 ? (
                          <div
                            style={{
                              fontSize: "10px",
                              fontFamily: "'DM Mono', monospace",
                              color: "#F59E0B",
                              fontWeight: 600,
                              background: "rgba(245,158,11,0.08)",
                              border: "1px solid rgba(245,158,11,0.18)",
                              borderRadius: "6px",
                              padding: "2px 7px",
                            }}
                          >
                            {formatEuro(w.reste)}
                          </div>
                        ) : w.ca > 0 ? (
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#10B981",
                              background: "rgba(16,185,129,0.08)",
                              border: "1px solid rgba(16,185,129,0.18)",
                              borderRadius: "6px",
                              padding: "2px 7px",
                            }}
                          >
                            ✓ payé
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {hasData && hasDetails && (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "4px 12px 7px 54px",
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                          flexWrap: "wrap",
                        }}
                      >
                        {w.frais > 0 && (
                          <span style={{ fontSize: "9px", color: chartColors.amber.primary, fontFamily: "'DM Mono', monospace" }}>
                            +{formatEuro(w.frais)} frais
                          </span>
                        )}

                        {kmEnabled && w.km > 0 && (
                          <span style={{ fontSize: "9px", color: "#10B981", fontFamily: "'DM Mono', monospace" }}>
                            🚗 {formatEuro(w.km)}
                            {w.kmKm > 0 ? ` · ${Math.round(w.kmKm)}km` : ""}
                          </span>
                        )}

                        {w.acomptes > 0 && (
                          <span style={{ fontSize: "9px", color: chartColors.cyan.primary, fontFamily: "'DM Mono', monospace" }}>
                            -{formatEuro(w.acomptes)} acompte
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              borderRadius: "12px",
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: chartColors.emerald.primary,
                fontWeight: 700,
              }}
            >
              CA total cumulé
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "15px", color: chartColors.emerald.primary, fontWeight: 600 }}>
              {formatEuro(filteredMissions.reduce((s, m) => s + (m.montant || 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

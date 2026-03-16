import React, { useMemo } from "react";

function formatCurrency(value) {
  const safe = Number(value || 0);
  return safe.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatLongDate(date = new Date()) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function isSameWeek(a, b = new Date()) {
  if (!a) return false;
  const da = new Date(a);
  return getWeekNumber(da) === getWeekNumber(b) && da.getFullYear() === b.getFullYear();
}

function isSameMonth(a, b = new Date()) {
  if (!a) return false;
  const da = new Date(a);
  return da.getMonth() === b.getMonth() && da.getFullYear() === b.getFullYear();
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmount(item) {
  const candidates = [
    item?.montant,
    item?.amount,
    item?.total,
    item?.prix,
    item?.tarif,
    item?.rate,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function parseHours(item) {
  const candidates = [
    item?.duree_heures,
    item?.hours,
    item?.heures,
    item?.duration_hours,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }

  const start = item?.heure_debut || item?.start_time;
  const end = item?.heure_fin || item?.end_time;

  if (start && end) {
    const [sh, sm] = String(start).split(":").map(Number);
    const [eh, em] = String(end).split(":").map(Number);
    if (![sh, sm, eh, em].some(Number.isNaN)) {
      return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
    }
  }

  return 0;
}

function missionDate(mission) {
  return (
    mission?.date_iso ||
    mission?.date ||
    mission?.start_date ||
    mission?.created_at ||
    null
  );
}

function eventDateLabel(date) {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function eventTimeLabel(date) {
  if (!date) return "";
  const h = date.getHours();
  const m = date.getMinutes();
  if (h === 0 && m === 0) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({ title, accent = "from-yellow-500/40 to-transparent", children, rightLabel }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07162d]/95 shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden">
      <div className={`h-[2px] w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-[12px] font-black tracking-[0.24em] uppercase text-white/55">
            {title}
          </h3>
          {rightLabel ? (
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#D4AF37]">
              {rightLabel}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, sub, accent }) {
  return (
    <Card title={title} accent={accent}>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-lg shadow-inner">
        {icon}
      </div>
      <div className="text-[19px] font-black tracking-wide text-white">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-white/45">
        {sub}
      </div>
    </Card>
  );
}

export function DashboardPanel({
  missions = [],
  fraisDivers = [],
  listeAcomptes = [],
  patrons = [],
  profile = {},
}) {
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const todayLabel = formatLongDate(now);

  const metrics = useMemo(() => {
    const weekMissions = missions.filter((m) => isSameWeek(missionDate(m), now));
    const monthMissions = missions.filter((m) => isSameMonth(missionDate(m), now));
    const weekFrais = fraisDivers.filter((f) => isSameWeek(f?.date || f?.date_iso || f?.created_at, now));

    const caWeek = weekMissions.reduce((sum, m) => sum + parseAmount(m), 0);
    const hoursWeek = weekMissions.reduce((sum, m) => sum + parseHours(m), 0);
    const missionCountWeek = weekMissions.length;
    const tauxMoyen = hoursWeek > 0 ? caWeek / hoursWeek : 0;
    const kmWeek = weekFrais
      .filter((f) => /km|kilom/i.test(String(f?.description || f?.libelle || f?.nom || "")))
      .reduce((sum, f) => {
        const km = Number(f?.kilometres || f?.km || f?.distance || 0);
        return sum + (Number.isNaN(km) ? 0 : km);
      }, 0);

    const kmAmountWeek = weekFrais
      .filter((f) => /km|kilom/i.test(String(f?.description || f?.libelle || f?.nom || "")))
      .reduce((sum, f) => sum + parseAmount(f), 0);

    const totalAcomptes = listeAcomptes
      .filter((a) => isSameMonth(a?.date || a?.date_iso || a?.created_at, now))
      .reduce((sum, a) => sum + parseAmount(a), 0);

    const monthlyRevenue = {};
    const monthlyFrais = {};

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyRevenue[key] = 0;
      monthlyFrais[key] = 0;
    }

    monthMissions.forEach(() => {});

    missions.forEach((m) => {
      const d = toDateSafe(missionDate(m));
      if (!d) return;
      const diffMonths =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + parseAmount(m);
      }
    });

    fraisDivers.forEach((f) => {
      const d = toDateSafe(f?.date || f?.date_iso || f?.created_at);
      if (!d) return;
      const diffMonths =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyFrais[key] = (monthlyFrais[key] || 0) + parseAmount(f);
      }
    });

    const chartData = [];
    let maxValue = 0;

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const missionsValue = monthlyRevenue[key] || 0;
      const fraisValue = monthlyFrais[key] || 0;
      maxValue = Math.max(maxValue, missionsValue, fraisValue);
      chartData.push({
        label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
        missions: missionsValue,
        frais: fraisValue,
      });
    }

    const patronsMap = new Map(patrons.map((p) => [String(p.id), p.nom || p.name || "Sans nom"]));
    const topClientsMap = new Map();

    missions.forEach((m) => {
      const label =
        m?.client ||
        m?.client_nom ||
        m?.nom_client ||
        patronsMap.get(String(m?.patron_id)) ||
        "Sans client";
      topClientsMap.set(label, (topClientsMap.get(label) || 0) + parseAmount(m));
    });

    const topClients = Array.from(topClientsMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    const previousWeeks = [];
    for (let i = 1; i <= 4; i += 1) {
      const ref = new Date(now);
      ref.setDate(now.getDate() - i * 7);
      const total = missions
        .filter((m) => isSameWeek(missionDate(m), ref))
        .reduce((sum, m) => sum + parseAmount(m), 0);
      previousWeeks.push({
        label: `Semaine ${getWeekNumber(ref)}`,
        total,
      });
    }

    const nextEvents = missions
      .map((m) => {
        const d = toDateSafe(missionDate(m));
        if (!d) return null;
        return {
          id: `${m?.id || m?.date_iso || Math.random()}`,
          date: d,
          title:
            m?.libelle ||
            m?.titre ||
            m?.client ||
            m?.client_nom ||
            m?.lieu ||
            "Mission",
          subtitle:
            m?.lieu ||
            m?.adresse ||
            m?.client ||
            m?.client_nom ||
            "",
        };
      })
      .filter((e) => e && startOfDay(e.date) >= startOfDay(now))
      .sort((a, b) => a.date - b.date)
      .slice(0, 3);

    return {
      caWeek,
      hoursWeek,
      missionCountWeek,
      tauxMoyen,
      kmWeek,
      kmAmountWeek,
      totalAcomptes,
      chartData,
      maxChart: maxValue || 1,
      topClients,
      previousWeeks,
      nextEvents,
    };
  }, [missions, fraisDivers, listeAcomptes, patrons]);

  const principalTrip =
    metrics.nextEvents[0]?.subtitle
      ? `Domicile → ${metrics.nextEvents[0].subtitle}`
      : "Domicile → Studio";

  return (
    <div className="space-y-5">
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <div className="text-[14px] font-black uppercase tracking-[0.22em] text-white/75">
          Dashboard
        </div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
          {todayLabel}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/35">
          Patron
        </span>
        <div className="rounded-full border border-white/10 px-4 py-2 text-[13px] text-white/75">
          Tous
        </div>
        {patrons.slice(0, 2).map((p, idx) => (
          <div
            key={p.id || idx}
            className={`rounded-full border px-4 py-2 text-[13px] ${
              idx === 1
                ? "border-[#D4AF37]/60 text-[#D4AF37]"
                : "border-white/10 text-white/75"
            }`}
          >
            {p.nom || p.name}
          </div>
        ))}
        <div className="ml-auto rounded-full border border-white/10 px-4 py-2 text-[12px] text-white/45">
          {`Semaine ${currentWeek} · ${now.getFullYear()}`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          icon="💶"
          title="CA CETTE SEMAINE"
          value={formatCurrency(metrics.caWeek)}
          sub={metrics.caWeek > 0 ? "activité en cours" : "aucun chiffre cette semaine"}
          accent="from-[#D4AF37]/90 via-[#D4AF37]/20 to-transparent"
        />
        <StatCard
          icon="⏱️"
          title="HEURES TRAVAILLÉES"
          value={`${metrics.hoursWeek.toFixed(2).replace(".", ",")} h`}
          sub={metrics.hoursWeek > 0 ? "temps cumulé cette semaine" : "aucune heure enregistrée"}
          accent="from-violet-500/90 via-violet-500/20 to-transparent"
        />
        <StatCard
          icon="✓"
          title="MISSIONS CETTE SEM."
          value={String(metrics.missionCountWeek)}
          sub={metrics.missionCountWeek > 0 ? "missions planifiées / réalisées" : "aucune mission"}
          accent="from-emerald-400/90 via-emerald-400/20 to-transparent"
        />
        <StatCard
          icon="📍"
          title="TAUX HORAIRE MOYEN"
          value={metrics.tauxMoyen > 0 ? formatCurrency(metrics.tauxMoyen) : "—"}
          sub={metrics.tauxMoyen > 0 ? "sur les missions de la semaine" : "aucune heure"}
          accent="from-cyan-400/90 via-cyan-400/20 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_0.75fr]">
        <Card
          title="CA MENSUEL (6 DERNIERS MOIS)"
          accent="from-[#D4AF37]/40 to-transparent"
          rightLabel="MISSIONS   FRAIS"
        >
          <div className="flex h-[210px] items-end gap-5 pt-4">
            {metrics.chartData.map((item) => {
              const missionHeight = Math.max(8, (item.missions / metrics.maxChart) * 150);
              const fraisHeight = Math.max(4, (item.frais / metrics.maxChart) * 50);

              return (
                <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-3">
                  <div className="flex h-[165px] items-end gap-2">
                    <div
                      className="w-12 rounded-t-[10px] bg-violet-600/85 shadow-[0_0_20px_rgba(124,58,237,0.25)]"
                      style={{ height: `${missionHeight}px` }}
                    />
                    <div
                      className="w-3 rounded-t-[6px] bg-[#D4AF37]/80"
                      style={{ height: `${fraisHeight}px` }}
                    />
                  </div>
                  <span className="text-[12px] text-white/45">{item.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="AGENDA À VENIR"
          accent="from-cyan-400/60 to-transparent"
          rightLabel={`${metrics.nextEvents.length} ÉVÉNEMENTS`}
        >
          {metrics.nextEvents.length > 0 ? (
            <div className="space-y-4">
              {metrics.nextEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[14px] font-bold text-white">{event.title}</div>
                  <div className="mt-1 text-[12px] uppercase tracking-[0.16em] text-[#D4AF37]">
                    {eventDateLabel(event.date)}
                    {eventTimeLabel(event.date) ? ` · ${eventTimeLabel(event.date)}` : ""}
                  </div>
                  {event.subtitle ? (
                    <div className="mt-2 text-[12px] text-white/45">{event.subtitle}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[210px] flex-col items-center justify-center text-center">
              <div className="text-[15px] font-bold text-white/80">
                Aucun événement à venir
              </div>
              <div className="mt-2 max-w-[220px] text-[13px] leading-relaxed text-white/40">
                Ton agenda est dégagé pour le moment.
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          title="FRAIS KILOMÉTRIQUES"
          accent="from-[#D4AF37]/50 to-transparent"
          rightLabel="SEMAINE"
        >
          <div className="space-y-5">
            <div className="border-b border-white/8 pb-4">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/35">
                Kilomètres
              </div>
              <div className="mt-2 text-[28px] font-black text-white">
                {`${Number(metrics.kmWeek || 0).toLocaleString("fr-FR")} km`}
              </div>
              <div className="mt-1 text-[12px] text-white/40">
                parcourus cette semaine
              </div>
            </div>

            <div className="border-b border-white/8 pb-4">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/35">
                Montant estimé
              </div>
              <div className="mt-2 text-[24px] font-black text-[#D4AF37]">
                {formatCurrency(metrics.kmAmountWeek)}
              </div>
              <div className="mt-1 text-[12px] text-white/40">
                de frais estimés
              </div>
            </div>

            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/35">
                Trajet principal
              </div>
              <div className="mt-2 text-[14px] font-semibold text-white/85">
                {principalTrip}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="TOP CLIENTS"
          accent="from-violet-500/60 to-transparent"
          rightLabel="CA CUMULÉ"
        >
          <div className="space-y-4">
            {metrics.topClients.length > 0 ? (
              metrics.topClients.map((client, index) => {
                const max = metrics.topClients[0]?.total || 1;
                const width = Math.max(12, (client.total / max) * 100);
                const barClass =
                  index === 0
                    ? "bg-violet-500"
                    : index === 1
                    ? "bg-emerald-400"
                    : index === 2
                    ? "bg-[#D4AF37]"
                    : "bg-cyan-400";

                return (
                  <div key={client.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[14px] text-white/85">{client.name}</span>
                      <span className="text-[13px] font-semibold text-white/55">
                        {formatCurrency(client.total)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/8">
                      <div
                        className={`h-1.5 rounded-full ${barClass}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-[210px] items-center justify-center text-[13px] text-white/40">
                Aucune donnée client disponible.
              </div>
            )}
          </div>
        </Card>

        <Card
          title="SEMAINES"
          accent="from-emerald-400/50 to-transparent"
          rightLabel="PRÉCÉDENTES"
        >
          <div className="space-y-4">
            {metrics.previousWeeks.map((week) => (
              <div
                key={week.label}
                className="flex items-center justify-between border-b border-white/6 pb-3 last:border-b-0"
              >
                <span className="text-[14px] text-white/75">{week.label}</span>
                <span className="text-[15px] font-black text-[#D4AF37]">
                  {formatCurrency(week.total)}
                </span>
              </div>
            ))}

            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-4">
              <div className="text-[12px] uppercase tracking-[0.18em] text-emerald-300/70">
                CA total cumulé
              </div>
              <div className="mt-2 text-right text-[28px] font-black text-emerald-300">
                {formatCurrency(
                  metrics.previousWeeks.reduce((sum, w) => sum + w.total, 0)
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPanel;
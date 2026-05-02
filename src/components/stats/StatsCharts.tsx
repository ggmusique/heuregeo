import React, { useMemo } from "react";
import { formatEuro } from "../../utils/formatters";
import { useLabels } from "../../contexts/LabelsContext";

interface BarItem { label: string; value: number; tooltip?: string; }

function VerticalBars({ data, color, darkMode }: { data: BarItem[]; color: string; darkMode: boolean }) {
  const max = Math.max(...data.map((d) => d.value), 0.01);
  return (
    <div className="flex items-end gap-[2px] h-[56px]">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-[2px]">
          <div title={d.tooltip} className="w-full rounded-t-[3px] transition-all" style={{ height: `${Math.max(2, (d.value / max) * 52)}px`, background: color, opacity: 0.75 }} />
          <span className="text-[6px] font-black" style={{ opacity: 0.4, color: darkMode ? "#fff" : "#334155" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ items, color, formatVal, darkMode }: { items: { label: string; value: number }[]; color: string; formatVal: (v: number) => string; darkMode: boolean }) {
  const max = Math.max(...items.map((i) => i.value), 0.01);
  return (
    <div className="space-y-[6px]">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[9px] font-black truncate shrink-0 w-20 opacity-70" style={{ color: darkMode ? "#fff" : "#334155" }}>{item.label}</span>
          <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9" }}>
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: color, opacity: 0.8 }} />
          </div>
          <span className="text-[9px] font-black shrink-0 w-16 text-right opacity-70" style={{ color: darkMode ? "#fff" : "#334155" }}>{formatVal(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, children, darkMode }: { title: string; children: React.ReactNode; darkMode: boolean }) {
  return (
    <div className={`p-3 rounded-[18px] border ${darkMode ? "bg-white/4 border-white/8" : "bg-slate-50 border-slate-200"}`}>
      <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-50" style={{ color: darkMode ? "#fff" : "#334155" }}>{title}</p>
      {children}
    </div>
  );
}

interface Props {
  missions: any[];
  patrons: any[];
  effectivePatronId?: string | null;
  darkMode: boolean;
}

export function StatsCharts({ missions, patrons, effectivePatronId, darkMode }: Props) {
  const L = useLabels();

  const filtered = useMemo(
    () => effectivePatronId ? missions.filter((m) => m.patron_id === effectivePatronId) : missions,
    [missions, effectivePatronId]
  );

  const { monthlyCA, monthlyHours } = useMemo(() => {
    const byMonth: Record<string, { ca: number; hours: number }> = {};
    filtered.forEach((m) => {
      if (!m.date_iso) return;
      const month = m.date_iso.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { ca: 0, hours: 0 };
      byMonth[month].ca += m.montant || 0;
      byMonth[month].hours += m.duree || 0;
    });
    const keys = Object.keys(byMonth).sort().slice(-10);
    const monthLabel = (k: string) => new Date(`${k}-15`).toLocaleString("fr-FR", { month: "short" }).replace(".", "");
    return {
      monthlyCA:    keys.map((k) => ({ label: monthLabel(k), value: byMonth[k].ca,    tooltip: `${k} — ${formatEuro(byMonth[k].ca)}` })),
      monthlyHours: keys.map((k) => ({ label: monthLabel(k), value: byMonth[k].hours, tooltip: `${k} — ${byMonth[k].hours.toFixed(1)} h` })),
    };
  }, [filtered]);

  const topClients = useMemo(() => {
    const by: Record<string, number> = {};
    filtered.forEach((m) => { const name = m.client || "?"; by[name] = (by[name] || 0) + (m.montant || 0); });
    return Object.entries(by).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filtered]);

  const topPatrons = useMemo(() => {
    const by: Record<string, number> = {};
    filtered.forEach((m) => { const pNom = patrons.find((p) => p.id === m.patron_id)?.nom || "?"; by[pNom] = (by[pNom] || 0) + (m.montant || 0); });
    return Object.entries(by).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filtered, patrons]);

  if (filtered.length === 0) {
    return <div className="text-center py-4 opacity-50 text-xs font-bold">Aucune donnée à afficher.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="CA mensuel (€)" darkMode={darkMode}><VerticalBars data={monthlyCA} color="#6366f1" darkMode={darkMode} /></StatCard>
        <StatCard title="Heures / mois" darkMode={darkMode}><VerticalBars data={monthlyHours} color="#10b981" darkMode={darkMode} /></StatCard>
      </div>
      {topClients.length > 0 && (
        <StatCard title={`Top ${L.clients}`} darkMode={darkMode}>
          <HorizontalBars items={topClients} color="#3b82f6" formatVal={formatEuro} darkMode={darkMode} />
        </StatCard>
      )}
      {!effectivePatronId && topPatrons.length > 1 && (
        <StatCard title={`Top ${L.patrons}`} darkMode={darkMode}>
          <HorizontalBars items={topPatrons} color="#f59e0b" formatVal={formatEuro} darkMode={darkMode} />
        </StatCard>
      )}
    </div>
  );
}

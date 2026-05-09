import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

function parseDate(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d+$/.test(s)) {
    try {
      const d = (XLSX as unknown as { SSF: { parse_date_code: (n: number) => { y: number; m: number; d: number } | null } }).SSF.parse_date_code(Number(s));
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    } catch { /* ignore */ }
  }
  return null;
}

function parseTime(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  if (/^\d*\.\d+$/.test(s)) {
    const frac = parseFloat(s);
    const totalMin = Math.round(frac * 24 * 60);
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  }
  return null;
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function detectSep(line: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  for (const c of line) counts[c] = (counts[c] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsvText(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const sep = detectSep(lines[0]);
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
}

const HEADER_MAP: Record<string, string> = {
  date: "date", "date mission": "date",
  début: "debut", debut: "debut", "heure début": "debut", start: "debut",
  fin: "fin", "heure fin": "fin", end: "fin",
  pause: "pause", "pause (min)": "pause", break: "pause",
  patron: "patron", employeur: "patron", employer: "patron",
  client: "client",
  lieu: "lieu", location: "lieu", site: "lieu",
  tarif: "tarif", "tarif horaire": "tarif", rate: "tarif",
};

function mapHeaders(headerRow: string[]): (string | null)[] {
  return headerRow.map((h) => HEADER_MAP[String(h).toLowerCase().trim()] ?? null);
}

interface Props {
  show: boolean;
  onClose: () => void;
  onImport: (missions: any[]) => Promise<void>;
  patrons?: any[];
  clients?: any[];
  lieux?: any[];
  darkMode?: boolean;
}

export function ImportMissionsModal({ show, onClose, onImport, patrons = [], clients = [], lieux = [], darkMode = true }: Props) {
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<{ rows: any[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: number; message?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processRow = useCallback((rowObj: any, lineIndex: number) => {
    const errors: string[] = [];
    const dateIso = parseDate(rowObj.date);
    if (!dateIso) errors.push("Date invalide");
    const debut = parseTime(rowObj.debut);
    const fin   = parseTime(rowObj.fin);
    if (!debut) errors.push("Heure début invalide");
    if (!fin)   errors.push("Heure fin invalide");
    if (debut && fin && toMin(fin) <= toMin(debut)) errors.push("Fin ≤ Début");
    const pause = Math.max(0, parseInt(rowObj.pause ?? "0", 10) || 0);
    let duree = 0, montant = 0;
    if (debut && fin && toMin(fin) > toMin(debut)) {
      duree = parseFloat(((toMin(fin) - toMin(debut) - pause) / 60).toFixed(2));
      if (duree <= 0) errors.push("Durée nette ≤ 0 (pause trop longue ?)");
    }
    const tarif = parseFloat(String(rowObj.tarif ?? "0").replace(",", ".")) || 0;
    montant = parseFloat((duree * tarif).toFixed(2));
    const patronRaw = String(rowObj.patron ?? "").trim();
    const patron = patrons.find((p) => p.nom?.toLowerCase() === patronRaw.toLowerCase());
    if (!patronRaw) errors.push("Patron manquant");
    else if (!patron) errors.push(`Patron introuvable : "${patronRaw}"`);
    const clientRaw = String(rowObj.client ?? "").trim();
    const client = clients.find((c) => c.nom?.toLowerCase() === clientRaw.toLowerCase());
    if (!clientRaw) errors.push("Client manquant");
    else if (!client) errors.push(`Client introuvable : "${clientRaw}"`);
    const lieuRaw = String(rowObj.lieu ?? "").trim();
    const lieu = lieux.find((l) => l.nom?.toLowerCase() === lieuRaw.toLowerCase());
    if (!lieuRaw) errors.push("Lieu manquant");
    else if (!lieu) errors.push(`Lieu introuvable : "${lieuRaw}"`);
    const valid = errors.length === 0;
    return {
      line: lineIndex + 2,
      raw: rowObj,
      errors,
      valid,
      mission: valid ? { date_iso: dateIso, date_mission: dateIso, debut, fin, pause, duree, tarif, montant, patron_id: patron?.id, client_id: client?.id, client: clientRaw, lieu_id: lieu?.id, lieu: lieuRaw } : null,
    };
  }, [patrons, clients, lieux]);

  const parseRows = useCallback((matrix: string[][]) => {
    if (matrix.length < 2) return [];
    const headerRow  = matrix[0];
    const headerKeys = mapHeaders(headerRow);
    const rows: any[] = [];
    for (let i = 1; i < matrix.length; i++) {
      const rowArr = matrix[i];
      if (rowArr.every((c) => !c)) continue;
      const obj: any = {};
      headerKeys.forEach((key, j) => { if (key) obj[key] = rowArr[j] ?? ""; });
      rows.push(processRow(obj, i - 1));
    }
    return rows;
  }, [processRow]);

  const handleAnalysePaste = () => { setPreview({ rows: parseRows(parseCsvText(csvText)) }); setResult(null); };

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as string[][];
        setPreview({ rows: parseRows(matrix) });
        setResult(null);
      } catch { setPreview({ rows: [] }); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    const valid = preview.rows.filter((r) => r.valid).map((r) => r.mission);
    if (!valid.length) return;
    setImporting(true);
    try {
      await onImport(valid);
      setResult({ created: valid.length, errors: preview.rows.filter((r) => !r.valid).length });
      setPreview(null);
      setCsvText("");
    } catch (err: any) {
      setResult({ created: 0, errors: valid.length, message: err.message });
    } finally { setImporting(false); }
  };

  const handleClose = () => { setPreview(null); setCsvText(""); setResult(null); onClose(); };

  const validCount   = preview?.rows.filter((r) => r.valid).length  ?? 0;
  const invalidCount = preview?.rows.filter((r) => !r.valid).length ?? 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-3 bg-black/80 backdrop-blur-xl">
      <div className="w-full max-w-lg rounded-[32px] border-2 bg-[var(--color-field)] border-[var(--color-border-violet)] flex flex-col" style={{ maxHeight: "90dvh" }}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="font-black text-base uppercase tracking-tight">Import de missions</h2>
          <button onClick={handleClose} className="text-xl text-[var(--color-text-muted)] hover:opacity-100">✕</button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {result && (
            <div className={`p-4 rounded-2xl text-center ${result.created > 0 ? "bg-[var(--color-accent-green)]/15 border border-[var(--color-accent-green)]/30" : "bg-[var(--color-accent-red)]/15 border border-[var(--color-accent-red)]/30"}`}>
              {result.created > 0 ? <p className="font-black text-[var(--color-accent-green)]">✅ {result.created} mission(s) importée(s) !</p> : <p className="font-black text-[var(--color-accent-red)]">❌ Échec : {result.message}</p>}
              {result.errors > 0 && <p className="text-[10px] mt-1 text-[var(--color-text-muted)]">{result.errors} ligne(s) ignorée(s) (erreurs).</p>}
            </div>
          )}

          {!preview && !result && (
            <div className="p-3 rounded-2xl text-[9px] font-mono leading-relaxed border bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text-muted)]">
              <p className="font-black mb-1 text-[10px] not-italic opacity-80">Format attendu (séparateur ; ou , ou tabulation) :</p>
              <p>Date;Début;Fin;Pause;Patron;Client;Lieu;Tarif</p>
              <p>2026-03-01;08:00;17:00;60;Pierre;Mairie;Paris;15</p>
            </div>
          )}

          {!preview && !result && (
            <div className="flex bg-[var(--color-surface-offset)] rounded-2xl p-1">
              <button onClick={() => setMode("paste")} className={`flex-1 py-2.5 text-[11px] font-black rounded-xl ${mode === "paste" ? "bg-[var(--color-accent-violet)] text-[var(--color-bg)]" : "text-[var(--color-text-muted)]"}`}>Coller texte</button>
              <button onClick={() => setMode("upload")} className={`flex-1 py-2.5 text-[11px] font-black rounded-xl ${mode === "upload" ? "bg-[var(--color-accent-violet)] text-[var(--color-bg)]" : "text-[var(--color-text-muted)]"}`}>Fichier .xlsx/.csv</button>
            </div>
          )}

          {!preview && !result && mode === "paste" && (
            <>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={"Date;Début;Fin;Pause;Patron;Client;Lieu;Tarif\n2026-03-01;08:00;17:00;60;Pierre;Mairie;Paris;15"} rows={6} className="w-full p-3 rounded-2xl border text-[11px] font-mono resize-none focus:outline-none focus:border-indigo-400 bg-[var(--color-bg-input)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]" />
              <button onClick={handleAnalysePaste} disabled={!csvText.trim()} className="w-full py-3 rounded-2xl font-black uppercase text-[11px] bg-[var(--color-accent-violet)] text-[var(--color-bg)] disabled:opacity-30">Analyser</button>
            </>
          )}

          {!preview && !result && mode === "upload" && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <button onClick={() => fileRef.current?.click()} className="w-full py-8 rounded-2xl border-2 border-dashed font-black text-[11px] uppercase transition-colors border-[var(--color-border)] hover:border-indigo-400 text-[var(--color-text-muted)] hover:text-indigo-400">📂 Choisir un fichier .xlsx ou .csv</button>
            </>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex gap-2 text-[10px] font-black">
                <span className="text-[var(--color-accent-green)]">✅ {validCount} valide(s)</span>
                {invalidCount > 0 && <span className="text-[var(--color-accent-red)]">❌ {invalidCount} erreur(s)</span>}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/8" style={{ maxHeight: "280px" }}>
                <table className="w-full text-[9px]">
                  <thead><tr className="bg-[var(--color-surface-offset)]">{["Ligne","Date","Début","Fin","Patron","Client","Lieu","H","€","Statut"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-black opacity-60 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i} className={`border-t border-[var(--color-border)] ${r.valid ? "" : "bg-red-500/8"}`}>
                        <td className="px-2 py-1 font-black opacity-40">{r.line}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{r.mission?.date_iso ?? r.raw.date ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission?.debut ?? r.raw.debut ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission?.fin   ?? r.raw.fin   ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.patron ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.client ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.lieu   ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission ? r.mission.duree.toFixed(1) : "—"}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{r.mission ? `${r.mission.montant.toFixed(0)}€` : "—"}</td>
                        <td className="px-2 py-1">{r.valid ? <span className="text-[var(--color-accent-green)] font-black">✅</span> : <span className="text-[var(--color-accent-red)]" title={r.errors.join(" | ")}>❌</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invalidCount > 0 && (
                <div className="p-3 rounded-2xl border text-[9px] space-y-0.5 bg-red-500/8 border-red-500/20">
                  {preview.rows.filter((r) => !r.valid).map((r, i) => (
                    <p key={i} className="text-[var(--color-accent-red)]"><span className="font-black">Ligne {r.line} :</span> {r.errors.join(" · ")}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
          {preview ? (
            <>
              <button onClick={() => { setPreview(null); setResult(null); }} className="flex-1 py-3 font-black uppercase text-[10px] rounded-2xl bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]">Retour</button>
              <button onClick={handleImport} disabled={validCount === 0 || importing} className="flex-1 py-3 font-black uppercase text-[10px] rounded-2xl bg-gradient-to-r from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)] text-white disabled:opacity-30">{importing ? "Import…" : `Importer ${validCount} mission(s)`}</button>
            </>
          ) : result ? (
            <button onClick={handleClose} className="w-full py-3 font-black uppercase text-[10px] rounded-2xl bg-gradient-to-r from-[var(--color-accent-green)] to-[color-mix(in_srgb,var(--color-accent-green)_60%,var(--color-accent-cyan))] text-white">Fermer</button>
          ) : (
            <button onClick={handleClose} className="w-full py-3 font-black uppercase text-[10px] rounded-2xl bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]">Annuler</button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise une date vers YYYY-MM-DD, accepte DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY */
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Excel serial number
  if (/^\d+$/.test(s)) {
    try {
      const d = XLSX.SSF.parse_date_code(Number(s));
      if (d) {
        const y  = d.y;
        const mo = String(d.m).padStart(2, "0");
        const da = String(d.d).padStart(2, "0");
        return `${y}-${mo}-${da}`;
      }
    } catch { /* ignore */ }
  }
  return null;
}

/** Normalise une heure vers HH:MM */
function parseTime(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  // Excel fraction (0.375 = 09:00)
  if (/^\d*\.\d+$/.test(s)) {
    const frac = parseFloat(s);
    const totalMin = Math.round(frac * 24 * 60);
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  }
  return null;
}

/** Convertit une heure HH:MM en minutes */
function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Détecte le séparateur CSV */
function detectSep(line) {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  for (const c of line) counts[c] = (counts[c] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Parse le texte CSV/TSV → tableau de tableaux */
function parseCsvText(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const sep = detectSep(lines[0]);
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
}

// En-têtes acceptés (lowercase)
const HEADER_MAP = {
  date: "date", "date mission": "date",
  début: "debut", debut: "debut", "heure début": "debut", start: "debut",
  fin: "fin", "heure fin": "fin", end: "fin",
  pause: "pause", "pause (min)": "pause", break: "pause",
  patron: "patron", employeur: "patron", employer: "patron",
  client: "client",
  lieu: "lieu", location: "lieu", site: "lieu",
  tarif: "tarif", "tarif horaire": "tarif", rate: "tarif",
};

/** Transforme les headers bruts en clés normalisées */
function mapHeaders(headerRow) {
  return headerRow.map((h) => HEADER_MAP[String(h).toLowerCase().trim()] ?? null);
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function ImportMissionsModal({
  show,
  onClose,
  onImport,   // async (validMissions) => void
  patrons = [],
  clients = [],
  lieux   = [],
  darkMode = true,
}) {
  const [mode,     setMode]     = useState("paste");  // "paste" | "upload"
  const [csvText,  setCsvText]  = useState("");
  const [preview,  setPreview]  = useState(null);     // { rows: ParsedRow[] } | null
  const [importing, setImporting] = useState(false);
  const [result,   setResult]   = useState(null);     // { created, errors }
  const fileRef = useRef(null);

  // ── Normalise & valide une ligne ─────────────────────────────────────────
  const processRow = useCallback((rowObj, lineIndex) => {
    const errors = [];
    const warnings = [];

    // Date
    const dateIso = parseDate(rowObj.date);
    if (!dateIso) errors.push("Date invalide");

    // Horaires
    const debut = parseTime(rowObj.debut);
    const fin   = parseTime(rowObj.fin);
    if (!debut)      errors.push("Heure début invalide");
    if (!fin)        errors.push("Heure fin invalide");
    if (debut && fin && toMin(fin) <= toMin(debut)) errors.push("Fin ≤ Début");

    // Pause
    const pause = Math.max(0, parseInt(rowObj.pause ?? "0", 10) || 0);

    // Durée
    let duree = 0, montant = 0;
    if (debut && fin && toMin(fin) > toMin(debut)) {
      duree = parseFloat(((toMin(fin) - toMin(debut) - pause) / 60).toFixed(2));
      if (duree <= 0) errors.push("Durée nette ≤ 0 (pause trop longue ?)");
    }

    // Tarif
    const tarif = parseFloat(String(rowObj.tarif ?? "0").replace(",", ".")) || 0;
    montant = parseFloat((duree * tarif).toFixed(2));

    // Patron
    const patronRaw = String(rowObj.patron ?? "").trim();
    const patron = patrons.find((p) => p.nom?.toLowerCase() === patronRaw.toLowerCase());
    if (!patronRaw) errors.push("Patron manquant");
    else if (!patron) errors.push(`Patron introuvable : "${patronRaw}"`);

    // Client
    const clientRaw = String(rowObj.client ?? "").trim();
    const client = clients.find((c) => c.nom?.toLowerCase() === clientRaw.toLowerCase());
    if (!clientRaw) errors.push("Client manquant");
    else if (!client) errors.push(`Client introuvable : "${clientRaw}"`);

    // Lieu
    const lieuRaw = String(rowObj.lieu ?? "").trim();
    const lieu = lieux.find((l) => l.nom?.toLowerCase() === lieuRaw.toLowerCase());
    if (!lieuRaw) errors.push("Lieu manquant");
    else if (!lieu) errors.push(`Lieu introuvable : "${lieuRaw}"`);

    const valid = errors.length === 0;

    return {
      line: lineIndex + 2,  // 1-based + header
      raw: rowObj,
      errors,
      valid,
      mission: valid
        ? {
            date_iso:   dateIso,
            date_mission: dateIso,
            debut,
            fin,
            pause,
            duree,
            tarif,
            montant,
            patron_id: patron?.id,
            client_id: client?.id,
            client:    clientRaw,
            lieu_id:   lieu?.id,
            lieu:      lieuRaw,
          }
        : null,
    };
  }, [patrons, clients, lieux]);

  // ── Parse depuis tableaux de tableaux ────────────────────────────────────
  const parseRows = useCallback((matrix) => {
    if (matrix.length < 2) return [];
    const headerRow  = matrix[0];
    const headerKeys = mapHeaders(headerRow);

    const rows = [];
    for (let i = 1; i < matrix.length; i++) {
      const rowArr = matrix[i];
      if (rowArr.every((c) => !c)) continue; // skip empty lines
      const obj = {};
      headerKeys.forEach((key, j) => {
        if (key) obj[key] = rowArr[j] ?? "";
      });
      rows.push(processRow(obj, i - 1));
    }
    return rows;
  }, [processRow]);

  // ── Analyser CSV texte ───────────────────────────────────────────────────
  const handleAnalysePaste = () => {
    const matrix = parseCsvText(csvText);
    setPreview({ rows: parseRows(matrix) });
    setResult(null);
  };

  // ── Analyser fichier ─────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        setPreview({ rows: parseRows(matrix) });
        setResult(null);
      } catch {
        setPreview({ rows: [] });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Importer ─────────────────────────────────────────────────────────────
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
    } catch (err) {
      setResult({ created: 0, errors: valid.length, message: err.message });
    } finally {
      setImporting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    setPreview(null);
    setCsvText("");
    setResult(null);
    onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const card   = darkMode ? "bg-[#0f111a] border-white/10" : "bg-white border-slate-200";
  const muted  = darkMode ? "text-white/50" : "text-slate-500";
  const input  = darkMode ? "bg-black/30 border-white/10 text-white placeholder-white/25" : "bg-slate-50 border-slate-200 text-slate-900";

  const validCount   = preview?.rows.filter((r) => r.valid).length  ?? 0;
  const invalidCount = preview?.rows.filter((r) => !r.valid).length ?? 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-3 bg-black/80 backdrop-blur-xl">
      <div className={`w-full max-w-lg rounded-[32px] border-2 ${card} flex flex-col`} style={{ maxHeight: "90dvh" }}>

        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="font-black text-base uppercase tracking-tight">
            Import de missions
          </h2>
          <button onClick={handleClose} className={`text-xl ${muted} hover:opacity-100`}>✕</button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">

          {/* Résultat */}
          {result && (
            <div className={`p-4 rounded-2xl text-center ${result.created > 0 ? "bg-green-500/15 border border-green-500/30" : "bg-red-500/15 border border-red-500/30"}`}>
              {result.created > 0
                ? <p className="font-black text-green-400">✅ {result.created} mission(s) importée(s) !</p>
                : <p className="font-black text-red-400">❌ Échec : {result.message}</p>}
              {result.errors > 0 && <p className={`text-[10px] mt-1 ${muted}`}>{result.errors} ligne(s) ignorée(s) (erreurs).</p>}
            </div>
          )}

          {/* Format attendu */}
          {!preview && !result && (
            <div className={`p-3 rounded-2xl text-[9px] font-mono leading-relaxed border ${darkMode ? "bg-white/3 border-white/8 text-white/50" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <p className="font-black mb-1 text-[10px] not-italic opacity-80">Format attendu (séparateur ; ou , ou tabulation) :</p>
              <p>Date;Début;Fin;Pause;Patron;Client;Lieu;Tarif</p>
              <p>2026-03-01;08:00;17:00;60;Pierre;Mairie;Paris;15</p>
              <p className="mt-2 not-font-mono opacity-60">Date : YYYY-MM-DD ou JJ/MM/AAAA · Tarif : taux horaire en €</p>
              <p className="opacity-60">Patron/Client/Lieu : noms exacts tels que créés dans l'app</p>
            </div>
          )}

          {/* Toggle mode */}
          {!preview && !result && (
            <div className={`flex ${darkMode ? "bg-black/20" : "bg-slate-100"} rounded-2xl p-1`}>
              <button
                onClick={() => setMode("paste")}
                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl ${mode === "paste" ? "bg-indigo-600 text-white" : muted}`}
              >Coller texte</button>
              <button
                onClick={() => setMode("upload")}
                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl ${mode === "upload" ? "bg-indigo-600 text-white" : muted}`}
              >Fichier .xlsx/.csv</button>
            </div>
          )}

          {/* Mode paste */}
          {!preview && !result && mode === "paste" && (
            <>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"Date;Début;Fin;Pause;Patron;Client;Lieu;Tarif\n2026-03-01;08:00;17:00;60;Pierre;Mairie;Paris;15"}
                rows={6}
                className={`w-full p-3 rounded-2xl border text-[11px] font-mono resize-none focus:outline-none focus:border-indigo-400 ${input}`}
              />
              <button
                onClick={handleAnalysePaste}
                disabled={!csvText.trim()}
                className="w-full py-3 rounded-2xl font-black uppercase text-[11px] bg-indigo-600 text-white disabled:opacity-30"
              >
                Analyser
              </button>
            </>
          )}

          {/* Mode upload */}
          {!preview && !result && mode === "upload" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className={`w-full py-8 rounded-2xl border-2 border-dashed font-black text-[11px] uppercase transition-colors ${
                  darkMode ? "border-white/20 hover:border-indigo-400 text-white/40 hover:text-indigo-400" : "border-slate-300 hover:border-indigo-400 text-slate-400"
                }`}
              >
                📂 Choisir un fichier .xlsx ou .csv
              </button>
            </>
          )}

          {/* Preview table */}
          {preview && (
            <div className="space-y-3">
              <div className="flex gap-2 text-[10px] font-black">
                <span className="text-green-400">✅ {validCount} valide(s)</span>
                {invalidCount > 0 && <span className="text-red-400">❌ {invalidCount} erreur(s)</span>}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/8" style={{ maxHeight: "280px" }}>
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className={darkMode ? "bg-white/5" : "bg-slate-100"}>
                      {["Ligne","Date","Début","Fin","Patron","Client","Lieu","H","€","Statut"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-black opacity-60 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t ${darkMode ? "border-white/5" : "border-slate-100"} ${
                          r.valid ? "" : (darkMode ? "bg-red-500/8" : "bg-red-50")
                        }`}
                      >
                        <td className={`px-2 py-1 font-black opacity-40`}>{r.line}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{r.mission?.date_iso ?? r.raw.date ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission?.debut ?? r.raw.debut ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission?.fin   ?? r.raw.fin   ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.patron ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.client ?? "—"}</td>
                        <td className="px-2 py-1 truncate max-w-[60px]">{r.raw.lieu   ?? "—"}</td>
                        <td className="px-2 py-1">{r.mission ? r.mission.duree.toFixed(1) : "—"}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{r.mission ? `${r.mission.montant.toFixed(0)}€` : "—"}</td>
                        <td className="px-2 py-1">
                          {r.valid
                            ? <span className="text-green-400 font-black">✅</span>
                            : <span className="text-red-400" title={r.errors.join(" | ")}>❌</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Erreurs détail */}
              {invalidCount > 0 && (
                <div className={`p-3 rounded-2xl border text-[9px] space-y-0.5 ${darkMode ? "bg-red-500/8 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                  {preview.rows.filter((r) => !r.valid).map((r, i) => (
                    <p key={i} className="text-red-400">
                      <span className="font-black">Ligne {r.line} :</span> {r.errors.join(" · ")}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
          {preview ? (
            <>
              <button
                onClick={() => { setPreview(null); setResult(null); }}
                className={`flex-1 py-3 font-black uppercase text-[10px] rounded-2xl ${darkMode ? "bg-white/5 text-white/50" : "bg-slate-100 text-slate-500"}`}
              >
                Retour
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="flex-1 py-3 font-black uppercase text-[10px] rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-30"
              >
                {importing ? "Import…" : `Importer ${validCount} mission(s)`}
              </button>
            </>
          ) : result ? (
            <button
              onClick={handleClose}
              className="w-full py-3 font-black uppercase text-[10px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white"
            >
              Fermer
            </button>
          ) : (
            <button
              onClick={handleClose}
              className={`w-full py-3 font-black uppercase text-[10px] rounded-2xl ${darkMode ? "bg-white/5 text-white/50" : "bg-slate-100 text-slate-500"}`}
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

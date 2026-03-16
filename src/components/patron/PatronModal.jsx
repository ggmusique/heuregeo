import React, { useState, useEffect, useMemo } from "react";
import { useLabels } from "../../contexts/LabelsContext";
import { useTheme } from "../../contexts/ThemeContext";

export function PatronModal({
  show,
  editMode = false,
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const L = useLabels();
  const { isDark } = useTheme();
  const [nom, setNom] = useState("");
  const [tauxHoraire, setTauxHoraire] = useState("");
  const [couleur, setCouleur] = useState("#8b5cf6");
  const [showBilling, setShowBilling] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [siret, setSiret] = useState("");

  const COULEURS_PRESET = [
    { nom: "Violet", value: "#8b5cf6" },
    { nom: "Bleu", value: "#3b82f6" },
    { nom: "Vert", value: "#10b981" },
    { nom: "Rouge", value: "#ef4444" },
    { nom: "Orange", value: "#f97316" },
    { nom: "Rose", value: "#ec4899" },
    { nom: "Jaune", value: "#eab308" },
    { nom: "Cyan", value: "#06b6d4" },
  ];

  useEffect(() => {
    if (!show) return;
    if (editMode && initialData) {
      setNom(initialData.nom || "");
      setTauxHoraire(initialData.taux_horaire != null ? String(initialData.taux_horaire) : "");
      setCouleur(initialData.couleur || "#8b5cf6");
      setAdresse(initialData.adresse || "");
      setCodePostal(initialData.code_postal || "");
      setVille(initialData.ville || "");
      setTelephone(initialData.telephone || "");
      setEmail(initialData.email || "");
      setSiret(initialData.siret || "");
      const hasBilling = !!(initialData.adresse || initialData.ville || initialData.telephone || initialData.email || initialData.siret);
      setShowBilling(hasBilling);
    } else {
      setNom(""); setTauxHoraire(""); setCouleur("#8b5cf6");
      setAdresse(""); setCodePostal(""); setVille("");
      setTelephone(""); setEmail(""); setSiret("");
      setShowBilling(false);
    }
  }, [show, editMode, initialData]);

  const tauxParsed = useMemo(() => {
    const raw = (tauxHoraire ?? "").toString().trim();
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [tauxHoraire]);

  const tauxIsValid = useMemo(() => {
    if (tauxParsed === null) return true;
    if (Number.isNaN(tauxParsed)) return false;
    return tauxParsed >= 0;
  }, [tauxParsed]);

  const nomIsValid = useMemo(() => nom.trim().length > 0, [nom]);
  const canSubmit = useMemo(() => !loading && nomIsValid && tauxIsValid, [loading, nomIsValid, tauxIsValid]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      nom: nom.trim(),
      taux_horaire: tauxParsed === null ? null : tauxParsed,
      couleur,
      adresse: adresse.trim() || null,
      code_postal: codePostal.trim() || null,
      ville: ville.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      siret: siret.trim() || null,
    });
  };

  if (!show) return null;

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${isDark ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400" : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`absolute inset-0 ${isDark ? "bg-black/60" : "bg-black/30"} backdrop-blur-sm`}
        onClick={onCancel}
      />
      <div
        className={`relative w-full max-w-md rounded-[35px] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[calc(100vh-8rem)] overflow-y-auto ${
          isDark
            ? "bg-gradient-to-br from-indigo-900/95 to-purple-900/95 text-white"
            : "bg-white text-slate-900"
        }`}
      >
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">
          {editMode ? `Modifier ${L.patron}` : `Nouveau ${L.patron}`}
        </h2>
        <div className="space-y-5">
          {/* Nom */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
              Nom du patron <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Entreprise ABC"
              className={`w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-all outline-none ${
                isDark
                  ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:bg-white/15"
                  : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"
              }`}
              disabled={loading}
              autoFocus
            />
          </div>
          {/* Taux horaire */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-2 tracking-wider">
              Taux horaire (€/h) - optionnel
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={tauxHoraire}
              onChange={(e) => setTauxHoraire(e.target.value)}
              placeholder="Ex: 15.50"
              className={`w-full px-5 py-4 rounded-[20px] text-base font-semibold transition-all outline-none ${
                isDark
                  ? "bg-white/10 border-2 border-white/20 focus:border-indigo-400 focus:bg-white/15"
                  : "bg-slate-100 border-2 border-slate-300 focus:border-indigo-500 focus:bg-white"
              } ${!tauxIsValid ? "border-red-500/60" : ""}`}
              disabled={loading}
            />
            {!tauxIsValid ? (
              <p className="text-[9px] text-red-300 mt-1 px-1 font-bold uppercase tracking-wider">Taux invalide (&gt;= 0)</p>
            ) : (
              <p className="text-[9px] opacity-50 mt-1 px-1">Si renseigné, sera utilisé pour calculer automatiquement le montant</p>
            )}
          </div>
          {/* Couleur */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-3 tracking-wider">Couleur d'identification</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {COULEURS_PRESET.map((c) => (
                <button
                  key={c.value} type="button" onClick={() => setCouleur(c.value)}
                  className={`relative h-12 rounded-xl transition-all ${couleur === c.value ? "ring-4 ring-white/50 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c.value }} disabled={loading} title={c.nom}
                >
                  {couleur === c.value && (
                    <span className="absolute bottom-1 right-1 text-[9px] font-black bg-black/40 text-white px-2 py-0.5 rounded-full">✓</span>
                  )}
                </button>
              ))}
            </div>
            <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer" disabled={loading} />
          </div>
          {/* Facturation */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? "border-white/10" : "border-slate-200"}`}>
            <button type="button" onClick={() => setShowBilling(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="text-[10px] font-black uppercase opacity-60 tracking-wider">
                Coordonnées de facturation <span className="ml-2 font-normal normal-case opacity-60">optionnel</span>
              </span>
              <span style={{ display: "inline-block", transition: "transform .2s", transform: showBilling ? "rotate(90deg)" : "rotate(0deg)" }} className="text-white/30 text-lg shrink-0">›</span>
            </button>
            {showBilling && (
              <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
                <div className="pt-3"><input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse" disabled={loading} className={inputCls} /></div>
                <div className="flex gap-2">
                  <input type="text" value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="Code postal" disabled={loading} className={`w-1/3 ${inputCls}`} />
                  <input type="text" value={ville} onChange={e => setVille(e.target.value)} placeholder="Ville" disabled={loading} className={`w-2/3 ${inputCls}`} />
                </div>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="Téléphone" disabled={loading} className={inputCls} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" disabled={loading} className={inputCls} />
                <input type="text" value={siret} onChange={e => setSiret(e.target.value)} placeholder="SIRET" disabled={loading} className={inputCls} />
              </div>
            )}
          </div>
        </div>
        {/* Aperçu */}
        <div className={`mt-6 p-4 rounded-2xl ${isDark ? "bg-black/20 border border-white/10" : "bg-slate-100 border border-slate-200"}`}>
          <p className="text-[9px] font-black uppercase opacity-50 mb-2">Aperçu</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: couleur }} />
            <div className="min-w-0">
              <div className="font-bold text-lg truncate">{nom.trim() || "Nom du patron"}</div>
              {tauxParsed !== null && !Number.isNaN(tauxParsed) && (
                <div className="text-[10px] opacity-70 font-black uppercase">{tauxParsed.toFixed(2)} €/h</div>
              )}
            </div>
          </div>
        </div>
        {/* Boutons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel} disabled={loading}
            className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] transition-all ${
              isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            } disabled:opacity-50 active:scale-95`}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit} disabled={!canSubmit}
            className={`flex-1 py-4 rounded-[20px] font-black uppercase text-[11px] active:scale-95 transition-all shadow-lg ${
              canSubmit ? "bg-gradient-to-r from-indigo-600 to-purple-700 text-white" : "bg-gray-600/30 text-white/40 cursor-not-allowed"
            }`}
            title={!nomIsValid ? "Nom obligatoire" : !tauxIsValid ? "Taux invalide" : ""}
          >
            {loading ? "⏳" : editMode ? "Modifier" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

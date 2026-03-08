import React from "react";

/**
 * ============================
 * PeriodModal
 * ============================
 * 👉 Petite fenêtre (modale) qui sert à CHOISIR :
 *   1) le type de période : semaine / mois / année
 *   2) la période exacte : ex "Semaine 12" ou "2025-02"
 *   3) (optionnel) un patron : Global ou un patron précis
 *
 * ✅ Elle ne calcule rien.
 * ✅ Elle ne fait qu’afficher des choix et appeler des callbacks.
 */
export const PeriodModal = ({
  show,                 // true/false : affiche ou cache la modale
  periodType,           // "semaine" | "mois" | "annee"
  setPeriodType,        // fonction pour changer le type (boutons)
  periodValue,          // valeur choisie (ex "12" / "2025-02" / "2025")
  setPeriodValue,       // fonction pour changer la valeur (select)
  availablePeriods,     // liste des périodes disponibles (remplie depuis missions)
  formatPeriodLabel,    // transforme "2025-02" en "FÉVRIER 2025", etc.
  onConfirm,            // callback quand on clique "Confirmer"
  onCancel,             // callback quand on clique "Annuler"
  darkMode = true,      // style sombre/clair

  // ✅ Ajout “multi-patrons”
  patrons = [],         // liste des patrons pour le select
  selectedPatronId = null, // patron choisi (null = global)
  onPatronChange = () => {}, // callback quand on change de patron

  // ✅ Ajout filtre client
  clients = [],              // liste des clients
  selectedClientId = null,   // client choisi (null = tous)
  onClientChange = () => {}, // callback quand on change de client

  isViewer = false,          // masque le sélecteur de patron pour les viewers

  // Features plan Free/Pro
  canBilanMois = true,       // accès au bilan par mois (plan Pro)
  canBilanAnnee = true,      // accès au bilan par année (plan Pro)
}) => {
  /**
   * Garde-fou : si show est false, on ne rend rien.
   * (la modale n’existe pas dans le DOM)
   */
  if (!show) return null;

  return (
    /**
     * Overlay : couche qui recouvre tout l’écran (fond sombre flou)
     */
    <div className={`fixed inset-0 z-[400] flex items-center justify-center p-6 ${darkMode ? "bg-[#050510]/95" : "bg-black/40"} backdrop-blur-xl`}>
      {/* Boîte de la modale */}
      <div
        className={`w-full max-w-sm p-8 rounded-[45px] border-2 ${
          darkMode
            ? "bg-[#0f111a] border-white/10"
            : "bg-white border-slate-200"
        } backdrop-blur-xl`}
      >
        {/* Titre de la modale */}
        <h3 className="text-xl font-black uppercase mb-4 text-center tracking-tighter italic">
          Choisir la période
        </h3>

        {/* ======================================================
            1) Choix du TYPE de période
            - 3 boutons : semaine / mois / année
            - met à jour periodType via setPeriodType(...)
           ====================================================== */}
        <div className={`flex ${darkMode ? "bg-black/20" : "bg-slate-100"} rounded-2xl p-1 mb-6 backdrop-blur-md`}>
          <button
            onClick={() => setPeriodType("semaine")}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              periodType === "semaine"
                ? "bg-indigo-600 text-white shadow-md"
                : `${darkMode ? "text-white/50" : "text-slate-500"} hover:bg-white/10`
            }`}
          >
            Semaine
          </button>

          <button
            onClick={() => canBilanMois && setPeriodType("mois")}
            disabled={!canBilanMois}
            title={!canBilanMois ? "Fonctionnalité Pro" : undefined}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              !canBilanMois
                ? `${darkMode ? "text-white/20" : "text-slate-300"} cursor-not-allowed`
                : periodType === "mois"
                ? "bg-indigo-600 text-white shadow-md"
                : `${darkMode ? "text-white/50" : "text-slate-500"} hover:bg-white/10`
            }`}
          >
            {canBilanMois ? "Mois" : "🔒 Mois"}
          </button>

          <button
            onClick={() => canBilanAnnee && setPeriodType("annee")}
            disabled={!canBilanAnnee}
            title={!canBilanAnnee ? "Fonctionnalité Pro" : undefined}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
              !canBilanAnnee
                ? `${darkMode ? "text-white/20" : "text-slate-300"} cursor-not-allowed`
                : periodType === "annee"
                ? "bg-indigo-600 text-white shadow-md"
                : `${darkMode ? "text-white/50" : "text-slate-500"} hover:bg-white/10`
            }`}
          >
            {canBilanAnnee ? "Année" : "🔒 Année"}
          </button>
        </div>

        {/* ======================================================
            2) Choix de la PÉRIODE
            - un <select> rempli par availablePeriods
            - quand on change : setPeriodValue(...)
           ====================================================== */}
        <div className="mb-6">
          <label className="block text-[11px] font-black uppercase mb-3 text-indigo-300 tracking-[0.25em] opacity-80">
            {periodType === "semaine"
              ? "Choisir la semaine"
              : periodType === "mois"
              ? "Choisir le mois"
              : "Choisir l'année"}
          </label>

          <div className="relative">
            <select
              value={periodValue || ""}
              onChange={(e) => setPeriodValue(e.target.value)}
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-[13px] uppercase border-2 border-indigo-500/40 appearance-none cursor-pointer focus:outline-none focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md ${darkMode ? "bg-[#1a1f2e] text-white" : "bg-white text-slate-900 border-slate-200"}`}
            >
              {/* option placeholder */}
              <option value="" disabled>
                Sélectionner une période...
              </option>

              {/* options venant de availablePeriods */}
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {/* formatPeriodLabel rend ça plus joli */}
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>

            {/* petite flèche à droite (juste déco) */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ======================================================
            3) (NOUVEAU) Filtre PATRON (optionnel)
            - null / "" = Global = tous les patrons
            - sinon patron.id
           ====================================================== */}
        {!isViewer && (
        <div className="mb-8">
          <label className="block text-[11px] font-black uppercase mb-3 text-green-300 tracking-[0.25em] opacity-80">
            Filtrer par patron (optionnel)
          </label>

          <div className="relative">
            <select
              value={selectedPatronId || ""}
              onChange={(e) => {
                const value = e.target.value;
                // ✅ correction importante : "" => null pour être cohérent partout
                onPatronChange(value === "" ? null : value);
              }}
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-[13px] uppercase border-2 border-green-500/40 appearance-none cursor-pointer focus:outline-none focus:border-green-400 transition-all shadow-inner backdrop-blur-md ${darkMode ? "bg-[#1a1f2e] text-white" : "bg-white text-slate-900 border-slate-200"}`}
            >
              {/* Global */}
              <option value="">📊 Tous les patrons (Global)</option>

              {/* Liste patrons */}
              {patrons.map((patron) => (
                <option key={patron.id} value={patron.id}>
                  {patron.nom}
                </option>
              ))}
            </select>

            {/* flèche déco */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-green-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Aide texte */}
          <p className="text-[9px] opacity-50 mt-2 px-1">
            Laisser sur "Tous les patrons" pour un bilan consolidé
          </p>
        </div>
        )}

        {/* ======================================================
            4) (NOUVEAU) Filtre CLIENT (optionnel)
            - null / "" = tous les clients
            - sinon client.id
           ====================================================== */}
        {!isViewer && (
        <div className="mb-8">
          <label className="block text-[11px] font-black uppercase mb-3 text-amber-300 tracking-[0.25em] opacity-80">
            Filtrer par client (optionnel)
          </label>

          <div className="relative">
            <select
              value={selectedClientId || ""}
              onChange={(e) => {
                const value = e.target.value;
                onClientChange(value === "" ? null : value);
              }}
              className={`w-full p-4 pl-5 pr-12 rounded-2xl font-black text-[13px] uppercase border-2 border-amber-500/40 appearance-none cursor-pointer focus:outline-none focus:border-amber-400 transition-all shadow-inner backdrop-blur-md ${darkMode ? "bg-[#1a1f2e] text-white" : "bg-white text-slate-900 border-slate-200"}`}
            >
              <option value="">👥 Tous les clients</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
            </select>

            {/* flèche déco */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-amber-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Aide texte */}
          <p className="text-[9px] opacity-50 mt-2 px-1">
            Laisser sur "Tous les clients" pour un bilan consolidé
          </p>
        </div>
        )}

        {/* ======================================================
            5) Boutons bas
            - Annuler : onCancel()
            - Confirmer : onConfirm() (désactivé si pas de periodValue)
           ====================================================== */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 font-black uppercase text-[10px] opacity-60 hover:opacity-100 transition-opacity backdrop-blur-md"
          >
            Annuler
          </button>

          <button
            onClick={onConfirm}
            disabled={!periodValue}
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${
              periodValue
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg active:scale-95"
                : "bg-gray-600/30 text-white/40 cursor-not-allowed"
            } backdrop-blur-md`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { DateSelector } from "../DateSelector";
import { PatronSelectorCompact } from "../../patron/PatronSelector";

/**
 * ✅ AcompteModal = fenêtre “Nouvel Acompte”
 * Elle s’affiche quand show = true
 * Elle contient :
 * - un sélecteur de patron (obligatoire)
 * - un champ montant
 * - un sélecteur de date
 * - boutons Annuler / Valider
 */
export const AcompteModal = ({
  show,                 // 👈 true = on affiche la fenêtre / false = rien du tout
  montant,              // 👈 valeur actuelle du champ "montant" (texte/nombre)
  setMontant,           // 👈 fonction pour modifier ce montant
  date,                 // 👈 date sélectionnée (format YYYY-MM-DD)
  setDate,              // 👈 fonction pour modifier la date
  onSubmit,             // 👈 action quand on clique “Valider”
  onCancel,             // 👈 action quand on clique “Annuler”
  loading = false,      // 👈 true = bouton désactivé + affiche “Chargement...”
  isIOS = false,        // 👈 aide DateSelector à gérer les bugs iPhone/iPad
  patrons = [],         // 👈 liste des patrons à afficher dans le select
  selectedPatronId = null, // 👈 patron choisi pour cet acompte
  onPatronChange = () => {}, // 👈 quand on change de patron
}) => {
  // ✅ Si la modal n’est pas censée être ouverte => on ne rend rien
  if (!show) return null;

  return (
    // ✅ Fond noir + flou qui recouvre toute l’app
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050510]/90 backdrop-blur-md">
      
      {/* ✅ La "boîte" centrale */}
      <div className="w-full max-w-sm p-8 bg-[#121420] rounded-[40px] border-2 border-cyan-500/30 backdrop-blur-xl shadow-2xl">
        
        {/* ✅ Titre */}
        <h3 className="text-xl font-black uppercase mb-6 text-center italic text-cyan-400">
          Nouvel Acompte
        </h3>

        <div className="space-y-6">

          {/* ✅ Sélecteur de patron (OBLIGATOIRE) */}
          <PatronSelectorCompact
            patrons={patrons}                 // 👈 liste dans le menu
            selectedPatronId={selectedPatronId} // 👈 valeur sélectionnée
            onSelect={onPatronChange}         // 👈 quand on choisit un patron
            required={true}                   // 👈 doit être rempli
            darkMode={true}                   // 👈 force style sombre
          />

          {/* ✅ Champ Montant */}
          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Montant reçu
            </p>

            <input
              type="number" // 👈 champ numérique
              placeholder="0.00 €"
              className="w-full p-6 bg-black/40 rounded-2xl text-white font-black outline-none border border-cyan-500/30 text-center text-3xl focus:border-cyan-400 transition-colors"
              value={montant} // 👈 valeur affichée
              onChange={(e) => setMontant(e.target.value)} // 👈 met à jour le state dans App.jsx
            />
          </div>

          {/* ✅ Sélecteur de date */}
          <div>
            <p className="text-[10px] font-black uppercase mb-2 text-cyan-500/60 tracking-widest px-1">
              Date de réception
            </p>

            <DateSelector
              dateMission={date}           // 👈 date affichée
              setDateMission={setDate}     // 👈 change la date
              isIOS={isIOS}                // 👈 fix iOS
            />
          </div>

          {/* ✅ Boutons */}
          <div className="flex gap-3 pt-2">

            {/* Annuler */}
            <button
              onClick={onCancel} // 👈 ferme la modal + reset (souvent)
              className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-white/60 hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>

            {/* Valider */}
            <button
              onClick={onSubmit}     // 👈 lance handleAcompteSubmit dans App.jsx
              disabled={loading}     // 👈 empêche double clic quand ça charge
              className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl text-[10px] font-black text-white shadow-lg uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Valider"} {/* 👈 texte dynamique */}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

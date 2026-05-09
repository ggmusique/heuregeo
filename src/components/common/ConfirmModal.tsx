import React from "react";
import { MODAL_STYLES } from "../../constants/options";
import { ConfirmState } from "../../hooks/useConfirm";

interface ConfirmModalProps extends ConfirmState {
  darkMode?: boolean;
}

/**
 * ✅ ConfirmModal = la fenêtre popup (UI) "Confirmer / Annuler"
 *
 * 📌 Elle est pilotée par useConfirm :
 * - useConfirm fournit confirmState + onConfirm/onCancel
 * - App.jsx passe tout ça à <ConfirmModal ... />
 *
 * Quand show = false -> la modal n'existe pas (return null)
 * Quand show = true  -> on affiche l'overlay + la boite au centre
 */
export const ConfirmModal = ({
  show,        // 👈 true/false : afficher la modal ?
  title,       // 👈 titre en haut (ex: "Supprimer mission")
  message,     // 👈 texte explicatif
  confirmText, // 👈 texte bouton confirmer
  cancelText,  // 👈 texte bouton annuler
  onConfirm,   // 👈 action quand on clique "confirmer"
  onCancel,    // 👈 action quand on annule (bouton ou clic dehors)
  type = "danger", // 👈 style: danger / warning / info...
  darkMode = true, // 👈 style sombre/clair
}: ConfirmModalProps) => {
  // ✅ Si la modal ne doit pas être visible, on ne rend rien du tout
  // -> ça évite qu'elle prenne de la place ou capte des clics
  if (!show) return null;

  // ✅ On récupère le "pack de style" selon le type (couleurs, icône, etc.)
  // Si type inconnu => style danger par défaut
  const style = MODAL_STYLES[type] || MODAL_STYLES.danger;

  return (
    // ✅ Conteneur plein écran (fixed inset-0)
    // z-[600] : au-dessus du reste de l'app
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 animate-in fade-in duration-200">
      
      {/* ✅ Overlay noir derrière la modal
          - couvre tout l'écran
          - si tu cliques dessus => onCancel (comme "Annuler") */}
      <div
        className={`absolute inset-0 ${darkMode ? "bg-black/70" : "bg-black/30"} backdrop-blur-md`}
        onClick={onCancel}
      />

      {/* ✅ Conteneur de la "boîte" centrée */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">

        {/* ✅ Halo / glow décoratif derrière la boîte */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-20 blur-2xl rounded-[45px]`}
        />

        {/* ✅ La boîte principale */}
        <div
          className={`relative ${darkMode ? "bg-[var(--color-bg)]/95" : "bg-white"} backdrop-blur-xl border-2 ${style.border} rounded-[40px] overflow-hidden shadow-2xl`}
        >
          
          {/* ✅ Bandeau du haut (titre + icône) */}
          <div
            className={`bg-gradient-to-r ${style.gradient} px-6 py-5 flex items-center gap-4 backdrop-blur-md`}
          >
            <div
              className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center text-2xl`}
            >
              {/* ✅ Icône selon le type : ex ⚠️ / 🗑️ / ✅ */}
              {style.icon}
            </div>

            <h3 className={`text-lg font-black uppercase ${darkMode ? "text-white" : "text-slate-800"} tracking-tight drop-shadow`}>
              {title || "Confirmation requise"}
            </h3>
          </div>

          {/* ✅ Corps : le message */}
          <div className="p-8 backdrop-blur-md">
            <p className={`${darkMode ? "text-white/90" : "text-slate-700"} text-[15px] leading-relaxed font-medium`}>
              {message}
            </p>
          </div>

          {/* ✅ Bas : boutons Annuler / Confirmer */}
          <div className="px-6 pb-6 flex gap-3">
            
            {/* Bouton Annuler */}
            <button
              onClick={onCancel}
              className={`flex-1 py-4 px-6 border rounded-2xl font-black uppercase text-[11px] tracking-wider transition-all active:scale-95 backdrop-blur-md ${darkMode ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/70" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"}`}
            >
              {cancelText || "Annuler"}
            </button>

            {/* Bouton Confirmer */}
            <button
              onClick={onConfirm}
              className={`flex-1 py-4 px-6 ${style.buttonBg} rounded-2xl font-black uppercase text-[11px] text-white tracking-wider transition-all active:scale-95 shadow-lg backdrop-blur-md`}
            >
              {confirmText || "Confirmer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

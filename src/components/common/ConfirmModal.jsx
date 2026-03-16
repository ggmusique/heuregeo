import React from "react";
import { MODAL_STYLES } from "../../constants/options";
import { useTheme } from "../../contexts/ThemeContext";

export const ConfirmModal = ({
  show,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = "danger",
}) => {
  const { isDark } = useTheme();
  if (!show) return null;

  const style = MODAL_STYLES[type] || MODAL_STYLES.danger;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div
        className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-black/30"} backdrop-blur-md`}
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-20 blur-2xl rounded-[45px]`}
        />
        <div
          className={`relative ${isDark ? "bg-[#0f0b1a]/95" : "bg-white"} backdrop-blur-xl border-2 ${style.border} rounded-[40px] overflow-hidden shadow-2xl`}
        >
          <div
            className={`bg-gradient-to-r ${style.gradient} px-6 py-5 flex items-center gap-4 backdrop-blur-md`}
          >
            <div
              className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center text-2xl`}
            >
              {style.icon}
            </div>
            <h3 className={`text-lg font-black uppercase ${isDark ? "text-white" : "text-slate-800"} tracking-tight drop-shadow`}>
              {title || "Confirmation requise"}
            </h3>
          </div>
          <div className="p-8 backdrop-blur-md">
            <p className={`${isDark ? "text-white/90" : "text-slate-700"} text-[15px] leading-relaxed font-medium`}>
              {message}
            </p>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 py-4 px-6 border rounded-2xl font-black uppercase text-[11px] tracking-wider transition-all active:scale-95 backdrop-blur-md ${isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/70" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"}`}
            >
              {cancelText || "Annuler"}
            </button>
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

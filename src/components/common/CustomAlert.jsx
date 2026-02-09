import React from "react";

/**
 * Alerte personnalisée avec animation
 */
export const CustomAlert = React.memo(({ show, message, onDismiss }) => {
  if (!show) return null;

  return (
    <div
      onClick={onDismiss}
      className="fixed top-12 left-5 right-5 z-[200] animate-in slide-in-from-top duration-500 cursor-pointer"
    >
      <div className="bg-gradient-to-r from-red-600/40 to-rose-600/40 backdrop-blur-2xl border-2 border-red-500/60 p-5 rounded-[25px] shadow-[0_10px_40px_rgba(239,68,68,0.6)] flex items-center gap-4">
        <span className="text-3xl drop-shadow-lg">⚠️</span>
        <p className="text-white font-black uppercase text-[13px] tracking-wider leading-tight drop-shadow">
          {message}
        </p>
      </div>
    </div>
  );
});

CustomAlert.displayName = "CustomAlert";

import React, { useState, useRef, useEffect } from "react";

interface WeekPickerProps {
  value: number | string;
  weeks?: (number | string)[];
  onChange: (w: number | string) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const WeekPicker = ({
  value,
  weeks = [],
  onChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: WeekPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Bouton Précédent */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="
          w-8 h-8 rounded-xl
          bg-white/10 backdrop-blur-md
          border border-fuchsia-300/30
          text-white font-black text-sm
          shadow-[0_0_12px_rgba(217,70,239,0.35)]
          hover:bg-white/20 hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10
          transition-all duration-200
          flex items-center justify-center
        "
        title="Semaine précédente"
      >
        ←
      </button>

      {/* Sélecteur central */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          h-8 px-4 rounded-xl
          bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20
          backdrop-blur-md
          border border-fuchsia-300/40
          text-[10px] font-black uppercase tracking-[0.3em]
          text-white
          shadow-[0_0_15px_rgba(217,70,239,0.4)]
          hover:shadow-[0_0_25px_rgba(217,70,239,0.6)]
          hover:border-fuchsia-300/60
          transition-all duration-200
          flex items-center gap-2
        "
      >
        <span className="opacity-60">S</span>
        <span className="text-sm">{value}</span>
        <span className="text-[8px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {/* Bouton Suivant */}
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="
          w-8 h-8 rounded-xl
          bg-white/10 backdrop-blur-md
          border border-fuchsia-300/30
          text-white font-black text-sm
          shadow-[0_0_12px_rgba(217,70,239,0.35)]
          hover:bg-white/20 hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10
          transition-all duration-200
          flex items-center justify-center
        "
        title="Semaine suivante"
      >
        →
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 top-full mt-2 z-50
            w-48
            max-h-64 overflow-y-auto
            rounded-2xl
            bg-gradient-to-br from-fuchsia-800/95 to-indigo-900/95
            backdrop-blur-xl
            border border-fuchsia-300/40
            shadow-[0_0_30px_rgba(217,70,239,0.5)]
            custom-scrollbar
          "
        >
          <div className="p-2">
            <div className="text-[8px] font-black uppercase tracking-widest text-white/50 px-3 py-2">
              Choisir une semaine
            </div>
            {weeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  onChange(w);
                  setOpen(false);
                }}
                className={`
                  block w-full text-left px-4 py-2.5 rounded-xl
                  text-[11px] font-black uppercase tracking-wider
                  text-white
                  hover:bg-white/20
                  transition-all duration-150
                  ${
                    w === value
                      ? "bg-gradient-to-r from-fuchsia-500/40 to-purple-500/40 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                      : "hover:bg-white/10"
                  }
                `}
              >
                <span className="opacity-60 text-[9px]">S</span> {w}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(217, 70, 239, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 70, 239, 0.7);
        }
      `}</style>
    </div>
  );
};

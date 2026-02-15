import React, { useState, useRef, useEffect } from "react";

export const WeekPicker = ({
  value,
  weeks = [],
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          h-8 px-3 rounded-xl
          bg-white/10 backdrop-blur-md
          border border-fuchsia-300/30
          text-[9px] font-black uppercase tracking-[0.25em]
          text-white
          shadow-[0_0_12px_rgba(217,70,239,0.35)]
          hover:bg-white/15
          transition-all
        "
      >
        S{value}
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 z-50
            max-h-48 overflow-y-auto
            rounded-2xl
            bg-gradient-to-br from-fuchsia-700/90 to-indigo-900/90
            backdrop-blur-xl
            border border-fuchsia-300/30
            shadow-[0_0_25px_rgba(217,70,239,0.45)]
          "
        >
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                onChange(w);
                setOpen(false);
              }}
              className={`
                block w-full text-left px-4 py-2
                text-[10px] font-black uppercase tracking-widest
                text-white
                hover:bg-white/15
                transition-all
                ${w === value ? "bg-white/20" : ""}
              `}
            >
              Semaine {w}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

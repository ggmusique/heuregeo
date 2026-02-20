<button
  onClick={() => setActiveTab("compte")}
  className={`flex-1 py-3 rounded-[28px] font-black uppercase text-[10px] tracking-widest flex flex-col items-center justify-center gap-0.5 ${
    activeTab === "compte"
      ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
      : "text-white/30"
  }`}
>
  <span className={activeTab === "compte" ? "text-amber-400 text-[16px]" : "text-amber-400/40 text-[16px]"}>👤</span>
  <span>Compte</span>
</button>

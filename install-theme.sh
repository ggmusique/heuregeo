#!/bin/bash

echo "🎨 Installation du thème Bleu Marine & Or..."

# Backup
cp src/App.jsx src/App.jsx.OLD-VIOLET

# Remplacements principaux
sed -i 's/from-\[#0a001f\] via-\[#1a0033\] to-\[#0f0022\]/from-[#020818] via-[#050f2e] to-[#081640]/g' src/App.jsx
sed -i 's/from-purple-900\/30/from-[#0d2880]\/20/g' src/App.jsx
sed -i 's/to-indigo-900\/30/to-[#d4a017]\/10/g' src/App.jsx
sed -i 's/border-indigo-400/border-[#d4a017]/g' src/App.jsx
sed -i 's/rgba(99,102,241,0.6)/rgba(212,160,23,0.6)/g' src/App.jsx
sed -i 's/from-indigo-800\/95 via-purple-900\/95 to-indigo-950\/95/from-[#081640] via-[#0a1f5c] to-[#050f2e] backdrop-blur-xl border-b border-[#d4a017]\/20/g' src/App.jsx

# Titre HEURES DE GEO en or avec Playfair
sed -i 's|<h1 className="relative text-\[30px\] font-black italic tracking-\[0.1em\] text-white mb-2 drop-shadow-2xl">|<h1 className="relative text-[30px] font-black italic tracking-[0.1em] mb-2 drop-shadow-2xl" style={{ fontFamily: "'\''Playfair Display'\'', serif", background: "linear-gradient(135deg, #f4d03f, #d4a017, #b8860b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>|g' src/App.jsx

# Boutons principaux
sed -i 's/from-indigo-600 to-purple-700/from-[#0d2880] to-[#0a1f5c] border border-[#d4a017]\/30/g' src/App.jsx

# Carte bilan principale
sed -i 's/from-indigo-600 to-purple-800 p-8 rounded-\[45px\]/from-[#0a1f5c] to-[#081640] p-8 rounded-[45px] border-2 border-[#d4a017]\/20 relative overflow-hidden/g' src/App.jsx

# Navigation du bas
sed -i 's/bg-\[#0f111a\]\/80 backdrop-blur-3xl border border-white\/10/bg-[#050f2e]\/85 backdrop-blur-3xl border border-[#d4a017]\/15/g' src/App.jsx

# Boutons navigation actifs (tous en navy/gold)
sed -i 's/from-indigo-600 to-indigo-800 text-white/from-[#0d2880] to-[#0a1f5c] border border-[#d4a017]\/25 text-[#f4d03f]/g' src/App.jsx
sed -i 's/from-green-600 to-green-800 text-white/from-[#0d2880] to-[#0a1f5c] border border-[#d4a017]\/25 text-[#f4d03f]/g' src/App.jsx
sed -i 's/from-cyan-600 to-cyan-800 text-white/from-[#0d2880] to-[#0a1f5c] border border-[#d4a017]\/25 text-[#f4d03f]/g' src/App.jsx
sed -i 's/from-purple-600 to-purple-800 text-white/from-[#0d2880] to-[#0a1f5c] border border-[#d4a017]\/25 text-[#f4d03f]/g' src/App.jsx

echo ""
echo "✅ Thème installé !"
echo "🚀 Lance maintenant: npm run dev"
echo ""
echo "💡 Pour revenir en arrière:"
echo "   cp src/App.jsx.OLD-VIOLET src/App.jsx"


import React, { useEffect, useState, Children } from "react";
import { supabase } from "../../services/supabase";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  // ✅ MODIFIÉ : Ajout de e.preventDefault() pour Safari
  const handleAuth = async (e) => {
    e.preventDefault(); // ← IMPORTANT pour que Safari détecte le formulaire
    setMsg("");
    try {
      setLoading(true);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("✅ Compte créé. Vérifie tes emails si confirmation activée.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setMsg("❌ " + (e?.message || "Erreur auth"));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Chargement...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a001f] text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <h2 className="text-2xl font-black mb-2">Connexion</h2>
          <p className="text-sm opacity-70 mb-6">
            (RLS actif: il faut être connecté)
          </p>

          {/* ✅ MODIFIÉ : Ajout de <form> avec onSubmit */}
          <form onSubmit={handleAuth}>
            <input
              className="w-full mb-3 p-3 rounded-xl bg-black/30 border border-white/10 text-white"
              placeholder="Email"
              type="email"        // ← AJOUTÉ type="email"
              name="email"        // ← AJOUTÉ name="email"
              id="email"          // ← AJOUTÉ id="email"
              required            // ← AJOUTÉ required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"  // ← MODIFIÉ : "email" → "username"
            />
            
            <input
              className="w-full mb-4 p-3 rounded-xl bg-black/30 border border-white/10 text-white"
              placeholder="Mot de passe"
              type="password"
              name="password"     // ← AJOUTÉ name="password"
              id="password"       // ← AJOUTÉ id="password"
              required            // ← AJOUTÉ required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />

            {/* ✅ MODIFIÉ : Changé onClick en type="submit" */}
            <button
              type="submit"      // ← MODIFIÉ : onClick → type="submit"
              disabled={loading} // ← AJOUTÉ disabled pendant chargement
              className="w-full py-3 rounded-2xl bg-indigo-600 font-black uppercase text-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {mode === "signup" ? "Créer un compte" : "Se connecter"}
            </button>
          </form>

          {/* Bouton changement de mode en dehors du form */}
          <button
            type="button"  // ← AJOUTÉ pour éviter la soumission
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full mt-3 py-3 rounded-2xl bg-white/10 font-black uppercase text-xs active:scale-95 transition-all"
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>

          {msg && <p className="mt-4 text-sm">{msg}</p>}
        </div>
      </div>
    );
  }

  return React.cloneElement(Children.only(children), { user: session.user });
}
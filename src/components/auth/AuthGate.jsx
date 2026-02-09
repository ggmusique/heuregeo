import React, { useEffect, useState } from "react";
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

  const handleAuth = async () => {
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

          <input
            className="w-full mb-3 p-3 rounded-xl bg-black/30 border border-white/10"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full mb-4 p-3 rounded-xl bg-black/30 border border-white/10"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />

          <button
            onClick={handleAuth}
            className="w-full py-3 rounded-2xl bg-indigo-600 font-black uppercase text-sm active:scale-95 transition-all"
          >
            {mode === "signup" ? "Créer un compte" : "Se connecter"}
          </button>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full mt-3 py-3 rounded-2xl bg-white/10 font-black uppercase text-xs active:scale-95 transition-all"
          >
            {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
          </button>

          {msg && <p className="mt-4 text-sm">{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={logout}
        className="fixed top-4 left-4 z-[9999] px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-black border border-white/10"
        title="Se déconnecter"
      >
        Logout
      </button>
      {children}
    </>
  );
}

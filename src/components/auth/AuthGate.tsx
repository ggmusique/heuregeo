import React, { useEffect, useState, Children } from "react";
import { supabase } from "../../services/supabase";

interface Props {
  children: React.ReactElement;
}

export default function AuthGate({ children }: Props) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);

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
      (_event: any, newSession: any) => {
        setSession(newSession);
      }
    );

    const timer = setTimeout(() => setMinDelayDone(true), 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Erreur auth"));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading || !minDelayDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a001f]">
        <div className="flex flex-col items-center gap-5">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-black text-white tracking-tight">Tracko</h1>
            <p className="text-white/35 text-xs mt-2 tracking-[0.2em] uppercase">Gérez vos heures &amp; km</p>
          </div>
          <div className="flex gap-2 mt-4">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
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

          <form onSubmit={handleAuth}>
            <input
              className="w-full mb-3 p-3 rounded-xl bg-black/30 border border-white/10 text-white"
              placeholder="Email"
              type="email"
              name="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            
            <input
              className="w-full mb-4 p-3 rounded-xl bg-black/30 border border-white/10 text-white"
              placeholder="Mot de passe"
              type="password"
              name="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-indigo-600 font-black uppercase text-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {mode === "signup" ? "Créer un compte" : "Se connecter"}
            </button>
          </form>

          <button
            type="button"
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

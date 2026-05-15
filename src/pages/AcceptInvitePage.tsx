// src/pages/AcceptInvitePage.tsx
// Page d'activation d'une invitation patron.
// Accessible via : https://heuregeo.app/accept-invite?token=<uuid>

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { verifyInviteToken, activatePatronAccess } from "../services/api/patronAccessApi";

type InviteInfo = {
  invitation_id: string;
  owner_id: string;
  patron_id: string;
  patron_email: string;
  invite_expires: string;
};

type PageState = "loading" | "auth" | "confirm" | "activating" | "success" | "expired" | "error";

interface AcceptInvitePageProps {
  token: string;
}

export function AcceptInvitePage({ token }: AcceptInvitePageProps) {
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);

  // Formulaire auth
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  // null = les deux modes disponibles ; sinon le mode est verrouillé
  const [forcedAuthMode, setForcedAuthMode] = useState<"login" | "signup" | null>(null);
  const [authMsg, setAuthMsg] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // ── Étape 1 : vérifier le token ──────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await verifyInviteToken(token);
        if (!alive) return;

        if (!p) {
          setState("expired");
          return;
        }
        setInvite(p);
        // Pré-remplir l'email avec celui de l'invitation
        setEmail(p.patron_email);

        // Verifier si l'utilisateur est deja connecte
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // ── Bug 1 : vérifier le rôle du compte connecté ────────────────
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();
          const role = profileData?.role as string | null | undefined;
          if (role && role !== "viewer") {
            setErrorMsg("Ce lien d'invitation ne peut pas être utilisé avec ce compte.");
            setState("error");
            return;
          }
          setState("confirm");
        } else {
          // ── Bug 2 : détecter si un compte existe pour cet email ────────
          const { data: hasAccount, error: probeErr } = await supabase
            .rpc("patron_email_has_account", { p_email: p.patron_email });
          if (!probeErr) {
            const mode = hasAccount ? "login" : "signup";
            setForcedAuthMode(mode);
            setAuthMode(mode);
          }
          setState("auth");
        }
      } catch (err) {
        if (!alive) return;
        setErrorMsg((err as Error).message || "Erreur inattendue");
        setState("error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // ── Étape 2 (bis) : confirmation explicite si déjà connecté ─────────────────
  const handleConfirmActivate = useCallback(async () => {
    setState("activating");
    try {
      await activatePatronAccess(token);
      setState("success");
    } catch (err) {
      setErrorMsg((err as Error).message || "Erreur lors de l'activation");
      setState("error");
    }
  }, [token]);

  // ── Étape 2 : auth puis activation ─────────────────────────────────────
  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setAuthMsg("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setState("activating");
          await activatePatronAccess(token);
          setState("success");
        } else {
          setAuthMsg("✅ Compte cree — verifiez vos emails pour confirmer, puis reconnectez-vous via ce lien.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setState("activating");
        await activatePatronAccess(token);
        setState("success");
      }
    } catch (err) {
      setAuthMsg("❌ " + ((err as Error).message || "Erreur d'authentification"));
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, authMode, invite, token]);

  const handleGoToApp = useCallback(() => {
    window.location.href = window.location.origin;
  }, []);

  // ── Rendu ────────────────────────────────────────────────────────────────
  const containerCls = "min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-slate-100 px-4 py-8";
  const cardCls = "w-full max-w-md bg-[#1e293b] rounded-2xl border border-slate-700 p-8 shadow-2xl";
  const inputCls = "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-medium text-slate-100 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors";
  const btnPrimaryCls = "w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

  if (state === "loading" || state === "activating") {
    return (
      <div className={containerCls}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
            <span className="text-2xl">⏱</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-400 border-t-transparent" />
          <p className="text-slate-400 text-sm">
            {state === "activating" ? "Activation de votre accès…" : "Vérification du lien…"}
          </p>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className={containerCls}>
        <div className={cardCls}>
          <div className="text-center space-y-4">
            <div className="text-4xl">⏰</div>
            <h1 className="text-xl font-black tracking-tight">Lien expiré ou invalide</h1>
            <p className="text-slate-400 text-sm">
              Ce lien d&apos;invitation n&apos;est plus valide (expiré après 7 jours ou déjà utilisé).
            </p>
            <p className="text-slate-400 text-sm">
              Demandez à votre employeur de vous renvoyer une invitation depuis HeurGeo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={containerCls}>
        <div className={cardCls}>
          <div className="text-center space-y-4">
            <div className="text-4xl">❌</div>
            <h1 className="text-xl font-black tracking-tight">Erreur</h1>
            <p className="text-slate-400 text-sm">{errorMsg}</p>
            <button onClick={handleGoToApp} className={btnPrimaryCls}>
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "confirm") {
    return (
      <div className={containerCls}>
        <div className={cardCls}>
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-xl">
              <span className="text-2xl">⏱</span>
            </div>
            <h1 className="text-xl font-black tracking-tight">Activer votre accès</h1>
            {invite && (
              <p className="text-slate-400 text-sm">
                Vous êtes connecté. Cliquez sur le bouton ci-dessous pour activer votre accès patron.
              </p>
            )}
            <button onClick={handleConfirmActivate} className={btnPrimaryCls}>
              Activer mon accès &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "success") {    return (
      <div className={containerCls}>
        <div className={cardCls}>
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-emerald-400">Accès activé !</h1>
            <p className="text-slate-400 text-sm">
              Votre accès a été activé avec succès. Vous pouvez maintenant consulter vos heures et bilans.
            </p>
            <button onClick={handleGoToApp} className={btnPrimaryCls}>
              Accéder à l&apos;application →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // state === "auth" : formulaire de connexion / inscription
  return (
    <div className={containerCls}>
      <div className={cardCls}>
        {/* Logo + titre */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-xl">⏱</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">HeurGeo</h1>
          <p className="text-slate-400 text-xs mt-1">Activer mon accès patron</p>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-200">
          {forcedAuthMode === "signup"
            ? "Aucun compte n'existe pour cette adresse. Créez un compte pour activer votre accès."
            : forcedAuthMode === "login"
            ? "Un compte existe déjà pour cette adresse. Connectez-vous pour activer votre accès."
            : "Vous avez reçu une invitation. Connectez-vous ou créez un compte pour activer votre accès."}
        </div>

        {/* Sélecteur mode — masqué si le mode est verrouillé */}
        {!forcedAuthMode && (
        <div className="flex gap-1 mb-5 bg-slate-800 rounded-xl p-1">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setAuthMode(m); setAuthMsg(""); }}
              className={
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all " +
                (authMode === m
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200")
              }
            >
              {m === "signup" ? "Créer un compte" : "Se connecter"}
            </button>
          ))}
        </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              disabled={authLoading || Boolean(invite?.patron_email)}
              readOnly={Boolean(invite?.patron_email)}
              autoComplete="email"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={authLoading}
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              className={inputCls}
            />
            {authMode === "signup" && (
              <p className="text-[10px] text-slate-500 mt-1">Minimum 6 caractères</p>
            )}
          </div>

          {authMsg && (
            <p className={"text-sm px-3 py-2 rounded-lg " + (authMsg.startsWith("✅") ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300")}>
              {authMsg}
            </p>
          )}

          <button type="submit" disabled={authLoading || !email || !password} className={btnPrimaryCls}>
            {authLoading
              ? "…"
              : authMode === "signup"
              ? "Créer mon compte et activer"
              : "Me connecter et activer"}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { useInvitations } from "../../hooks/useInvitations";
import type { InAppInvitation } from "../../hooks/useInvitations";

// ─── Icônes ───────────────────────────────────────────────────────────────────

const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="2,4 12,13 22,4" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Section d'invitations in-app pour les OUVRIERS (propriétaires de données).
 * Intégrée dans ParametresTab → panel "invitations".
 *
 * - Bloc 1: Mon code unique (à partager avec un patron)
 * - Bloc 2: Rechercher un patron par code → inviter
 * - Bloc 3: Invitations reçues (patron → moi) → accepter / refuser
 * - Bloc 4: Invitations envoyées en attente → annuler
 */
export function InviteSection() {
  const {
    pendingSent,
    pendingReceived,
    loading,
    error,
    searchResult,
    searching,
    searchError,
    searchByInviteCode,
    clearSearch,
    sendInvitation,
    acceptInvitation,
    refuseInvitation,
    cancelInvitation,
    myInviteCode,
    generateMyCode,
  } = useInvitations();

  const [codeInput, setCodeInput] = useState("");
  const [accessAgenda, setAccessAgenda] = useState(true);
  const [accessDashboard, setAccessDashboard] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Copier son propre code ────────────────────────────────────────────────

  const handleCopyCode = () => {
    if (!myInviteCode) return;
    navigator.clipboard.writeText(myInviteCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // ── Rechercher par code ───────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim().length < 4) return;
    searchByInviteCode(codeInput.trim());
  };

  // ── Envoyer une invitation ────────────────────────────────────────────────

  const handleSend = async () => {
    if (!searchResult) return;
    setSendError(null);
    setSendLoading(true);
    const { error } = await sendInvitation(codeInput.trim(), "owner", {
      accessAgenda,
      accessDashboard,
    });
    setSendLoading(false);
    if (error) {
      setSendError(error);
    } else {
      setCodeInput("");
      clearSearch();
    }
  };

  // ── Actions sur invitation reçue ─────────────────────────────────────────

  const handleAccept = async (inv: InAppInvitation) => {
    setActionLoading(inv.id);
    await acceptInvitation(inv.id);
    setActionLoading(null);
  };

  const handleRefuse = async (inv: InAppInvitation) => {
    setActionLoading(inv.id);
    await refuseInvitation(inv.id);
    setActionLoading(null);
  };

  const handleCancel = async (inv: InAppInvitation) => {
    setActionLoading(inv.id);
    await cancelInvitation(inv.id);
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* ── Bloc 1 : Mon code unique ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
          Mon code unique
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Partage ce code avec ton patron pour qu'il puisse t'inviter depuis l'application.
        </p>
        <div className="flex items-center gap-3 pt-1">
          {myInviteCode ? (
            <>
              <span className="font-mono font-black text-2xl tracking-[0.3em] text-[var(--color-primary)] select-all">
                {myInviteCode}
              </span>
              <button
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  copiedCode
                    ? "border-[var(--color-success)]/40 text-[var(--color-success)] bg-[var(--color-success)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40"
                }`}
              >
                {copiedCode ? <IconCheck /> : <IconCopy />}
                {copiedCode ? "Copié !" : "Copier"}
              </button>
            </>
          ) : (
            <button
              onClick={async () => { setGenerating(true); await generateMyCode(); setGenerating(false); }}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {generating ? "Génération…" : "Générer mon code"}
            </button>
          )}
        </div>
      </div>

      {/* ── Bloc 2 : Inviter un patron ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
          Inviter un patron
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Entre le code de ton patron pour lui envoyer une demande d'accès.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Code (ex. A1B2C3D4)"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.toUpperCase());
              if (searchResult) clearSearch();
              setSendError(null);
            }}
            maxLength={8}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm font-mono font-bold focus:border-[var(--color-primary)]/60 focus:outline-none transition-all placeholder:text-[var(--color-text-faint)] placeholder:font-sans"
          />
          <button
            type="submit"
            disabled={codeInput.trim().length < 4 || searching}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-sm font-bold hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 disabled:opacity-40 transition-all"
          >
            <IconSearch />
            {searching ? "…" : "Chercher"}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-[var(--color-error)]">{searchError}</p>
        )}

        {searchResult && (
          <div className="rounded-xl border border-[var(--color-border-cyan,var(--color-primary))]/30 bg-[var(--color-accent-cyan,var(--color-primary))]/5 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                <IconUser />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--color-text)]">
                  {[searchResult.prenom, searchResult.nom].filter(Boolean).join(" ") || "Utilisateur"}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                  Trouvé · {codeInput}
                </p>
              </div>
            </div>

            {/* Options d'accès */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                Accès à accorder
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accessAgenda}
                  onChange={(e) => setAccessAgenda(e.target.checked)}
                  className="rounded accent-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text-muted)]">Agenda</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accessDashboard}
                  onChange={(e) => setAccessDashboard(e.target.checked)}
                  className="rounded accent-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-text-muted)]">Tableau de bord</span>
              </label>
            </div>

            {sendError && (
              <p className="text-xs text-[var(--color-error)]">{sendError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sendLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <IconMail />
                {sendLoading ? "Envoi…" : "Envoyer l'invitation"}
              </button>
              <button
                onClick={() => { clearSearch(); setCodeInput(""); }}
                className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs hover:text-[var(--color-text)] transition-all"
              >
                <IconX />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bloc 3 : Invitations reçues ── */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1">
            Demandes reçues ({pendingReceived.length})
          </p>
          {pendingReceived.map((inv) => (
            <InvitationCard
              key={inv.id}
              inv={inv}
              direction="received"
              actionLoading={actionLoading === inv.id}
              onAccept={() => handleAccept(inv)}
              onRefuse={() => handleRefuse(inv)}
            />
          ))}
        </div>
      )}

      {/* ── Bloc 4 : Invitations envoyées ── */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1">
            En attente de réponse ({pendingSent.length})
          </p>
          {pendingSent.map((inv) => (
            <InvitationCard
              key={inv.id}
              inv={inv}
              direction="sent"
              actionLoading={actionLoading === inv.id}
              onCancel={() => handleCancel(inv)}
            />
          ))}
        </div>
      )}

      {pendingReceived.length === 0 && pendingSent.length === 0 && !loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Aucune invitation en attente</p>
        </div>
      )}
    </div>
  );
}

// ─── Carte d'invitation ───────────────────────────────────────────────────────

interface InvitationCardProps {
  inv: InAppInvitation;
  direction: "sent" | "received";
  actionLoading: boolean;
  onAccept?: () => void;
  onRefuse?: () => void;
  onCancel?: () => void;
}

function InvitationCard({ inv, direction, actionLoading, onAccept, onRefuse, onCancel }: InvitationCardProps) {
  const name = inv.other_name ?? inv.patron_nom ?? (direction === "sent" ? "Patron" : "Ouvrier");
  const date = new Date(inv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
        <IconUser />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[var(--color-text)] truncate">{name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          {direction === "received" ? "Demande reçue" : "Invitation envoyée"} · {date}
        </p>
        <div className="flex gap-1.5 mt-1">
          {inv.access_agenda && (
            <span className="text-[9px] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] uppercase tracking-wider">Agenda</span>
          )}
          {inv.access_dashboard && (
            <span className="text-[9px] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] uppercase tracking-wider">Dashboard</span>
          )}
        </div>
      </div>
      {direction === "received" ? (
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onAccept}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-success)]/20 border border-[var(--color-success)]/30 text-[var(--color-success)] text-xs font-bold hover:bg-[var(--color-success)]/30 disabled:opacity-50 transition-all"
          >
            Accepter
          </button>
          <button
            onClick={onRefuse}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-bold hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 disabled:opacity-50 transition-all"
          >
            Refuser
          </button>
        </div>
      ) : (
        <button
          onClick={onCancel}
          disabled={actionLoading}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-bold hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 disabled:opacity-50 transition-all"
        >
          Annuler
        </button>
      )}
    </div>
  );
}

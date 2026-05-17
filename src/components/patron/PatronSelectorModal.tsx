// src/components/patron/PatronSelectorModal.tsx
// Sélecteur d'ouvrier quand le patron a plusieurs accès actifs.

import React from "react";
import type { PatronAccessProfile } from "../../types/profile";

interface OwnerInfo {
  profileId: string;    // PatronAccessProfile.id
  ownerName: string;    // nom de l'ouvrier (dénormalisé lors du chargement)
  patronNom: string;    // nom de l'entrée patrons chez cet ouvrier
}

interface PatronSelectorModalProps {
  owners: OwnerInfo[];
  onSelect: (profileId: string) => void;
}

export function PatronSelectorModal({ owners, onSelect }: PatronSelectorModalProps) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl border border-slate-700 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-xl">👥</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-100">
            Choisir un employeur
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Vous avez accès à plusieurs employeurs
          </p>
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {owners.map((owner) => (
            <button
              key={owner.profileId}
              onClick={() => onSelect(owner.profileId)}
              className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-800/50 hover:bg-slate-700/60 hover:border-indigo-500/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-base">👔</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                    {owner.ownerName}
                  </p>
                  {owner.patronNom && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      En tant que : {owner.patronNom}
                    </p>
                  )}
                </div>
                <svg
                  className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hook utilitaire : charger les infos de l'ouvrier ────────────────────────
// Utilisé dans PatronView pour enrichir les PatronAccessProfile avec les noms.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";

export interface EnrichedAccess {
  profileId: string;
  ownerUserId: string;   // = owner_id (même que profiles.id de l'ouvrier)
  patronId: string;      // patrons.id
  ownerName: string;
  patronNom: string;
  access_agenda: boolean;
  access_dashboard: boolean;
}

export function useEnrichedPatronAccesses(): {
  accesses: EnrichedAccess[];
  loading: boolean;
  refresh: () => void;
} {
  const [accesses, setAccesses] = useState<EnrichedAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Source de vérité pour les accès multi-ouvriers : patron_invitations
        // (profiles ne peut stocker qu'une paire owner_id/patron_id à la fois)
        const { data: invitations, error: invErr } = await supabase
          .from("patron_invitations")
          .select("id, owner_id, patron_id, access_agenda, access_dashboard, target_name, inviter_name")
          .eq("patron_user_id", user.id)
          .eq("status", "accepted")
          .eq("method", "in_app");

        if (invErr || !invitations?.length) return;

        const enriched: EnrichedAccess[] = [];

        for (const inv of invitations) {
          // Nom de l'ouvrier : target_name stocké à la création sinon requête profil
          let ownerName: string = inv.target_name || "";
          if (!ownerName && inv.owner_id) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("prenom, nom")
              .eq("id", inv.owner_id)
              .maybeSingle();
            ownerName = [ownerProfile?.prenom, ownerProfile?.nom].filter(Boolean).join(" ") || "Ouvrier";
          }

          enriched.push({
            profileId: inv.id,            // ID de l'invitation = identifiant unique d'accès
            ownerUserId: inv.owner_id as string,
            patronId: inv.patron_id as string,
            ownerName,
            patronNom: inv.inviter_name || "",  // nom du patron tel qu'enregistré
            access_agenda: (inv.access_agenda as boolean) ?? false,
            access_dashboard: (inv.access_dashboard as boolean) ?? false,
          });
        }

        if (alive) setAccesses(enriched);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tick]);

  return { accesses, loading, refresh };
}

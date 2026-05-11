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
      <div className="w-full max-w-sm bg-[#1e293b] rounded-2xl border border-slate-700 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
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

import { useState, useEffect } from "react";
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
} {
  const [accesses, setAccesses] = useState<EnrichedAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Charger les profils d'accès actifs pour cet utilisateur patron
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("id, owner_id, patron_id, features")
          .eq("id", user.id)
          .eq("role", "patron")
          .eq("status", "active");

        if (pErr || !profiles?.length) return;

        const enriched: EnrichedAccess[] = [];

        for (const p of profiles) {
          // Charger nom de l'ouvrier depuis profiles
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("prenom, nom")
            .eq("id", p.owner_id)
            .maybeSingle();

          // Charger nom du patron depuis patrons
          const { data: patronEntry } = await supabase
            .from("patrons")
            .select("nom")
            .eq("id", p.patron_id)
            .maybeSingle();

          const features = (p.features ?? {}) as Record<string, unknown>;
          enriched.push({
            profileId: p.id,
            ownerUserId: p.owner_id as string,
            patronId: p.patron_id as string,
            ownerName: [ownerProfile?.prenom, ownerProfile?.nom].filter(Boolean).join(" ") || "Employeur",
            patronNom: (patronEntry?.nom as string) || "",
            access_agenda: (features["access_agenda"] as boolean) ?? false,
            access_dashboard: (features["access_dashboard"] as boolean) ?? false,
          });
        }

        if (alive) setAccesses(enriched);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { accesses, loading };
}

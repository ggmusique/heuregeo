import { useState, useEffect, useMemo } from "react";
import type { UserProfile } from "../types/profile";
import type { TabId } from "../types/ui";

// ─── Types de retour ────────────────────────────────────────────────────────

export interface NavItem {
  key: TabId;
  label: string;
  icon: string;
  activeClass: string;
  onClick?: () => void;
}

export interface UseNavigationReturn {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  canAgenda: boolean;
  canDashboard: boolean;
  isViewer: boolean;
  proNavItems: NavItem[];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNavigation(profile: UserProfile | null): UseNavigationReturn {
  const features = profile?.features || {};
  const isPro = features?.plan === "pro";
  const isViewer = profile?.role === "viewer";
  const canAgenda = features?.agenda === true || features?.access_agenda === true;
  const canDashboard = features?.dashboard === true || features?.access_dashboard === true;

  const [activeTab, setActiveTab] = useState<TabId>("saisie");

  useEffect(() => {
    if (isViewer) setActiveTab("suivi");
  }, [isViewer]);

  useEffect(() => {
    if (!canAgenda && activeTab === "agenda") setActiveTab("saisie");
  }, [canAgenda, activeTab]);

  useEffect(() => {
    if (!canDashboard && activeTab === "dashboard") setActiveTab("suivi");
  }, [canDashboard, activeTab]);

  const proNavItems = useMemo<NavItem[]>(
    () => [
      ...(!isViewer
        ? [{ key: "saisie" as TabId, label: "Saisie", icon: "📝", activeClass: "from-[var(--color-accent-violet)] to-[color-mix(in_srgb,var(--color-accent-violet)_70%,black)]" }]
        : []),
      ...(canDashboard && !isViewer
        ? [{ key: "dashboard" as TabId, label: "Dashboard", icon: "📊", activeClass: "from-[var(--color-accent-fuchsia)] to-[var(--color-accent-violet)]" }]
        : []),
      { key: "suivi", label: "Suivi", icon: "📈", activeClass: "from-[var(--color-accent-cyan)] to-[var(--color-accent-violet)]" },
      ...(canAgenda
        ? [{ key: "agenda" as TabId, label: "Agenda", icon: "📅", activeClass: "from-[var(--color-accent-green)] to-[color-mix(in_srgb,var(--color-accent-green)_70%,black)]" }]
        : []),
      ...(!isViewer
        ? [{ key: "parametres" as TabId, label: "Parametres", icon: "⚙️", activeClass: "from-[var(--color-accent-violet)] to-[var(--color-accent-fuchsia)]" }]
        : []),
      ...(profile?.is_admin === true
        ? [{ key: "health" as TabId, label: "Santé", icon: "🛡️", activeClass: "from-[var(--color-accent-cyan)] to-[var(--color-accent-violet)]" }]
        : []),
    ],
    [isPro, isViewer, canAgenda, canDashboard, profile?.is_admin]
  );

  return { activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems };
}

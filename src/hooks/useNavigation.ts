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
        ? [{ key: "saisie" as TabId, label: "Saisie", icon: "📝", activeClass: "from-indigo-600 to-indigo-800" }]
        : []),
      ...(canDashboard && !isViewer
        ? [{ key: "dashboard" as TabId, label: "Dashboard", icon: "📊", activeClass: "from-violet-600 to-indigo-700" }]
        : []),
      { key: "suivi", label: "Suivi", icon: "📈", activeClass: "from-cyan-600 to-indigo-700" },
      ...(canAgenda
        ? [{ key: "agenda" as TabId, label: "Agenda", icon: "📅", activeClass: "from-emerald-600 to-teal-700" }]
        : []),
      ...(!isViewer
        ? [{ key: "parametres" as TabId, label: "Parametres", icon: "⚙️", activeClass: "from-indigo-600 to-purple-700" }]
        : []),
    ],
    [isPro, isViewer, canAgenda, canDashboard]
  );

  return { activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems };
}

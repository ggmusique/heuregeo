import { useState, useEffect, useMemo } from "react";

export function useNavigation(profile) {
  const features = profile?.features || {};
  const isPro = features?.plan === "pro";
  const isViewer = profile?.role === "viewer";
  const canAgenda = features?.agenda === true;
  const canDashboard = features?.dashboard === true;

  const [activeTab, setActiveTab] = useState("saisie");

  useEffect(() => {
    if (isViewer) setActiveTab("suivi");
  }, [isViewer]);

  useEffect(() => {
    if (!canAgenda && activeTab === "agenda") setActiveTab("saisie");
  }, [canAgenda, activeTab]);

  useEffect(() => {
    if (!canDashboard && activeTab === "dashboard") setActiveTab("suivi");
  }, [canDashboard, activeTab]);

  const proNavItems = useMemo(
    () => [
      { key: "saisie", label: "Saisie", icon: "📝", activeClass: "from-indigo-600 to-indigo-800" },
      ...(canDashboard && !isViewer
        ? [{ key: "dashboard", label: "Dashboard", icon: "📊", activeClass: "from-violet-600 to-indigo-700" }]
        : []),
      { key: "suivi", label: "Suivi", icon: "📈", activeClass: "from-cyan-600 to-indigo-700" },
      ...(canAgenda
        ? [{ key: "agenda", label: "Agenda", icon: "📅", activeClass: "from-emerald-600 to-teal-700" }]
        : []),
      { key: "parametres", label: "Parametres", icon: "⚙️", activeClass: "from-indigo-600 to-purple-700" },
    ],
    [isPro, isViewer, canAgenda, canDashboard]
  );

  return { activeTab, setActiveTab, canAgenda, canDashboard, isViewer, proNavItems };
}

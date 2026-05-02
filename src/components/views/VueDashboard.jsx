import React from "react";
import { DashboardPanel } from "../dashboard/DashboardPanel";

export function VueDashboard({
  missions,
  fraisDivers,
  listeAcomptes,
  patrons,
  clients,
  lieux,
  profile,
  kmSettings,
  domicileLatLng,
}) {
  return (
    <DashboardPanel
      missions={missions}
      fraisDivers={fraisDivers}
      listeAcomptes={listeAcomptes}
      patrons={patrons}
      clients={clients}
      lieux={lieux}
      profile={profile}
      kmSettings={kmSettings}
      domicileLatLng={domicileLatLng}
    />
  );
}

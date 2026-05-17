import React from "react";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import type { AgendaEvent } from "../../types/entities";

interface Props {
  missions?: any[];
  fraisDivers?: any[];
  listeAcomptes?: any[];
  patrons?: any[];
  clients?: any[];
  lieux?: any[];
  profile?: any;
  kmSettings?: any;
  domicileLatLng?: { lat: number; lng: number } | null;
  agendaEvents?: AgendaEvent[];
}

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
  agendaEvents,
}: Props) {
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
      agendaEvents={agendaEvents}
    />
  );
}

import React from "react";
import { SuiviTab } from "../../pages/SuiviTab";

export function VueSuivi({ defaultView, historiqueProps, bilanProps, onNavigateDashboard }) {
  return (
    <SuiviTab
      defaultView={defaultView}
      historiqueProps={historiqueProps}
      bilanProps={bilanProps}
      onNavigateDashboard={onNavigateDashboard}
    />
  );
}

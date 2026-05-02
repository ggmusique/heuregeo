import React from "react";
import { SuiviTab } from "../../pages/SuiviTab";

export function VueSuivi({ defaultView, dashboardProps, historiqueProps, bilanProps }) {
  return (
    <SuiviTab
      defaultView={defaultView}
      dashboardProps={dashboardProps}
      historiqueProps={historiqueProps}
      bilanProps={bilanProps}
    />
  );
}

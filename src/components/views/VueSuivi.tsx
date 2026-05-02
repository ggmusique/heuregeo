import React from "react";
import { SuiviTab } from "../../pages/SuiviTab";

interface Props {
  defaultView?: any;
  historiqueProps?: any;
  bilanProps?: any;
  onNavigateDashboard?: () => void;
}

export function VueSuivi({ defaultView, historiqueProps, bilanProps, onNavigateDashboard }: Props) {
  return (
    <SuiviTab
      defaultView={defaultView}
      historiqueProps={historiqueProps}
      bilanProps={bilanProps}
      onNavigateDashboard={onNavigateDashboard}
    />
  );
}

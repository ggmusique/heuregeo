import React from "react";

interface ViewerBadgeProps {
  patronNom: string;
}

export const ViewerBadge = ({ patronNom }: ViewerBadgeProps) => (
  <div className="text-center py-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60">
      👁 Vue lecture seule — {patronNom}
    </span>
  </div>
);

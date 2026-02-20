import React from "react";

export const ViewerBadge = ({ patronNom }) => (
  <div className="text-center py-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60">
      👁 Vue lecture seule — {patronNom}
    </span>
  </div>
);

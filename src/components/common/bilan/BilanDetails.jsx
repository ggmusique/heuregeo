// components/common/bilan/BilanDetail.js
import React from "react";
import { formatEuro, formatHeures, formatDateFR } from "../../../utils/formatters";
import { useLabels } from "../../../contexts/LabelsContext";

export const BilanDetail = ({
  bilanPeriodType,
  bilanContent,
}) => {
  const L = useLabels();
  if (!bilanContent) return null;

  return (
    <div className="space-y-8">
      {bilanPeriodType === "semaine" && bilanContent.filteredData?.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-black uppercase text-white mb-5 tracking-wider">DÉTAIL DES MISSIONS</h3>
          <div className="space-y-4">
            {bilanContent.filteredData
              .sort((a, b) => new Date(a.date_iso) - new Date(b.date_iso))
              .map((m) => (
                <div key={m.id} className="p-5 md:p-6 bg-purple-900/30 rounded-2xl border border-purple-500/30 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{m.client}</p>
                      <p className="text-sm opacity-80 mt-1">
                        {formatDateFR(m.date_iso)} • {m.debut} → {m.fin}
                        {m.pause > 0 && ` (${m.pause} min pause)`}
                      </p>
                      <p className="text-xs opacity-70 mt-1">{m.lieu || `${L.lieu} non précisé`}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl md:text-2xl font-black text-green-400 amount-safe">{formatEuro(m.montant || 0)}</p>
                      <p className="text-sm opacity-80">{formatHeures(m.duree || 0)}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {bilanPeriodType === "mois" && bilanContent.groupedData?.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-black uppercase text-white mb-5 tracking-wider">REGROUPEMENT PAR SEMAINE</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bilanContent.groupedData.map((group, index) => (
              <div key={index} className="p-5 md:p-6 bg-purple-900/40 rounded-2xl border border-purple-500/30 shadow-lg">
                <h4 className="text-lg font-bold text-white mb-3">{group.label}</h4>
                <div className="flex justify-between text-white/90 text-sm mb-2">
                  <span>Heures :</span>
                  <span className="font-bold">{group.h.toFixed(2)} h</span>
                </div>
                <div className="flex justify-between text-white/90 text-sm">
                  <span>Montant :</span>
                  <span className="font-bold text-green-400 amount-safe">{formatEuro(group.e)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bilanPeriodType === "mois" && (!bilanContent.groupedData || bilanContent.groupedData.length === 0) && (
        <div className="text-center py-12 opacity-70">
          <p className="text-xl font-black">Aucune donnée pour ce mois</p>
          <p className="mt-4">Aucune mission trouvée pour la période sélectionnée.</p>
        </div>
      )}

      {bilanPeriodType === "annee" && bilanContent.groupedData?.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-black uppercase text-white mb-5 tracking-wider">REGROUPEMENT PAR MOIS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bilanContent.groupedData.map((group, index) => (
              <div key={index} className="p-5 md:p-6 bg-indigo-900/40 rounded-2xl border border-indigo-500/30 shadow-lg">
                <h4 className="text-lg font-bold text-white mb-3">{group.label}</h4>
                <div className="flex justify-between text-white/90 text-sm mb-2">
                  <span>Heures :</span>
                  <span className="font-bold">{group.h.toFixed(2)} h</span>
                </div>
                <div className="flex justify-between text-white/90 text-sm">
                  <span>Montant :</span>
                  <span className="font-bold text-green-400 amount-safe">{formatEuro(group.e)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(bilanContent.fraisDivers?.length > 0 ||
        bilanContent.impayePrecedent > 0 ||
        bilanContent.soldeAcomptesAvant > 0 ||
        bilanContent.acomptesDansPeriode > 0 ||
        bilanContent.acompteConsommePeriode > 0 ||
        bilanContent.soldeAcomptesApres > 0) && (
        <div className="mt-10 p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-[35px] border border-indigo-500/30">
          <p className="text-[10px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">Suivi des acomptes & impayés</p>
          <div className="space-y-3">
            {bilanContent.impayePrecedent !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Impayé précédent :</span>
                <span className="font-bold text-orange-400">+{formatEuro(bilanContent.impayePrecedent)}</span>
              </div>
            )}
            {bilanContent.soldeAcomptesAvant !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Solde avant période :</span>
                <span className="font-bold text-white">{formatEuro(bilanContent.soldeAcomptesAvant)}</span>
              </div>
            )}
            {bilanContent.acomptesDansPeriode !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Reçus cette période :</span>
                <span className="font-bold text-cyan-300 amount-safe">+{formatEuro(bilanContent.acomptesDansPeriode)}</span>
              </div>
            )}
            {bilanContent.acompteConsommePeriode !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Consommé :</span>
                <span className="font-bold text-cyan-300 amount-safe">-{formatEuro(bilanContent.acompteConsommePeriode)}</span>
              </div>
            )}
            {bilanContent.soldeAcomptesApres !== 0 && (
              <div className="pt-3 border-t border-white/10 flex justify-between">
                <span className="text-[10px] font-black uppercase text-white/80">Solde restant à reporter :</span>
                <span className="text-xl font-black text-green-400 amount-safe">{formatEuro(bilanContent.soldeAcomptesApres)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

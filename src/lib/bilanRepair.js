export function computeRepairDecision(bilan, allocByWeek = {}) {
  const ca = parseFloat(bilan?.ca_brut_periode || 0);
  const alloueReel = allocByWeek[bilan?.periode_index] || 0;
  const resteReel = Math.max(0, ca - alloueReel);
  const payeReel = bilan?.paye === true || resteReel <= 0.01;

  const acompteConsommeInDB = parseFloat(bilan?.acompte_consomme || 0);
  const resteInDB = parseFloat(bilan?.reste_a_percevoir || 0);

  const expectedReste = payeReel ? 0 : resteReel;
  const needsFix =
    Math.abs(acompteConsommeInDB - alloueReel) > 0.01 ||
    Math.abs(resteInDB - expectedReste) > 0.01;

  return {
    needsFix,
    alloueReel,
    resteReel,
    payeReel,
    payload: {
      acompte_consomme: alloueReel,
      reste_a_percevoir: expectedReste,
      paye: payeReel,
    },
  };
}

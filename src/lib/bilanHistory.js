export function buildAllocByWeek(allocs = []) {
  return (allocs || []).reduce((acc, a) => {
    const idx = a?.periode_index;
    acc[idx] = (acc[idx] || 0) + (parseFloat(a?.amount) || 0);
    return acc;
  }, {});
}

export function normalizeHistoriqueRows(rows = [], allocByWeek = {}, resolvePatronNom = () => "Inconnu") {
  return (rows || []).map((r) => {
    const patron_nom = resolvePatronNom(r.patron_id);
    if (r.paye === true) {
      return { ...r, patron_nom, paye: true, reste_a_percevoir: 0 };
    }

    const ca = parseFloat(r.ca_brut_periode || 0);
    const alloue = allocByWeek[r.periode_index] || 0;
    const resteReel = Math.max(0, ca - alloue);
    const payeNormalise = resteReel <= 0.01;
    return { ...r, patron_nom, paye: payeNormalise, reste_a_percevoir: resteReel };
  });
}

export function splitHistoriqueRows(rows = []) {
  const impayes = (rows || [])
    .filter((r) => r.paye === false)
    .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));

  const payes = (rows || [])
    .filter((r) => r.paye === true)
    .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));

  return { impayes, payes, all: rows || [] };
}

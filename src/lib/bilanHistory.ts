import type { AcompteAllocation, BilanRow, HistoriqueRow, NormalizedHistorique } from "../types/bilan.ts";

export function buildAllocByWeek(allocs: AcompteAllocation[] = []): Record<number, number> {
  return allocs.reduce((acc: Record<number, number>, a: AcompteAllocation) => {
    const idx = a?.periode_index;
    acc[idx] = (acc[idx] || 0) + (parseFloat(a?.amount as string) || 0);
    return acc;
  }, {});
}

export function normalizeHistoriqueRows(
  rows: BilanRow[] = [],
  allocByWeek: Record<number, number> = {},
  resolvePatronNom: (id: string | null | undefined) => string = () => "Inconnu"
): HistoriqueRow[] {
  return rows.map((r) => {
    const patron_nom = resolvePatronNom(r.patron_id);
    if (r.paye === true) {
      return { ...r, patron_nom, paye: true as const, reste_a_percevoir: 0 };
    }

    const ca = parseFloat(r.ca_brut_periode as string || "0");
    const alloue = allocByWeek[r.periode_index] || 0;
    const resteReel = Math.max(0, ca - alloue);
    const payeNormalise = resteReel <= 0.01;
    return { ...r, patron_nom, paye: payeNormalise, reste_a_percevoir: resteReel };
  });
}

export function splitHistoriqueRows(rows: HistoriqueRow[] = []): NormalizedHistorique {
  const impayes = rows
    .filter((r) => r.paye === false)
    .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));

  const payes = rows
    .filter((r) => r.paye === true)
    .sort((a, b) => Number(b.periode_value) - Number(a.periode_value));

  return { impayes, payes, all: rows };
}

import { describe, expect, it } from "vitest";
import { buildPdfFilename } from "../../utils/pdfFilename";

describe("buildPdfFilename", () => {
  it("génère un nom semaine avec prénom", () => {
    expect(buildPdfFilename("Geoffrey", null, "semaine", "19")).toBe("Geoffrey semaine 19.pdf");
  });

  it("génère un nom semaine avec nom en fallback", () => {
    expect(buildPdfFilename(null, "Dupont", "semaine", "19")).toBe("Dupont semaine 19.pdf");
  });

  it("génère un nom mois avec prénom + accent", () => {
    // Élodie → accent supprimé → Elodie
    expect(buildPdfFilename("Élodie", null, "mois", "2026-05")).toBe("Elodie mai 2026.pdf");
  });

  it("génère un nom mois sans accent", () => {
    expect(buildPdfFilename("Annie", null, "mois", "2026-05")).toBe("Annie mai 2026.pdf");
  });

  it("génère un nom année", () => {
    expect(buildPdfFilename("Annie", null, "annee", "2026")).toBe("Annie 2026.pdf");
  });

  it("utilise 'bilan' si prénom et nom sont vides", () => {
    expect(buildPdfFilename(null, null, "semaine", "19")).toBe("bilan semaine 19.pdf");
  });

  it("supprime les caractères spéciaux du nom", () => {
    expect(buildPdfFilename("Jean-Pierre", null, "semaine", "20")).toBe("JeanPierre semaine 20.pdf");
  });

  it("gère correctement les 12 mois", () => {
    const moisAttendus = [
      "janvier", "fevrier", "mars", "avril", "mai", "juin",
      "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
    ];
    moisAttendus.forEach((mois, idx) => {
      const month = String(idx + 1).padStart(2, "0");
      expect(buildPdfFilename("Test", null, "mois", `2026-${month}`)).toBe(`Test ${mois} 2026.pdf`);
    });
  });

  it("n'a pas d'espaces multiples dans le nom final", () => {
    expect(buildPdfFilename("  Marie  ", null, "semaine", "7")).toBe("Marie semaine 7.pdf");
  });
});

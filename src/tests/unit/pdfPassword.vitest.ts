import { describe, expect, it } from "vitest";
import { evaluatePasswordStrength } from "../../utils/pdfPassword";

describe("evaluatePasswordStrength", () => {
  it("retourne invalide si longueur minimale absente", () => {
    const result = evaluatePasswordStrength("abc");
    expect(result.isValid).toBe(false);
    expect(result.strength).toBe("faible");
  });

  it("retourne moyenne pour un mot de passe valide simple", () => {
    const result = evaluatePasswordStrength("abcdef");
    expect(result.isValid).toBe(true);
    expect(result.strength).toBe("moyenne");
  });

  it("retourne forte si longueur >= 10 avec majuscule + chiffre", () => {
    const result = evaluatePasswordStrength("MonSecret12");
    expect(result.isValid).toBe(true);
    expect(result.strength).toBe("forte");
  });
});
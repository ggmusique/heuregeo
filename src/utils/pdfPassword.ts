export type PasswordStrength = "faible" | "moyenne" | "forte";

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;
  message: string;
}

export const MIN_PASSWORD_LENGTH = 6;

export function evaluatePasswordStrength(password: string): PasswordValidationResult {
  const trimmed = password.trim();
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasDigit = /\d/.test(trimmed);
  const hasSymbol = /[^A-Za-z0-9]/.test(trimmed);

  const baseScore = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  const lengthBonus = trimmed.length >= 10 ? 2 : trimmed.length >= MIN_PASSWORD_LENGTH ? 1 : 0;
  const score = baseScore + lengthBonus;

  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      strength: "faible",
      score,
      message: `Minimum ${MIN_PASSWORD_LENGTH} caractères requis.`,
    };
  }

  if (trimmed.length >= 10 && hasUpper && hasDigit) {
    return {
      isValid: true,
      strength: "forte",
      score,
      message: "Mot de passe fort.",
    };
  }

  return {
    isValid: true,
    strength: "moyenne",
    score,
    message: "Mot de passe correct, vous pouvez le renforcer.",
  };
}
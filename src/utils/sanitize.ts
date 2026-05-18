export const sanitizeText = (value: string): string =>
  value.trim().slice(0, 500).replace(/[<>]/g, "");

export const sanitizeName = (value: string): string =>
  value.trim().slice(0, 100).replace(/[<>]/g, "");

export const sanitizeNotes = (value: string): string =>
  value.trim().slice(0, 1000).replace(/[<>]/g, "");

// ─── Sanitisation des erreurs API ─────────────────────────────────────────────

/**
 * Clés de patterns techniques qui ne doivent JAMAIS être affichées à un utilisateur.
 * Ces patterns indiquent des erreurs Postgres/Supabase internes.
 */
const INTERNAL_ERROR_PATTERNS = [
  /SQLSTATE/i,
  /relation .* does not exist/i,
  /column .* of relation/i,
  /violates foreign key constraint/i,
  /duplicate key value violates/i,
  /supabase_url/i,
  /service_role/i,
  /anon_key/i,
  /jwt/i,
  /bearer/i,
];

/**
 * Transforme un message d'erreur API/Supabase en message lisible et sécurisé
 * pour l'affichage utilisateur.
 *
 * - Masque les détails techniques Postgres
 * - Conserve les messages métier (déjà prêts pour l'utilisateur)
 * - Limite la longueur
 */
export function sanitizeErrorForDisplay(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Erreur inconnue";

  // Tronquer pour éviter les messages excessivement longs
  const truncated = raw.slice(0, 300);

  // Vérifier si le message contient des patterns techniques internes
  const isTechnical = INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(truncated));

  if (isTechnical) {
    return "Une erreur technique s'est produite. Veuillez réessayer ou contacter le support.";
  }

  return truncated;
}


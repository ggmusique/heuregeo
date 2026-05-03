export function logBilanError(scope: string, error: unknown, context: Record<string, unknown> = {}): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  console.error("❌ BILAN_ERROR", {
    scope,
    timestamp,
    message,
    context,
    error,
  });
}

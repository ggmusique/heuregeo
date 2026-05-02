export function logBilanError(scope: string, error: any, context: Record<string, any> = {}): void {
  const timestamp = new Date().toISOString();
  console.error("❌ BILAN_ERROR", {
    scope,
    timestamp,
    message: error?.message || String(error),
    context,
    error,
  });
}

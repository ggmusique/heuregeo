export function logBilanError(scope, error, context = {}) {
  const timestamp = new Date().toISOString();
  console.error("❌ BILAN_ERROR", {
    scope,
    timestamp,
    message: error?.message || String(error),
    context,
    error,
  });
}

export function logBilanError(scope, error, context = {}) {
  console.error("❌ BILAN_ERROR", {
    scope,
    message: error?.message || String(error),
    context,
    error,
  });
}

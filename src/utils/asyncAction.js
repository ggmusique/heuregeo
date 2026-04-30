import { COMMON_MESSAGES } from "../constants/messages";

export async function runAsyncAction({
  run,
  onSuccess,
  onError,
  fallbackErrorMessage,
}) {
  try {
    const result = await run();
    onSuccess?.(result);
    return { ok: true, result };
  } catch (err) {
    const message = err?.message || fallbackErrorMessage;
    onError?.(`${COMMON_MESSAGES.ERROR_PREFIX}${message}`);
    return { ok: false, error: err };
  }
}

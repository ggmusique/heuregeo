import { COMMON_MESSAGES } from "../constants/messages";

interface AsyncActionOptions {
  run: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (message: string) => void;
  fallbackErrorMessage?: string;
}

export async function runAsyncAction({
  run,
  onSuccess,
  onError,
  fallbackErrorMessage,
}: AsyncActionOptions) {
  try {
    const result = await run();
    onSuccess?.(result);
    return { ok: true, result };
  } catch (err: any) {
    const message = err?.message || fallbackErrorMessage || "erreur inconnue";
    onError?.(`${COMMON_MESSAGES.ERROR_PREFIX}${message}`);
    return { ok: false, error: err, message };
  }
}

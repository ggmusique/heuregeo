import test from "node:test";
import assert from "node:assert/strict";
import { runAsyncAction } from "../../utils/asyncAction.ts";

test("runAsyncAction retourne ok=true et appelle onSuccess", async () => {
  let successPayload = null;
  const result = await runAsyncAction({
    run: async () => ({ value: 42 }),
    onSuccess: (payload) => {
      successPayload = payload;
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, { value: 42 });
  assert.deepEqual(successPayload, { value: 42 });
});

test("runAsyncAction préfixe le message d'erreur et retourne ok=false", async () => {
  let errorMessage = null;
  const result = await runAsyncAction({
    run: async () => {
      throw new Error("boom");
    },
    onError: (message) => {
      errorMessage = message;
    },
    fallbackErrorMessage: "fallback",
  });

  assert.equal(result.ok, false);
  assert.equal(errorMessage, "Erreur : boom");
  assert.ok(result.error instanceof Error);
  assert.equal(result.message, "boom");
});

test("runAsyncAction utilise fallbackErrorMessage si erreur sans message", async () => {
  let errorMessage = null;
  const result = await runAsyncAction({
    run: async () => {
      throw {};
    },
    onError: (message) => {
      errorMessage = message;
    },
    fallbackErrorMessage: "erreur inconnue",
  });

  assert.equal(result.ok, false);
  assert.equal(errorMessage, "Erreur : erreur inconnue");
  assert.equal(result.message, "erreur inconnue");
});

test("runAsyncAction applique un fallback par défaut si aucun message n'est fourni", async () => {
  let errorMessage = null;
  const result = await runAsyncAction({
    run: async () => {
      throw {};
    },
    onError: (message) => {
      errorMessage = message;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(errorMessage, "Erreur : erreur inconnue");
  assert.equal(result.message, "erreur inconnue");
});

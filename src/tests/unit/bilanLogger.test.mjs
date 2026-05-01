import test from "node:test";
import assert from "node:assert/strict";
import { logBilanError } from "../../utils/bilanLogger.js";

test("logBilanError logue un payload structuré", () => {
  const calls = [];
  const original = console.error;
  console.error = (...args) => {
    calls.push(args);
  };

  try {
    const err = new Error("boom");
    logBilanError("generation_bilan", err, { patronId: "p1", periodType: "semaine" });
  } finally {
    console.error = original;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "❌ BILAN_ERROR");
  assert.equal(calls[0][1].scope, "generation_bilan");
  assert.equal(calls[0][1].message, "boom");
  assert.deepEqual(calls[0][1].context, { patronId: "p1", periodType: "semaine" });
});

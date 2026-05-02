import test from "node:test";
import assert from "node:assert/strict";
import { mapWeatherCode } from "../../services/weatherService.ts";

test("mapWeatherCode mappe pluie", () => {
  assert.deepEqual(mapWeatherCode(63), { icon: "09d", desc: "Pluie" });
});

test("mapWeatherCode mappe orage", () => {
  assert.deepEqual(mapWeatherCode(95), { icon: "11d", desc: "Orage" });
});

test("mapWeatherCode fallback ensoleillé", () => {
  assert.deepEqual(mapWeatherCode(0), { icon: "01d", desc: "Ensoleillé" });
});

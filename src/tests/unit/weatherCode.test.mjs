import test from "node:test";
import assert from "node:assert/strict";
import { mapWeatherCode } from "../../utils/weatherCode.ts";

test("mapWeatherCode ciel clair (ensoleillé)", () => {
  assert.deepEqual(mapWeatherCode(0), { icon: "01d", desc: "Ensoleillé" });
});

test("mapWeatherCode pluie", () => {
  assert.deepEqual(mapWeatherCode(63), { icon: "09d", desc: "Pluie" });
});

test("mapWeatherCode neige", () => {
  assert.deepEqual(mapWeatherCode(73), { icon: "13d", desc: "Neige" });
});

test("mapWeatherCode orage", () => {
  assert.deepEqual(mapWeatherCode(95), { icon: "11d", desc: "Orage" });
});

test("mapWeatherCode nuageux", () => {
  assert.deepEqual(mapWeatherCode(2), { icon: "02d", desc: "Nuageux" });
});

export function getKmEnabled(features = {}) {
  return features?.km_enable === true || features?.kilometrage === true;
}
/**
 * Single source of truth helpers for the "Frais kilométriques" toggle.
 *
 * Canonical field: profiles.features.km_settings.enabled (boolean)
 * Legacy field:    features.km_enabled (kept in sync, same value)
 * Obsolete field:  features.km_enable  (must never be used – ignored / removed on save)
 */

/**
 * Returns whether km fees are enabled for the given features object.
 * Priority: km_settings.enabled → km_enabled → false
 *
 * @param {object} features - profile.features (may be null/undefined)
 * @returns {boolean}
 */
export function getKmEnabled(features) {
  const f = features ?? {};
  const ks = f.km_settings ?? {};
  if (typeof ks.enabled === "boolean") return ks.enabled;
  if (typeof f.km_enabled === "boolean") return f.km_enabled;
  return false;
}

/**
 * Returns a new features object with km enabled/disabled, without losing any
 * other feature flags (plan, export_pdf, etc.).
 *
 * Always writes:
 *   - km_settings.enabled = enabled
 *   - km_enabled = enabled
 * Never touches anything else; removes obsolete km_enable key.
 *
 * @param {object} features - current profile.features (may be null/undefined)
 * @param {boolean} enabled
 * @returns {object} newFeatures (deep-merged)
 */
export function setKmEnabled(features, enabled) {
  const f = features ?? {};
  const { km_enable: _drop, ...rest } = f; // eslint-disable-line no-unused-vars
  return {
    ...rest,
    km_enabled: enabled,
    km_settings: {
      ...(f.km_settings ?? {}),
      enabled,
    },
  };
}

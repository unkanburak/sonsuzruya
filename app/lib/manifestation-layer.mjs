// Bounded canonical manifestation layer.
//
// This module owns only four allow-listed optional physical entities. It never
// reads memory, prompts, Qwen text, or arbitrary state-patch additions. A
// manifestation exists only when a trusted canonical hydration path commits it
// into the current scene manifest.

const MAX_MANIFESTATIONS = 4;

const RULES = Object.freeze({
  light: Object.freeze({
    locations: Object.freeze(["red_house_exterior", "red_house_hallway", "machine_room", "control_room"]),
    activation: "canonical_light_state",
    scope: "location_physical",
  }),
  window: Object.freeze({
    locations: Object.freeze(["red_house_exterior", "red_house_doorstep", "red_house_hallway"]),
    activation: "canonical_house_surface",
    scope: "location_physical",
  }),
  stairs: Object.freeze({
    locations: Object.freeze(["stairwell"]),
    activation: "canonical_stairwell",
    scope: "location",
  }),
  water: Object.freeze({
    locations: Object.freeze(["basement"]),
    activation: "canonical_water_state",
    scope: "location_physical",
  }),
});

export const MVP_MANIFESTATION_ENTITIES = Object.freeze(Object.keys(RULES));

export function isMvpManifestationEntity(value) {
  return MVP_MANIFESTATION_ENTITIES.includes(String(value || "").trim().toLowerCase());
}

function entityRecord(entity, location) {
  const rule = RULES[entity];
  return {
    id: `${location}_${entity}`,
    entity,
    source: `canonical_optional:${entity}`,
    scope: rule.scope,
    activated_by: rule.activation,
  };
}

function shouldActivate(entity, manifest) {
  const rule = RULES[entity];
  if (!rule?.locations.includes(manifest.location)) return false;
  const states = manifest.entity_states || {};
  if (entity === "light") return typeof states.light === "string" && states.light.trim().length > 0;
  if (entity === "water") return typeof states.water === "string" && states.water.trim().length > 0;
  return true;
}

// Called only by trusted default/transition hydration. It is intentionally not
// called while parsing arbitrary manifests, Qwen candidates, memory, or prompts.
export function hydrateCanonicalManifestations(manifest = {}) {
  const location = String(manifest.location || "").trim();
  const entities = Array.isArray(manifest.entities) ? manifest.entities.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
  const entity_states = { ...(manifest.entity_states || {}) };
  const records = [];
  for (const entity of MVP_MANIFESTATION_ENTITIES) {
    if (!shouldActivate(entity, { ...manifest, location, entity_states })) continue;
    if (!entities.includes(entity)) entities.push(entity);
    if (entity === "window" && !entity_states.window) entity_states.window = "closed";
    records.push(entityRecord(entity, location));
  }
  return {
    ...manifest,
    location,
    entities: [...new Set(entities)].slice(0, 8),
    entity_states,
    entity_manifestations: records.slice(0, MAX_MANIFESTATIONS),
  };
}

// Preserve only registry-authored records that agree with the actual committed
// location and physical entity list. A memory item or a textual mention cannot
// manufacture a record through this normalizer.
export function normalizeManifestationRecords(value, location, entities) {
  const visible = new Set((entities || []).map((item) => String(item || "").trim().toLowerCase()));
  const allowed = [];
  for (const record of Array.isArray(value) ? value : []) {
    if (!record || typeof record !== "object") continue;
    const entity = String(record.entity || "").trim().toLowerCase();
    const rule = RULES[entity];
    if (!rule || !rule.locations.includes(location) || !visible.has(entity)) continue;
    const expected = entityRecord(entity, location);
    if (record.id !== expected.id || record.source !== expected.source || record.scope !== expected.scope || record.activated_by !== expected.activated_by) continue;
    if (!allowed.some((item) => item.entity === entity)) allowed.push(expected);
    if (allowed.length >= MAX_MANIFESTATIONS) break;
  }
  return allowed;
}

// State-patch additions are untrusted with respect to optional physical truth.
// Existing committed entities may remain; a patch may never add a new MVP
// manifestation outside the trusted hydration function above.
export function rejectUncommittedManifestationAdds(additions, currentEntities = []) {
  const existing = new Set((currentEntities || []).map((item) => String(item || "").trim().toLowerCase()));
  return (Array.isArray(additions) ? additions : []).filter((item) => {
    const normalized = String(item || "").trim().toLowerCase();
    return normalized && (!isMvpManifestationEntity(normalized) || existing.has(normalized));
  });
}

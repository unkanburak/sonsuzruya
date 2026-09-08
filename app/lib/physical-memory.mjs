// Physical properties and temporary interaction outcomes are independent.
// Only the former survive a location transition. No entity is created here.
const AXES = Object.freeze({ closed: 'aperture', ajar: 'aperture', open: 'aperture', idle: 'power', on: 'power', off: 'power', broken: 'condition', intact: 'condition', steady: 'illumination', dim: 'illumination', bright: 'illumination', still: 'water', flooded: 'water' });
export const physicalAxis = value => AXES[String(value || '').toLowerCase()] || null;
const validKey = key => /^[a-z][a-z0-9_]{0,40}$/.test(key);
export function visiblePhysicalEntity(manifest, target) {
  if (!validKey(target) || target === 'scene') return false;
  const locationText = String(manifest.location || '').replaceAll('_', ' ').toLowerCase();
  return (manifest.entities || []).some(entity => {
    const text = String(entity).toLowerCase().replaceAll('_', ' ');
    const noun = target.replaceAll('_', ' ');
    return (text !== locationText || text.endsWith(noun)) && new RegExp(`\\b${noun}\\b`).test(text);
  });
}
const cleanFacets = value => Object.fromEntries(Object.entries(value || {}).filter(([axis, state]) => physicalAxis(state) === axis).slice(0, 5));
export function normalizePhysicalManifest(manifest) {
  const physical = {};
  const interactions = {};
  for (const [target, facets] of Object.entries(manifest.entity_physical_states || {}).slice(0, 12)) {
    if (visiblePhysicalEntity(manifest, target)) physical[target] = cleanFacets(facets);
  }
  for (const [target, value] of Object.entries(manifest.entity_interactions || {}).slice(0, 12)) {
    if ((target === 'scene' || visiblePhysicalEntity(manifest, target)) && typeof value === 'string' && value.length <= 48 && !physicalAxis(value)) interactions[target] = value;
  }
  for (const [target, value] of Object.entries(manifest.entity_states || {}).slice(0, 12)) {
    if (!validKey(target) || typeof value !== 'string' || value.length > 48 || !(target === 'scene' || visiblePhysicalEntity(manifest, target))) continue;
    const axis = physicalAxis(value);
    if (axis && target !== 'scene') {
      physical[target] ||= {};
      // Explicit facets are authoritative; legacy projection cannot overwrite them.
      physical[target][axis] ??= value;
    } else if (!axis) interactions[target] ??= value;
  }
  const states = { ...interactions };
  for (const [target, facets] of Object.entries(physical)) {
    const primary = facets.power ?? facets.aperture ?? facets.condition ?? facets.illumination ?? facets.water;
    if (primary) states[target] = primary;
  }
  return { ...manifest, entity_states: states, entity_physical_states: physical, entity_interactions: interactions };
}
export function entityStateForMutation(manifest, mutation = {}) {
  const target = String(mutation.target_entity || '').toLowerCase();
  const axis = physicalAxis(mutation.to_state) || physicalAxis(mutation.from_state);
  if (axis) return manifest.entity_physical_states?.[target]?.[axis] ?? (physicalAxis(manifest.entity_states?.[target]) === axis ? manifest.entity_states[target] : null);
  return manifest.entity_interactions?.[target] ?? (!physicalAxis(manifest.entity_states?.[target]) ? manifest.entity_states?.[target] : null) ?? null;
}
export function applyEntityMutation(manifest, mutation) {
  const target = String(mutation.target_entity || '').toLowerCase();
  const value = mutation.to_state;
  if (!(target === 'scene' || visiblePhysicalEntity(manifest, target)) || typeof value !== 'string' || !value || value.length > 48) return manifest;
  const current = entityStateForMutation(manifest, mutation);
  if ((mutation.from_state && mutation.from_state !== current) || value === current) return manifest;
  const axis = physicalAxis(value);
  if (axis && target === 'scene') return manifest;
  return normalizePhysicalManifest({ ...manifest,
    entity_states: { ...manifest.entity_states, [target]: value },
    entity_physical_states: axis ? { ...manifest.entity_physical_states, [target]: { ...manifest.entity_physical_states?.[target], [axis]: value } } : manifest.entity_physical_states,
    entity_interactions: axis ? manifest.entity_interactions : { ...manifest.entity_interactions, [target]: value }
  });
}
function owner(location, target) {
  return target === 'door' && ['red_house_exterior', 'red_house_doorstep'].includes(location) ? 'red_house_exterior' : location;
}
export function normalizePhysicalMemory(memory, locations) {
  const result = {};
  for (const location of locations) {
    const entries = Object.entries(memory?.[location] || {}).filter(([key]) => validKey(key)).slice(0, 12);
    if (entries.length) result[location] = Object.fromEntries(entries.map(([key, value]) => [key, cleanFacets(value)]));
  }
  return result;
}
export function rememberPhysicalManifest(memory, manifest, locations) {
  const result = normalizePhysicalMemory(memory, locations);
  if (!locations.includes(manifest.location)) return result;
  for (const [target, facets] of Object.entries(manifest.entity_physical_states || {})) {
    if (!visiblePhysicalEntity(manifest, target)) continue;
    const key = owner(manifest.location, target);
    result[key] = { ...result[key], [target]: { ...facets } };
  }
  return normalizePhysicalMemory(result, locations);
}
export function restorePhysicalManifest(manifest, memory) {
  const normalized = normalizePhysicalManifest(manifest);
  const physical = { ...normalized.entity_physical_states };
  // Only current entities are projected out of the location-scoped memory.
  for (const bucket of Object.values(memory || {})) for (const target of Object.keys(bucket || {})) {
    const saved = memory?.[owner(manifest.location, target)]?.[target];
    if (saved && visiblePhysicalEntity(manifest, target)) physical[target] = { ...saved };
  }
  return normalizePhysicalManifest({ ...normalized, entity_states: {}, entity_interactions: {}, entity_physical_states: physical });
}
export function physicalFactsForPrompt(manifest) {
  const normalized = normalizePhysicalManifest(manifest);
  const facts = [];
  for (const [target, facets] of Object.entries(normalized.entity_physical_states)) {
    for (const [axis, value] of Object.entries(facets)) {
      const description = axis === 'power' ? `powered ${value === 'idle' ? 'off (idle)' : value}` : value;
      facts.push(`The established ${target.replaceAll('_', ' ')} is ${description}.`);
    }
  }
  return facts.slice(0, 12).join(' ');
}
export function appendPhysicalScenePrompt(prompt, manifest) {
  // Use neutral entity nouns: canonical 'closed front door' must not contradict door=open.
  const entities = (manifest.entities || []).map(entity => String(entity).replace(/\b(closed|ajar|open|idle|on|off|broken|intact|steady|dim|bright|still|flooded)\s+/gi, '')).slice(0, 5);
  return `${prompt} COMMITTED SCENE: ${String(manifest.location || '').replaceAll('_', ' ')}; established entities: ${entities.join(', ')}. PERSISTENT PHYSICAL FACTS: ${physicalFactsForPrompt(manifest) || 'No additional physical state established.'}`;
}

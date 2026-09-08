import fs from 'node:fs';
import { applyStatePatch, defaultStoryState, normalizeStoryState } from '../app/lib/options.mjs';
import { OPTION_LIBRARY, optionTemplateMeta } from '../app/lib/option-library.mjs';
const at = (location, entities, entity_states) => normalizeStoryState({ ...defaultStoryState(), current_location: location, current_scene_manifest: { location, entities, entity_states, adjacent_locations: [], summary: 'Reproduction' } });
const mutate = (s, target_entity, to_state) => applyStatePatch(s, { entity_state_mutation: { target_entity, to_state } });
const machine = at('machine_room', ['machine', 'anonymous figure'], { machine: 'on' });
let door = mutate(defaultStoryState(), 'door', 'open');
const basement = applyStatePatch(door, { current_location: 'basement_door' });
const template = OPTION_LIBRARY.find(t => t[5].length && t[6].length);
const tags = new Set([...template[5], ...template[6]]);
const server = fs.readFileSync('app/server.mjs', 'utf8');
const result = {
  machine_on_then_touched: mutate(machine, 'machine', 'touched').current_scene_manifest.entity_states,
  machine_on_then_far: mutate(machine, 'machine', 'far').current_scene_manifest.entity_states,
  front_door_open_then_basement_door: basement.current_scene_manifest.entity_states,
  prompt_uses_old_story: server.includes('buildImagePrompt(state.storyState, winnerMeta.resultPrompt'),
  optional_reproduction: { template: optionTemplateMeta(template), tags: [...tags], requiredPass: template[5].every(t=>tags.has(t)), rejectedByCurrentOptionalExpression: template[6].some(t=>tags.has(t)) }
};
console.log(JSON.stringify(result, null, 2));
fs.mkdirSync('benchmark/p0-memory', { recursive: true });
fs.writeFileSync('benchmark/p0-memory/reproduction-before.json', JSON.stringify(result, null, 2));

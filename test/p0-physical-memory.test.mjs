import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { applyStatePatch, defaultStoryState, normalizeStoryState, libraryTemplateTagsMatch, debugLibraryCoverage, sceneMatchedOptionLibrary } from '../app/lib/options.mjs';
import { OPTION_LIBRARY } from '../app/lib/option-library.mjs';
import { entityStateForMutation, physicalFactsForPrompt, appendPhysicalScenePrompt } from '../app/lib/physical-memory.mjs';
const at = (location, entities, entity_states = {}) => normalizeStoryState({ ...defaultStoryState(), current_location: location, current_scene_manifest: { location, entities, entity_states, adjacent_locations: [], summary: 'Existing test scene' } });
const change = (s, target_entity, to_state, from_state = null) => applyStatePatch(s, { entity_state_mutation: { target_entity, from_state, to_state } });
const go = (s, current_location) => applyStatePatch(s, { current_location });

test('P0 A: touching/retreating cannot overwrite powered-on machine', () => {
  let s = at('machine_room', ['machine', 'anonymous figure'], { machine: 'on' });
  for (const interaction of ['touched', 'far']) {
    s = change(s, 'machine', interaction);
    assert.equal(s.current_scene_manifest.entity_states.machine, 'on');
    assert.equal(s.current_scene_manifest.entity_interactions.machine, interaction);
    assert.equal(entityStateForMutation(s.current_scene_manifest, { target_entity: 'machine', to_state: interaction }), interaction);
    assert.equal(debugLibraryCoverage(s).find(x => x.id === 'machine_start')?.stateReady, false);
  }
  s = go(go(s, 'basement'), 'machine_room');
  assert.equal(s.current_scene_manifest.entity_states.machine, 'on');
  assert.equal(s.current_scene_manifest.entity_interactions.machine, undefined);
});

test('P0 B: different doors are independent; front door is shared only across its two views', () => {
  let s = change(defaultStoryState(), 'door', 'open', 'closed');
  s = go(s, 'red_house_doorstep');
  assert.equal(s.current_scene_manifest.entity_states.door, 'open');
  s = go(s, 'basement_door');
  assert.equal(s.current_scene_manifest.entity_states.door, 'closed');
  s = change(s, 'door', 'ajar', 'closed');
  s = go(s, 'red_house_exterior');
  assert.equal(s.current_scene_manifest.entity_states.door, 'open');
  s = change(s, 'door', 'held');
  s = go(go(s, 'front_path'), 'red_house_exterior');
  assert.equal(s.current_scene_manifest.entity_states.door, 'open');
  assert.equal(go(s, 'basement_door').current_scene_manifest.entity_states.door, 'ajar');
});

test('P0 D: ephemeral and memory-only props do not become destination facts', () => {
  const s = change(at('machine_room', ['machine', 'anonymous figure'], { machine: 'on' }), 'machine', 'touched');
  const next = go(s, 'hidden_tunnel');
  assert.equal(next.current_scene_manifest.entity_states.machine, undefined);
  assert.equal(next.current_scene_manifest.entity_interactions.machine, undefined);
  assert.doesNotMatch(physicalFactsForPrompt(next.current_scene_manifest), /machine|touched/);
  assert.equal(change(next, 'machine', 'off').current_scene_manifest.entity_states.machine, undefined);
  assert.equal(next.physical_memory.machine_room.machine.power, 'on');
});

test('P0: normalization/serialization preserves bounded memory and pending mutation is rollback-safe', () => {
  const committed = change(defaultStoryState(), 'door', 'open');
  const original = JSON.stringify(committed);
  const pending = go(change(committed, 'door', 'closed'), 'front_path');
  assert.equal(JSON.stringify(committed), original);
  assert.equal(go(normalizeStoryState(JSON.parse(JSON.stringify(pending))), 'red_house_exterior').current_scene_manifest.entity_states.door, 'closed');
  assert.equal(go(go(committed, 'front_path'), 'red_house_exterior').current_scene_manifest.entity_states.door, 'open');
  const noisy = normalizeStoryState({ ...committed, physical_memory: Object.fromEntries(Array.from({length: 100}, (_, i) => ['unknown_'+i, {machine:{power:'on'}}])) });
  assert.equal(Object.keys(noisy.physical_memory).length, 1);
});

test('P0: legacy unknown locations/entities are not migrated as physical presence', () => {
  const s = at('front_path', ['cracked front path'], { machine: 'on', door: 'open', path: 'marked' });
  assert.equal(s.current_scene_manifest.entity_states.machine, undefined);
  assert.deepEqual(s.physical_memory, {});
  assert.equal(s.current_scene_manifest.entity_interactions.path, 'marked');
});

test('P0 C: actual prompt builder carries post-winner facts without canonical adjective conflicts', () => {
  const source = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
  const functionText = source.slice(source.indexOf('function buildImagePrompt('), source.indexOf('async function closeVote()'));
  const context = vm.createContext({ appendPhysicalScenePrompt, structuredPromptEnabled: true, config: {imageProfile:{continuityMode:'SOFT_LOCK'}}, recurringMotifForPrompt:()=>null, chooseComposition:()=>['test','same framing'], protagonistPresenceFor:()=>['OPTIONAL','anonymous figure when necessary'], archetypalVisualHintsEnabled:false });
  vm.runInContext(functionText, context);
  const before = at('machine_room', ['machine', 'anonymous figure'], { machine: 'on' });
  const after = change(before, 'machine', 'touched');
  let prompt = context.buildImagePrompt(after, 'A hand rests on the established machine', 'Makineye dokun', {}, 1);
  assert.match(prompt, /A hand rests on the established machine/);
  assert.match(prompt, /machine is powered on/);
  assert.doesNotMatch(prompt, /powered off|machine is touched/);
  prompt = context.buildImagePrompt(change(after,'machine','off','on'), 'The machine is now off', '', {}, 2);
  assert.match(prompt, /machine is powered off/);
  assert.doesNotMatch(prompt, /powered on/);
  prompt = context.buildImagePrompt(change(defaultStoryState(),'door','open'), 'The front door is now open', '', {}, 3);
  assert.doesNotMatch(prompt, /closed front door/);
  assert.match(prompt, /door is open/);
  assert.match(source, /buildImagePrompt\(pendingStoryState, winnerMeta\.resultPrompt/);
  const rollback = source.slice(source.indexOf('if (mediaResult.status !== "fulfilled")'), source.indexOf('const media = mediaResult.value.media'));
  assert.doesNotMatch(rollback, /storyState:\s*pendingStoryState|physical_memory:/);
});

test('P0 E: optional tags do not exclude; missing required and memory-only still exclude', () => {
  const template = OPTION_LIBRARY.find(t => t[0] === 'light_follow');
  assert.equal(libraryTemplateTagsMatch(template, new Set(['light','glow'])), true);
  assert.equal(libraryTemplateTagsMatch(template, new Set(['light'])), true);
  assert.equal(libraryTemplateTagsMatch(template, new Set(['glow'])), false);
  const light = at('front_path', ['glowing light','cracked front path'], { light:'steady' });
  assert.equal(debugLibraryCoverage(light).find(t => t.id === 'light_follow')?.accepted, true);
  const empty = at('front_path', ['cracked front path']);
  empty.memory_entities = ['light','radio','machine'];
  assert.equal(debugLibraryCoverage(empty).some(t => t.id === 'light_follow'), false);
  const pair = sceneMatchedOptionLibrary(empty, []);
  assert.doesNotMatch(`${pair?.option_1_tr} ${pair?.option_2_tr}`, /Makine|Radyo|Parıltı/);
});

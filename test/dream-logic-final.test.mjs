import test from "node:test";
import assert from "node:assert/strict";
import { OPTION_LIBRARY, optionTemplateMeta } from "../app/lib/option-library.mjs";
import { applyStatePatch, defaultStoryState, futureSignature, normalizeStoryState, routeRepeat, sceneBoundRecoveryOptions, sceneMatchedOptionLibrary, staticVisibleConsequence } from "../app/lib/options.mjs";

const psyche = { dominant_archetypal_field: "shadow", archetypal_pressure: { shadow: 0.95 } };

test("non-visual consequences are rejected for a still PNG", () => {
  assert.equal(staticVisibleConsequence("A quiet sound is now audible behind the door"), false);
  assert.equal(staticVisibleConsequence("The room now smells colder"), false);
  assert.equal(staticVisibleConsequence("The figure now remembers the room"), false);
  assert.equal(staticVisibleConsequence("The shadow beneath the door is now visibly displaced"), true);
});

test("door-open visible change carries a bounded state mutation", () => {
  const open = optionTemplateMeta(OPTION_LIBRARY.find((template) => template[0] === "door_open"));
  assert.ok(open.mutation);
  assert.equal(open.mutation.target_entity, "door");
  assert.equal(open.mutation.from_state, "closed");
  assert.equal(open.mutation.to_state, "ajar");
});

test("door mutation closes the old option", () => {
  const open = optionTemplateMeta(OPTION_LIBRARY.find((template) => template[0] === "door_open"));
  const story = applyStatePatch(defaultStoryState(), { recent_event: "door_ajar", result_summary: open.visible_consequence, entity_state_mutation: open.mutation });
  const pair = sceneMatchedOptionLibrary(story, [], psyche);
  assert.equal(story.current_scene_manifest.entity_states.door, "ajar");
  assert.doesNotMatch(`${pair.option_1_tr} ${pair.option_2_tr}`, /Kapıyı arala/);
});

test("door mutation opens a new fully-open affordance", () => {
  const open = optionTemplateMeta(OPTION_LIBRARY.find((template) => template[0] === "door_open"));
  const story = applyStatePatch(defaultStoryState(), { recent_event: "door_ajar", result_summary: open.visible_consequence, entity_state_mutation: open.mutation });
  const pair = sceneMatchedOptionLibrary(story, [], psyche);
  assert.match(`${pair.option_1_tr} ${pair.option_2_tr}`, /Kapıyı tamamen aç/);
});

test("same wording is a different future only when state/result truly differs", () => {
  const a = futureSignature({ label_tr: "Kapıyı aç", target_entity: "door", behavior_family: "open", psychological_vector: "confront", result_prompt_en: "The established door is now slightly open", entity_state_mutation: { target_entity: "door", from_state: "closed", to_state: "ajar" } });
  const b = futureSignature({ label_tr: "Kapıyı aç", target_entity: "door", behavior_family: "close", psychological_vector: "conceal", result_prompt_en: "The established door is now closed", entity_state_mutation: { target_entity: "door", from_state: "open", to_state: "closed" } });
  assert.notEqual(a, b);
});

test("different wording with the same semantic future is a repeat", () => {
  const mutation = { target_entity: "door", from_state: "closed", to_state: "ajar" };
  const a = futureSignature({ label_tr: "Kapıyı arala", target_entity: "door", behavior_family: "open", psychological_vector: "confront", result_prompt_en: "The established door is now slightly open", entity_state_mutation: mutation });
  const b = futureSignature({ label_tr: "Kapıyı hafifçe aç", target_entity: "door", behavior_family: "open", psychological_vector: "confront", result_prompt_en: "The established door is now ajar", entity_state_mutation: mutation });
  assert.equal(a, b);
});

test("high archetype pressure cannot create an absent machine", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "front_path", current_scene_manifest: { location: "front_path", entities: ["cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["quiet_street"], entity_states: {}, summary: "A cracked path" } });
  const pair = sceneMatchedOptionLibrary(story, [], psyche);
  assert.doesNotMatch(`${pair.option_1_tr} ${pair.option_2_tr}`, /Makine|Radyo|Portal/);
});

test("route self-loop and immediate route repetition remain impossible", () => {
  assert.equal(routeRepeat("Sokağa doğru ilerle", ["Sokağa doğru ilerle"]), true);
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "front_path", current_scene_manifest: { location: "front_path", entities: ["cracked front path", "anonymous figure"], adjacent_locations: ["front_path", "quiet_street"], entity_states: {}, summary: "A cracked path" } });
  const pair = sceneMatchedOptionLibrary(story, [], psyche);
  for (const record of pair._selectedRecords || []) if (record.route_type === "navigation") assert.notEqual(record.next_location, "front_path");
});

test("bounded recovery never introduces a missing machine", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_entities: ["machine room", "anonymous figure"], current_scene_manifest: { location: "machine_room", entities: ["machine room", "anonymous figure"], adjacent_locations: ["basement", "control_room"], entity_states: {}, summary: "A sparse room" } });
  const pair = sceneBoundRecoveryOptions({ storyState: story, previousOptions: [], dreamPsyche: psyche });
  const labels = `${pair?.option_1_tr || ""} ${pair?.option_2_tr || ""}`;
  assert.doesNotMatch(labels, /Makine/);
  if (pair) {
    assert.equal(staticVisibleConsequence(pair.option_1_result_prompt_en), true);
    assert.equal(staticVisibleConsequence(pair.option_2_result_prompt_en), true);
  }
});

test("bounded recovery door mutation commits and closes the open action", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "red_house_exterior", current_scene_manifest: { location: "red_house_exterior", entities: ["red house exterior", "closed front door", "cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["red_house_doorstep", "front_path"], entity_states: { door: "closed" }, summary: "A red house exterior" } });
  const recovery = sceneBoundRecoveryOptions({ storyState: story, previousOptions: [] });
  assert.equal(recovery.option_1_tr, "Ön kapıyı aç");
  const patch = recovery.option_1_state_patch;
  assert.deepEqual(patch.entity_state_mutation, { target_entity: "door", from_state: "closed", to_state: "open", opens: [], closes: [] });
  const committed = applyStatePatch(story, patch);
  assert.equal(committed.current_scene_manifest.entity_states.door, "open");
  const next = sceneBoundRecoveryOptions({ storyState: committed, previousOptions: [recovery.option_1_tr] });
  assert.doesNotMatch(`${next?.option_1_tr || ""} ${next?.option_2_tr || ""}`, /Ön kapıyı aç/);
  const library = sceneMatchedOptionLibrary(committed, [recovery.option_1_tr], psyche);
  assert.doesNotMatch(`${library?.option_1_tr || ""} ${library?.option_2_tr || ""}`, /Kapıyı arala|Kapıyı tamamen aç/);
});

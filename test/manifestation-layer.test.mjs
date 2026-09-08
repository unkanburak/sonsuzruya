import test from "node:test";
import assert from "node:assert/strict";
import { applyStatePatch, debugLibraryCatalogueFlow, defaultStoryState, normalizeStoryState, sceneManifestFor } from "../app/lib/options.mjs";
import { visiblePhysicalEntity } from "../app/lib/physical-memory.mjs";

const at = (location, entities, entity_states = {}) => normalizeStoryState({
  ...defaultStoryState(),
  current_location: location,
  current_scene_entities: entities,
  current_scene_manifest: { location, entities, adjacent_locations: [], entity_states, summary: "A committed test scene." },
  memory_entities: [], important_objects: [],
});

const ids = (story, target) => debugLibraryCatalogueFlow(story, [])
  .filter((row) => row.target === target && row.physicallyEligible)
  .map((row) => row.id);

test("MVP manifestation entities are absent before a legal canonical activation", () => {
  const path = at("front_path", ["cracked front path", "bare tree", "anonymous figure"]);
  const manifest = sceneManifestFor(path);
  for (const entity of ["light", "window", "stairs", "water"]) {
    assert.equal(visiblePhysicalEntity(manifest, entity), false);
    assert.deepEqual(ids(path, entity), []);
  }
});

test("trusted location transition commits only the legal optional entities and opens existing templates", () => {
  const doorstep = at("red_house_doorstep", ["red house doorstep", "closed front door", "anonymous figure"], { door: "closed" });
  const hallway = applyStatePatch(doorstep, { current_location: "red_house_hallway", recent_event: "entered_hallway" });
  assert.deepEqual(hallway.current_scene_manifest.entities.filter((entity) => ["light", "window", "stairs", "water"].includes(entity)).sort(), ["light", "window"]);
  assert.ok(ids(hallway, "light").length >= 8);
  assert.ok(ids(hallway, "window").length >= 7);

  const stairwell = applyStatePatch(hallway, { current_location: "stairwell", recent_event: "reached_stairwell" });
  assert.ok(stairwell.current_scene_manifest.entities.includes("stairs"));
  assert.ok(ids(stairwell, "stairs").length >= 5);
  assert.ok(!stairwell.current_scene_manifest.entities.includes("light"));
  assert.ok(!stairwell.current_scene_manifest.entities.includes("window"));

  const basement = applyStatePatch(stairwell, { current_location: "basement", recent_event: "entered_basement" });
  assert.ok(basement.current_scene_manifest.entities.includes("water"));
  assert.ok(ids(basement, "water").length >= 6);
  assert.ok(!basement.current_scene_manifest.entities.includes("stairs"));
});

test("optional entities cannot be committed outside their allow-listed locations", () => {
  const path = at("front_path", ["cracked front path", "bare tree", "anonymous figure"]);
  const next = applyStatePatch(path, { current_location: "quiet_street", recent_event: "walked_street" });
  for (const entity of ["light", "window", "stairs", "water"]) assert.ok(!next.current_scene_manifest.entities.includes(entity));
  assert.deepEqual(next.current_scene_manifest.entity_manifestations || [], []);
});

test("memory, Qwen-style scene patch and prompt text cannot manifest optional physical entities", () => {
  const path = at("front_path", ["cracked front path", "bare tree", "anonymous figure"]);
  const patched = applyStatePatch(path, {
    important_objects_add: ["old radio", "light", "window"],
    current_scene_entities_add: ["light", "window", "stairs", "water"],
    current_scene_manifest: {
      location: "front_path",
      entities: ["cracked front path", "bare tree", "anonymous figure", "light", "window", "stairs", "water"],
      adjacent_locations: ["quiet_street"],
      summary: "A prompt mentions light, window, stairs and water.",
    },
    result_summary: "A prompt mentions light, window, stairs and water.",
  });
  const manifest = patched.current_scene_manifest;
  for (const entity of ["light", "window", "stairs", "water"]) assert.equal(visiblePhysicalEntity(manifest, entity), false);
  assert.ok(patched.memory_entities.includes("light"));
  assert.ok(patched.memory_entities.includes("window"));
});

test("location-owned physical manifestation state restores on re-entry without cross-location leakage", () => {
  const exterior = defaultStoryState();
  assert.ok(exterior.current_scene_manifest.entities.includes("window"));
  const opened = applyStatePatch(exterior, { recent_event: "window_opened", entity_state_mutation: { target_entity: "window", to_state: "open" } });
  assert.equal(opened.current_scene_manifest.entity_states.window, "open");
  const path = applyStatePatch(opened, { current_location: "front_path", recent_event: "left_house" });
  assert.ok(!path.current_scene_manifest.entities.includes("window"));
  assert.equal(path.current_scene_manifest.entity_states.window, undefined);
  const returned = applyStatePatch(path, { current_location: "red_house_exterior", recent_event: "returned_house" });
  assert.ok(returned.current_scene_manifest.entities.includes("window"));
  assert.equal(returned.current_scene_manifest.entity_states.window, "open");
});

test("pending manifestation is transaction-local until a successful scene commit", () => {
  const source = at("stairwell", ["stairwell", "anonymous figure"]);
  const before = JSON.parse(JSON.stringify(source));
  const pending = applyStatePatch(source, { current_location: "basement", recent_event: "pending_basement" });
  assert.ok(pending.current_scene_manifest.entities.includes("water"));
  // Simulated failed generation: the server retains `source`, not `pending`.
  assert.ok(!source.current_scene_manifest.entities.includes("water"));
  assert.deepEqual(source, before);
});

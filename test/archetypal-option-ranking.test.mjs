import test from "node:test";
import assert from "node:assert/strict";
import { archetypeAffinityScore, defaultStoryState, normalizeStoryState, psychologicalTargetForOption, psychologicalVectorForOption, sceneMatchedOptionLibrary } from "../app/lib/options.mjs";

const psyche = (archetype, pressure = 0.95) => ({ dominant_archetypal_field: archetype, archetypal_pressure: { [archetype]: pressure } });
const withFlag = (value, fn) => {
  const old = process.env.ARCHETYPAL_OPTION_BIAS_ENABLED;
  process.env.ARCHETYPAL_OPTION_BIAS_ENABLED = value;
  try { return fn(); } finally { if (old === undefined) delete process.env.ARCHETYPAL_OPTION_BIAS_ENABLED; else process.env.ARCHETYPAL_OPTION_BIAS_ENABLED = old; }
};

test("shadow affinity softly favors confront/reveal over neutral wait", () => {
  const confront = archetypeAffinityScore({ psychological_vector: "confront" }, "shadow", 0.9);
  const wait = archetypeAffinityScore({ psychological_vector: "wait" }, "shadow", 0.9);
  assert.ok(confront > wait);
});

test("archetype bias cannot make a manifest-invalid entity eligible", () => withFlag("1", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "front_path", current_scene_manifest: { location: "front_path", entities: ["cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["quiet_street"], summary: "A cracked path" } });
  const pair = sceneMatchedOptionLibrary(story, [], psyche("shadow"));
  assert.ok(pair);
  assert.doesNotMatch(`${pair.option_1_tr} ${pair.option_2_tr}`.toLocaleLowerCase("tr-TR"), /makine|radyo|portal|ayna/);
}));

test("persona without glass/reflection does not invent persona props", () => withFlag("1", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "front_path", current_scene_manifest: { location: "front_path", entities: ["cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["quiet_street"], summary: "A cracked path" } });
  const pair = sceneMatchedOptionLibrary(story, [], psyche("persona"));
  assert.doesNotMatch(`${pair.option_1_tr} ${pair.option_2_tr}`.toLocaleLowerCase("tr-TR"), /ayna|cam|pencere|maske/);
}));

test("high pressure preserves exact/future cooldown guards", () => withFlag("1", () => {
  const base = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure"], adjacent_locations: ["control_room"], summary: "The machine room" } });
  const first = sceneMatchedOptionLibrary(base, [], psyche("trickster"));
  const previous = [first.option_1_tr, first.option_2_tr];
  const next = sceneMatchedOptionLibrary(base, previous, psyche("trickster"));
  assert.ok(next);
  assert.ok(!previous.includes(next.option_1_tr));
  assert.ok(!previous.includes(next.option_2_tr));
}));

test("rich pools prefer psychological contrast", () => withFlag("1", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure", "light"], adjacent_locations: ["control_room"], summary: "The machine room" } });
  const pair = sceneMatchedOptionLibrary(story, [], psyche("shadow"));
  assert.equal(pair?._psychologicalTrace?.enabled, true);
  assert.equal(pair._psychologicalTrace.options.length, 2);
  assert.notEqual(pair._psychologicalTrace.options[0].vector, pair._psychologicalTrace.options[1].vector);
}));

test("recent archetype + vector + target combinations are softly deprioritized", () => withFlag("1", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure", "light", "button"], adjacent_locations: ["control_room"], summary: "The machine room" } });
  const activePsyche = psyche("shadow");
  const first = sceneMatchedOptionLibrary(story, [], activePsyche);
  const firstKeys = new Set(first._psychologicalTrace.options.map((item) => `${item.vector}|${item.target}`));
  const recentRecords = first._psychologicalTrace.options.map((item, index) => ({ label_tr: `history-${index}`, psychological_vector: item.vector, target_entity: item.target, archetype: "shadow" }));
  const next = sceneMatchedOptionLibrary(normalizeStoryState({ ...story, recent_option_records: recentRecords, recent_options: [], recent_option_pairs: [] }), [], activePsyche);
  const nextKeys = next._psychologicalTrace.options.map((item) => `${item.vector}|${item.target}`);
  assert.ok(nextKeys.some((key) => !firstKeys.has(key)));
}));

test("psychological metadata exposes bounded vector and target", () => {
  assert.equal(psychologicalVectorForOption({ psychological_vector: "protect" }), "protect");
  assert.equal(psychologicalTargetForOption({ target_entity: "door" }), "door");
});

test("disabled archetype layer preserves baseline selection", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure"], adjacent_locations: ["control_room"], summary: "The machine room" } });
  const off = withFlag("0", () => sceneMatchedOptionLibrary(story, [], psyche("trickster")));
  const unset = withFlag("", () => sceneMatchedOptionLibrary(story, [], psyche("trickster")));
  assert.deepEqual([off.option_1_tr, off.option_2_tr], [unset.option_1_tr, unset.option_2_tr]);
});

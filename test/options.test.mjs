import test from "node:test";
import assert from "node:assert/strict";
import { applyStatePatch, defaultStoryState, fallbackOptions, generateOptions, normalizeStoryState, qwenPreviousOptions, routeRepeat, sceneBoundRecoveryOptions, sceneManifestFor, sceneMatchedOptionLibrary, validateOptions } from "../app/lib/options.mjs";
import { OPTION_LIBRARY, optionTemplateMeta } from "../app/lib/option-library.mjs";

test("scene option library has broad reusable grounded coverage", () => {
  const labels = new Set(OPTION_LIBRARY.map((template) => template[1]));
  const families = new Set(OPTION_LIBRARY.map((template) => template[4]));
  assert.ok(OPTION_LIBRARY.length >= 120);
  assert.ok(labels.size >= 100);
  assert.ok(families.size >= 20);
  const story = normalizeStoryState({ current_location: "machine_room", current_scene_entities: ["machine", "figure", "light"] });
  const pair = sceneMatchedOptionLibrary(story, []);
  assert.ok(pair?.option_1_tr && pair?.option_2_tr);
  assert.notEqual(pair.option_1_tr, pair.option_2_tr);
  assert.ok(!/portal|araba|köprü/.test(`${pair.option_1_tr} ${pair.option_2_tr}`.toLocaleLowerCase("tr-TR")));
});

test("library metadata is standardized and major entities have behavioral breadth", () => {
  const major = ["figure", "door", "light", "shadow", "path", "stairs", "water", "machine", "window", "radio", "photograph", "mirror", "object"];
  for (const entity of major) {
    const rows = OPTION_LIBRARY.map(optionTemplateMeta).filter((row) => row.required_tags.includes(entity));
    assert.ok(rows.length >= 6, `${entity} should expose at least six reusable behaviors`);
    assert.ok(new Set(rows.map((row) => row.behavior_family)).size >= 6, `${entity} should span six behavior families`);
    assert.ok(rows.every((row) => row.route_type === "scene_local" || row.route_type === "navigation"));
    assert.ok(rows.every((row) => row.visible_consequence));
  }
});

test("scene-local winner mutates entity state and changes the next option space", () => {
  const story = normalizeStoryState({ current_location: "machine_room", current_scene_entities: ["machine room", "machine", "anonymous figure"], current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure"], adjacent_locations: ["basement", "control_room"], entity_states: { machine: "idle" } } });
  const before = sceneMatchedOptionLibrary(story, []);
  const machineTemplate = OPTION_LIBRARY.map(optionTemplateMeta).find((row) => row.required_tags.includes("machine") && row.behavior_family === "activate");
  assert.ok(machineTemplate?.mutation);
  const mutation = machineTemplate.mutation;
  const patched = applyStatePatch(story, { current_scene_entities_add: ["machine"], entity_state_mutation: mutation, current_scene_manifest: story.current_scene_manifest });
  assert.equal(patched.current_scene_manifest.entity_states.machine, mutation.to_state);
  const after = sceneMatchedOptionLibrary(patched, before ? [before.option_1_tr, before.option_2_tr] : []);
  assert.ok(after);
  assert.notEqual(after.option_1_tr, before.option_1_tr);
  assert.notEqual(after.option_2_tr, before.option_2_tr);
});

test("valid option schema is accepted", () => {
  const value = { option_1_tr: "Parlayan portal ortaya çıksın", option_2_tr: "Koridor ışıkla dolsun", option_1_en: "A glowing portal appears", option_2_en: "The corridor fills with light" };
  assert.deepEqual(validateOptions(value), value);
});

test("unsafe or expanded schemas are rejected", () => {
  assert.equal(validateOptions({ option_1_tr: "Onu öldür", option_2_tr: "Kaç", option_1_en: "Kill him", option_2_en: "Run" }), null);
  assert.equal(validateOptions({ option_1_tr: "Gir", option_2_tr: "Çık", option_1_en: "Enter", option_2_en: "Leave", extra: true }), null);
  assert.equal(validateOptions({ option_1_tr: "Onu takip et", option_2_tr: "Kaç", option_1_en: "Follow Elon Musk", option_2_en: "Run" }), null);
  assert.equal(validateOptions({ option_1_tr: "Birini takip et", option_2_tr: "Kaç", option_1_en: "Meet Alice", option_2_en: "Run" }), null);
  assert.equal(validateOptions({ option_1_tr: "Kapıyı aç", option_2_tr: "Koridor ışıkla dolsun", option_1_en: "Open the door", option_2_en: "The corridor fills with light" }), null);
});

test("fallback returns two distinct safe choices", () => {
  const value = fallbackOptions([], () => 0);
  assert.notEqual(value.option_1_en, value.option_2_en);
  assert.ok(validateOptions(value));
});

test("historical objects are memory-only and cannot ground ordinary actions", () => {
  const state = normalizeStoryState({ current_location: "misty_bridge", character_state: "standing_alone", important_objects: ["old_radio"] });
  assert.deepEqual(state.memory_entities, ["old_radio"]);
  assert.ok(!state.current_scene_entities.includes("old_radio"));
  const next = applyStatePatch(state, { current_scene_entities_add: ["old_lantern"], recent_event: "lantern_changed" });
  assert.ok(next.current_scene_entities.includes("old_lantern"));
  assert.ok(next.memory_entities.includes("old_radio"));
});

test("Qwen previous options preserve append-only displayed recency", () => {
  const story = normalizeStoryState({
    ...defaultStoryState(),
    recent_options: ["A", "B"],
    recent_option_records: ["A", "B", "A", "B"].map((label_tr) => ({ label_tr, result_prompt_en: `${label_tr} is now visible`, intent: "observe", source: "test" })),
  });
  assert.deepEqual(qwenPreviousOptions(story), ["A", "B", "A", "B"]);
});

test("route repeat distinguishes front path, quiet street and red-house destinations", () => {
  assert.equal(routeRepeat({ label_tr: "Çatlak yolda ilerle" }, ["Çatlak yolda ilerle"]), true);
  assert.equal(routeRepeat({ label_tr: "Sokağa doğru ilerle" }, ["Çatlak yolda ilerle"]), false);
  assert.equal(routeRepeat({ label_tr: "Sokağa doğru ilerle" }, ["Sokağa doğru ilerle"]), true);
});

test("front-path prompt keeps quiet-street and red-house routes available after a path cooldown", async () => {
  const story = normalizeStoryState({
    ...defaultStoryState(),
    current_location: "front_path",
    current_scene_entities: ["cracked front path", "bare tree", "anonymous figure", "front path"],
    current_scene_manifest: {
      location: "front_path",
      entities: ["cracked front path", "bare tree", "anonymous figure", "front path"],
      adjacent_locations: ["red_house_exterior", "quiet_street"],
      summary: "The anonymous figure is on the cracked front path",
    },
  });
  const previousFetch = globalThis.fetch;
  let requestBody = null;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ c: [["Sokağa doğru ilerle", "The quiet street is now clearly visible", "quiet_street"], ["Yolun çatlağını izle", "The deepest path crack is now clearly visible", "front_path"]] }) } }], usage: { completion_tokens: 40 } }) };
  };
  try {
    await generateOptions({ storyState: story, previousOptions: ["Çatlak yolda ilerle"], qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    const prompt = requestBody.messages.find((message) => message.role === "user").content;
    assert.match(prompt, /R=kırmızı eve dön; sokağa doğru ilerle/);
    assert.match(prompt, /If R exists, candidate 1 navigates to a declared N destination/);
    assert.match(prompt, /candidates 2-3 are different scene-local transformations/);
    assert.doesNotMatch(prompt, /Makineyi çalıştır|Makinenin ışığını izle|Figürden uzaklaş|Ağacın gölgesini izle/);
    assert.doesNotMatch(prompt, /R=NONE/);
  } finally { globalThis.fetch = previousFetch; }
});

test("navigation rejects a current-location self-loop but accepts an adjacent route and a local observation", async () => {
  const story = normalizeStoryState({
    ...defaultStoryState(),
    current_location: "front_path",
    current_scene_entities: ["cracked front path", "bare tree", "anonymous figure", "front path"],
    current_scene_manifest: {
      location: "front_path",
      entities: ["cracked front path", "bare tree", "anonymous figure", "front path"],
      adjacent_locations: ["red_house_exterior", "quiet_street"],
      summary: "The anonymous figure is on the cracked front path",
    },
  });
  const previousFetch = globalThis.fetch;
  const response = (content) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }], usage: { completion_tokens: 40 } }) });
  try {
    globalThis.fetch = async () => response({ c: [
      ["Çatlak yolda ilerle", "The cracked front path is now farther ahead", "front_path"],
      ["Yolun çatlağını izle", "The deepest path crack is now clearly visible", "front_path"],
    ] });
    const rejected = await generateOptions({ storyState: story, previousOptions: [], qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    const selfLoop = rejected._qwenTrace.candidateDiagnostics.find((candidate) => candidate.action === "Çatlak yolda ilerle");
    const observation = rejected._qwenTrace.candidateDiagnostics.find((candidate) => candidate.action === "Yolun çatlağını izle");
    assert.equal(selfLoop.invalidLocation, true);
    assert.equal(observation.invalidLocation, false);

    globalThis.fetch = async () => response({ c: [
      ["Sokağa ilerle", "The quiet street is now clearly visible", "quiet_street"],
      ["Yolun çatlağını izle", "The deepest path crack is now clearly visible", "front_path"],
    ] });
    const accepted = await generateOptions({ storyState: story, previousOptions: [], qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    assert.equal(accepted._qwenTrace.finalValidationResult, "qwen");
    assert.equal(accepted.option_1_state_patch.current_location, "quiet_street");
    assert.equal(accepted.option_2_state_patch.current_location, "front_path");
  } finally { globalThis.fetch = previousFetch; }
});

test("partial Qwen response is salvaged with a grounded machine-room companion", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ c: [
    ["Makineyi çalıştır", "The established machine is now glowing with blue light", "machine_room"],
    ["Figürün gölgesini izle", "The anonymous figure's shadow is now stretching across the machine room", "machine_room"],
    ["Bodruma in", "The figure is now in the basement", "machine_room"]
  ] }) } }] }) });
  try {
    const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_entities: ["machine_room", "machine", "anonymous_figure"], current_scene_manifest: { location: "machine_room", entities: ["machine_room", "machine", "anonymous_figure"], adjacent_locations: ["basement", "control_room"], summary: "The established machine is quiet" } });
    const result = await generateOptions({ storyState: story, previousOptions: [], qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    assert.ok(result.option_1_tr);
    assert.ok(result.option_2_tr);
    assert.equal(result._qwenTrace.finalValidationResult, "qwen");
    assert.match(`${result.option_1_tr} ${result.option_2_tr}`, /Makine/);
  } finally { globalThis.fetch = previousFetch; }
});

test("location transition hydrates machine-room physical vocabulary", () => {
  const basement = normalizeStoryState({ ...defaultStoryState(), current_location: "basement", current_scene_manifest: { location: "basement", entities: ["underground basement", "anonymous figure"], adjacent_locations: ["basement_door", "machine_room"], summary: "A basement" } });
  const next = applyStatePatch(basement, { current_location: "machine_room", result_summary: "The machine room is now visible" });
  assert.equal(next.current_location, "machine_room");
  assert.equal(next.current_scene_manifest.location, "machine_room");
  assert.ok(sceneManifestFor(next).entities.includes("machine"));
});

test("machine recovery actions require a visible machine entity", () => {
  const withoutMachine = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "anonymous figure"], adjacent_locations: ["basement", "control_room"], summary: "A room" } });
  const actions = sceneBoundRecoveryOptions({ storyState: withoutMachine, previousOptions: [] });
  const labels = `${actions?.option_1_tr || ""} ${actions?.option_2_tr || ""}`;
  assert.doesNotMatch(labels, /Makineyi çalıştır|Makinenin ışığını izle/);
});

test("exhausted-scene recovery relaxes history but preserves physical safety", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "red_house_exterior", current_scene_manifest: { location: "red_house_exterior", entities: ["red house exterior", "closed front door", "bare tree", "anonymous figure"], adjacent_locations: ["red_house_doorstep", "front_path"], entity_states: { door: "open" }, summary: "The red house exterior" } });
  const previous = ["Kırmızı eve yaklaş", "Çatlak yolda ilerle", "Kırmızı eve dön", "Sokağa doğru ilerle", "Kapıyı kapat", "Figüre yaklaş", "Figürden uzaklaş", "Çatlak yolda ilerle"];
  assert.equal(sceneBoundRecoveryOptions({ storyState: story, previousOptions: previous }), null);
  const emergency = sceneBoundRecoveryOptions({ storyState: story, previousOptions: previous, exhausted: true });
  assert.ok(emergency?.option_1_tr && emergency?.option_2_tr);
  assert.equal(emergency._exhaustedSceneRecovery, true);
  assert.doesNotMatch(`${emergency.option_1_tr} ${emergency.option_2_tr}`, /Ön kapıyı aç/);
});

test("exhausted-scene recovery can reuse a cooldown-only closed-door future", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "red_house_exterior", current_scene_manifest: { location: "red_house_exterior", entities: ["red house exterior", "closed front door", "bare tree"], adjacent_locations: ["red_house_doorstep", "front_path"], entity_states: { door: "closed" }, summary: "The red house exterior" } });
  const emergency = sceneBoundRecoveryOptions({ storyState: story, previousOptions: ["Ön kapıyı aç"], exhausted: true });
  assert.ok(emergency);
  assert.match(`${emergency.option_1_tr} ${emergency.option_2_tr}`, /Ön kapıyı aç/);
});

test("exhausted-scene recovery allows two real routes only without local futures", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "red_house_exterior", current_scene_manifest: { location: "red_house_exterior", entities: ["red house exterior"], adjacent_locations: ["red_house_doorstep", "front_path"], summary: "The red house exterior" } });
  const emergency = sceneBoundRecoveryOptions({ storyState: story, previousOptions: ["Kırmızı eve yaklaş", "Çatlak yolda ilerle"], exhausted: true });
  assert.ok(emergency);
  assert.notEqual(emergency.option_1_tr, emergency.option_2_tr);
  assert.match(`${emergency.option_1_tr} ${emergency.option_2_tr}`, /Kırmızı eve yaklaş|Çatlak yolda ilerle/);
});

test("exhausted recovery joins two distinct canonical routes when no local future remains", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "hidden_tunnel", current_scene_manifest: { location: "hidden_tunnel", entities: ["hidden tunnel", "anonymous figure"], adjacent_locations: ["control_room", "alley_mouth"], entity_states: { figure: "far" }, summary: "The figure is farther away in the tunnel" } });
  const previous = ["Kontrol odasına gir", "Ara sokağa sap", "Kontrol odasına gir", "Ara sokağa sap"];
  assert.equal(sceneBoundRecoveryOptions({ storyState: story, previousOptions: previous }), null);
  const emergency = sceneBoundRecoveryOptions({ storyState: story, previousOptions: previous, exhausted: true });
  assert.ok(emergency);
  assert.deepEqual(new Set([emergency.option_1_state_patch.current_location, emergency.option_2_state_patch.current_location]), new Set(["control_room", "alley_mouth"]));
  assert.equal(emergency.option_1_state_patch.current_location === "hidden_tunnel" || emergency.option_2_state_patch.current_location === "hidden_tunnel", false);
});

test("normal recovery never promotes a route-only two-navigation pair", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "hidden_tunnel", current_scene_manifest: { location: "hidden_tunnel", entities: ["hidden tunnel"], adjacent_locations: ["control_room", "alley_mouth"], summary: "The tunnel" } });
  assert.equal(sceneBoundRecoveryOptions({ storyState: story, previousOptions: [] }), null);
});

test("exhausted recovery rejects self-loop, duplicate identity, and unsupported route edges", () => {
  const base = { ...defaultStoryState(), current_location: "hidden_tunnel" };
  const selfLoop = normalizeStoryState({ ...base, current_scene_manifest: { location: "hidden_tunnel", entities: ["hidden tunnel"], adjacent_locations: ["hidden_tunnel", "control_room"], summary: "The tunnel" } });
  const duplicate = normalizeStoryState({ ...base, current_scene_manifest: { location: "hidden_tunnel", entities: ["hidden tunnel"], adjacent_locations: ["control_room", "control_room"], summary: "The tunnel" } });
  const unsupported = normalizeStoryState({ ...base, current_scene_manifest: { location: "hidden_tunnel", entities: ["hidden tunnel"], adjacent_locations: ["control_room", "unsupported_node"], summary: "The tunnel" } });
  assert.equal(sceneBoundRecoveryOptions({ storyState: selfLoop, previousOptions: [], exhausted: true }), null);
  assert.equal(sceneBoundRecoveryOptions({ storyState: duplicate, previousOptions: [], exhausted: true }), null);
  assert.equal(sceneBoundRecoveryOptions({ storyState: unsupported, previousOptions: [], exhausted: true }), null);
});

test("Qwen action-consequence pairs preserve the authored visible consequence", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ json: async () => ({ choices: [{ message: { content: JSON.stringify({ c: [["Feneri incele", "The old lantern is beside the misty bridge", "misty_bridge"], ["Köprüde kal", "The anonymous figure remains beneath the misty bridge", "misty_bridge"]] }) } }] }) });
  try {
    const state = { ...defaultStoryState(), current_location: "misty_bridge", current_scene_entities: ["misty_bridge", "old_lantern", "anonymous_figure"] };
    const options = await generateOptions({ storyState: state, previousOptions: [], qwenUrl: "http://mock", timeoutMs: 500 });
    assert.ok(String(options.option_1_id).startsWith("qwen_"));
    assert.match(options.option_1_result_prompt_en, /lantern|bridge/i);
    assert.match(options.option_2_result_prompt_en, /lantern|bridge/i);
    assert.notEqual(options.option_1_result_prompt_en, "The misty bridge is now visible.");
  } finally { globalThis.fetch = previousFetch; }
});

test("Qwen reconstructs two complete tuples when only the outer c array closing bracket is missing", async () => {
  const raw = '{"c":[["çatlak yolda ilerle","the cracked path is now visible","front_path"],["ağacın gölgesini izle","the tree\'s shadow is now visible","red_house"]}';
  const responseBody = JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: raw } }], usage: { completion_tokens: 46 } });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => responseBody });
  try {
    for (let fixture = 0; fixture < 6; fixture += 1) {
      const options = await generateOptions({ storyState: defaultStoryState(), previousOptions: [], qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
      const trace = options._qwenTrace;
      assert.equal(trace.candidatePairsRecovered, 2);
      assert.equal(trace.parserRecovery, "complete_tuple_reconstruction");
      assert.deepEqual(trace.candidateDiagnostics.map((item) => [item.action, item.consequence]), [
        ["Çatlak yolda ilerle", "the cracked path is now visible"],
        ["Ağacın gölgesini izle", "the tree's shadow is now visible"],
      ]);
    }
  } finally { globalThis.fetch = previousFetch; }
});

test("scene-matched library grounds options and balances route/local", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "machine_room", current_scene_manifest: { location: "machine_room", entities: ["machine room", "machine", "anonymous figure"], adjacent_locations: ["basement", "control_room"], summary: "The machine is quiet" } });
  const pair = sceneMatchedOptionLibrary(story, []);
  assert.ok(pair?._libraryTrace);
  assert.ok(pair.option_1_tr && pair.option_2_tr);
  assert.notEqual(pair.option_1_tr, pair.option_2_tr);
  assert.match(`${pair.option_1_tr} ${pair.option_2_tr}`, /Makine|Bodrum|Kontrol|Figür/);
});

test("scene-matched library does not invent absent entities", () => {
  const story = normalizeStoryState({ ...defaultStoryState(), current_location: "front_path", current_scene_manifest: { location: "front_path", entities: ["cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["red_house_exterior", "quiet_street"], summary: "A cracked path" } });
  const pair = sceneMatchedOptionLibrary(story, []);
  const text = `${pair.option_1_tr} ${pair.option_2_tr}`.toLocaleLowerCase("tr-TR");
  assert.doesNotMatch(text, /araba|portal|makine|radyo|köprü/);
});

test("physically grounded library-local actions reach pair ranking", () => {
  const story = defaultStoryState();
  const pair = sceneMatchedOptionLibrary(story, []);
  const diagnostics = pair?._candidateDiagnostics || [];
  const approach = diagnostics.find((row) => row.libraryId === "door_approach");
  const watchFigure = diagnostics.find((row) => row.libraryId === "figure_watch");
  assert.equal(approach?.accepted, true);
  assert.equal(approach?.invalidLocation, false);
  assert.equal(watchFigure?.accepted, true);
});

test("all declared routes reach ranking while final pair keeps one-navigation maximum", () => {
  const story = normalizeStoryState({
    ...defaultStoryState(),
    current_location: "quiet_street",
    current_scene_manifest: {
      location: "quiet_street",
      entities: ["quiet street", "cracked front path", "anonymous figure"],
      adjacent_locations: ["front_path", "red_house_exterior", "alley_mouth"],
      entity_states: { figure: "far" },
      summary: "An anonymous figure stands on the quiet street.",
    },
  });
  const pair = sceneMatchedOptionLibrary(story, []);
  assert.equal(pair?._libraryTrace?.navigationCount, 3);
  assert.ok((pair?._selectedRecords || []).filter((record) => record.route_type === "navigation").length <= 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import { applyStatePatch, defaultStoryState, fallbackOptions, mergeSceneAnchors, normalizeStoryState, optionMeta, validateDynamicOptions } from "../app/lib/options.mjs";

const valid = {
  option_1_tr: "Köprünün sonuna ilerle",
  option_2_tr: "Köprünün altındaki ışığa in",
  option_1_result_prompt_en: "The character is now standing at the end of a misty bridge.",
  option_2_result_prompt_en: "The character is now near a glowing light beneath the bridge.",
  option_1_scene_anchors: ["an old brass lantern", "a cracked stone bridge", "thick silver fog"],
  option_2_scene_anchors: ["an old brass lantern", "a glowing light", "the underside of the stone bridge"],
  option_1_state_patch: { current_location: "bridge_end", recent_event: "reached_bridge_end" },
  option_2_state_patch: { current_location: "under_bridge", open_hooks_add: ["source_of_light"], recent_event: "followed_light_under_bridge" },
};

test("dynamic options accept short result-state prompts and patches", () => {
  assert.deepEqual(validateDynamicOptions(valid, []), valid);
});

test("displayed options, not only winners, are used for repeat rejection", () => {
  assert.equal(validateDynamicOptions(valid, ["Köprünün sonuna ilerle"]), null);
  assert.equal(validateDynamicOptions(valid, ["Başka seçenek", "Köprünün altındaki ışığa in"]), null);
});

test("final validator rejects an exact label inside the near-repeat window", () => {
  const diagnostics = {};
  assert.equal(validateDynamicOptions(valid, ["Eski seçenek", "Köprünün sonuna ilerle"], {}, diagnostics), null);
  assert.equal(diagnostics.reason, "recent_repeat");
});

test("final validator allows an older exact label outside the near window when its visible future differs", () => {
  const revisited = {
    ...valid,
    option_1_id: "qwen_bridge_changed_0",
    option_2_id: "qwen_under_bridge_1",
    option_1_result_prompt_en: "The stone bridge is now covered with red leaves.",
    option_1_scene_anchors: ["red leaves on the stone bridge"],
    option_1_state_patch: { current_location: "bridge_end", recent_event: "bridge_changed", scene_anchors: ["red leaves on the stone bridge"], result_summary: "The stone bridge is now covered with red leaves." },
  };
  const diagnostics = {};
  assert.deepEqual(validateDynamicOptions(revisited, ["Köprünün sonuna ilerle", "Radyoyu sustur", "Fotoğrafı çevir"], {}, diagnostics), revisited, diagnostics.reason);
  assert.equal(diagnostics.reason, undefined);
});

test("final validator still rejects two identical option labels", () => {
  const duplicate = { ...valid, option_2_tr: valid.option_1_tr };
  const diagnostics = {};
  assert.equal(validateDynamicOptions(duplicate, [], {}, diagnostics), null);
  assert.equal(diagnostics.reason, "labels");
});

test("option pair cannot collapse into one inferred intent", () => {
  const sameIntent = {
    ...valid,
    option_1_tr: "Köprünün sonuna ilerle",
    option_2_tr: "Köprünün sonuna yaklaş",
  };
  assert.equal(validateDynamicOptions(sameIntent, []), null);
});

test("psyche deltas stay numeric and bounded at the Qwen gate", () => {
  const unsafe = { ...valid, option_1_psyche_delta: { curiosity: 9 } };
  assert.equal(validateDynamicOptions(unsafe, []), null);
});

test("Qwen intent metadata is restricted to the psyche vocabulary", () => {
  const unsafe = { ...valid, option_1_intent: "invent_a_new_axis" };
  assert.equal(validateDynamicOptions(unsafe, []), null);
});

test("state patch is applied to a copy and bounded", () => {
  const initial = defaultStoryState();
  const pending = applyStatePatch(initial, { current_location: "misty_bridge", recent_event: "reached_bridge", open_hooks_add: ["light_under_bridge"] });
  assert.equal(initial.current_location, "red_house_exterior");
  assert.equal(pending.current_location, "misty_bridge");
  assert.deepEqual(pending.recent_events.at(-1), "reached_bridge");
  assert.deepEqual(pending.open_hooks.at(-1), "light_under_bridge");
});

test("story state keeps only bounded history", () => {
  const state = normalizeStoryState({ recent_events: ["1", "2", "3", "4", "5", "6", "7"], recent_options: Array.from({ length: 22 }, (_, index) => String(index + 1)) });
  assert.deepEqual(state.recent_events, ["2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(state.recent_options, Array.from({ length: 20 }, (_, index) => String(index + 3)));
});

test("anchor merge renews repeats, decays omissions, and adds new anchors at ttl 3", () => {
  const merged = mergeSceneAnchors([{ text: "old lantern", ttl: 1 }, { text: "bridge", ttl: 2 }], ["bridge", "new portal"]);
  assert.deepEqual(merged, [{ text: "bridge", ttl: 3 }, { text: "new portal", ttl: 3 }]);
  const decayed = mergeSceneAnchors([{ text: "old lantern", ttl: 1 }], ["new door"]);
  assert.deepEqual(decayed, [{ text: "new door", ttl: 3 }]);
});

test("fallback does not silently renew an obsolete anchor", () => {
  const story = { ...defaultStoryState(), current_location: "luminous_world", scene_anchors: [{ text: "a luminous portal", ttl: 1 }] };
  const options = fallbackOptions([], () => 0, story);
  const meta = optionMeta(options, "1");
  assert.ok(!meta.sceneAnchors.some((anchor) => /luminous portal/i.test(anchor)));
  const next = applyStatePatch(story, meta.statePatch);
  assert.ok(!next.scene_anchors.some((anchor) => /luminous portal/i.test(anchor.text)));
});

test("fallback prefers a new base action over a recycled suffix", () => {
  const story = { ...defaultStoryState(), current_location: "long_corridor" };
  const options = fallbackOptions(["Koridordan ilerle — koridor yönünde", "Koridorun sonuna ilerle — koridor izinde"], () => 0, story);
  const base1 = options.option_1_tr.split(" — ")[0].toLowerCase();
  const base2 = options.option_2_tr.split(" — ")[0].toLowerCase();
  assert.ok(!["koridordan ilerle", "koridorun sonuna ilerle"].includes(base1));
  assert.ok(!["koridordan ilerle", "koridorun sonuna ilerle"].includes(base2));
});

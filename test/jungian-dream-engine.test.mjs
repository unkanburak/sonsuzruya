import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { defaultDreamPsyche, inferIntent, jungAwareFallbackOptions, normalizeDreamPsyche, recurringMotifForPrompt, rememberOptionPair, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";
import { applyStatePatch, defaultStoryState, fallbackOptions, generateOptions, optionMeta } from "../app/lib/options.mjs";

test("dream psyche is bounded and has neutral defaults", () => {
  const psyche = normalizeDreamPsyche({ collective_tendency: { curiosity: 9 }, recent_events: Array(99).fill("x"), recurring_symbols: Array(99).fill("mirror") });
  assert.equal(psyche.collective_tendency.curiosity, 1);
  assert.ok(psyche.recurring_symbols.length <= 6);
  assert.ok(psyche.intent_memory.length <= 8);
});

test("intent inference follows the Turkish action verb, not the scene noun", () => {
  assert.equal(inferIntent("Tünele gir"), "enter");
  assert.equal(inferIntent("Kapıdan çık"), "abandon");
  assert.equal(inferIntent("Makineyi çalıştır"), "activate");
  assert.equal(inferIntent("Merdivenden in"), "descend");
});

test("repeated confrontation gradually raises compensation", () => {
  let psyche = defaultDreamPsyche();
  for (let scene = 1; scene <= 6; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Makineyi çalıştır", intent: "confront", scene_anchors: ["a strange machine"] }, scene);
  assert.ok(psyche.collective_tendency.confrontation > 0.55);
  assert.ok(psyche.compensation_pressure > 0.5);
  assert.equal(psyche.intent_memory.length, 6);
});

test("selection history moves bounded tension axes", () => {
  let psyche = defaultDreamPsyche();
  for (let scene = 1; scene <= 8; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Makineyi çalıştır", intent: "confront" }, scene);
  assert.ok(psyche.tensions.confrontation_avoidance > 0.65);
  for (let scene = 9; scene <= 16; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Geri dön", intent: "abandon" }, scene);
  assert.ok(psyche.tensions.confrontation_avoidance < 0.65);
});

test("archetypal pressure can recover from one saturated direction", () => {
  let psyche = defaultDreamPsyche();
  for (let scene = 1; scene <= 30; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Işığı takip et", intent: "follow" }, scene);
  assert.equal(psyche.dominant_archetypal_field, "trickster");
  for (let scene = 31; scene <= 60; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Yüzleş", intent: "confront" }, scene);
  assert.equal(psyche.dominant_archetypal_field, "shadow");
  assert.ok(psyche.archetypal_pressure.trickster > 0.07);
  assert.ok(psyche.archetypal_pressure.shadow > 0.2);
});

test("symbol memory grows from history without becoming unbounded", () => {
  let psyche = defaultDreamPsyche();
  for (let scene = 1; scene <= 12; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Işığa yaklaş", intent: "approach", context: scene % 3 ? "dark_corridor" : "luminous_world", scene_anchors: [scene % 3 ? "a dark corridor" : "a glowing portal"] }, scene);
  assert.ok(psyche.recurring_symbols.length <= 6);
  const portal = psyche.recurring_symbols.find((item) => /portal/i.test(item.symbol));
  assert.ok(portal);
  assert.ok(portal.appearances > 1);
  assert.ok(portal.contexts.includes("luminous_world"));
  assert.equal(portal.last_intent, "approach");
});

test("a recent recurring symbol can return as a bounded visual hint", () => {
  let psyche = defaultDreamPsyche();
  psyche = updateDreamPsyche(psyche, { intent: "approach", scene_anchors: ["a glowing portal"], context: "glowing_path" }, 1);
  psyche = updateDreamPsyche(psyche, { intent: "inspect", scene_anchors: ["a glowing portal"], context: "mirror_room" }, 2);
  assert.equal(recurringMotifForPrompt(psyche, "The character is now standing in a dark corridor.", 5), "a glowing portal");
  assert.equal(recurringMotifForPrompt(psyche, "The character is now standing before a glowing portal.", 5), "");
  assert.equal(recurringMotifForPrompt(psyche, "The character is now standing in a dark corridor.", 2), "");
});

test("Qwen-independent fallback produces two contextual roles", () => {
  const options = jungAwareFallbackOptions({ storyState: { ...defaultStoryState(), current_location: "dark_corridor", open_hooks: ["red_door", "distant_whisper"] }, psyche: defaultDreamPsyche(), fallbackFactory: fallbackOptions, previousOptions: [] });
  assert.notEqual(options.option_1_tr, options.option_2_tr);
  assert.equal(options.option_1_archetypal_role, "continuation");
  assert.equal(options.option_2_archetypal_role, "counterpoint");
  assert.ok(options.option_1_intent);
  assert.ok(options.option_2_intent);
});

test("fallback continuation follows the active dream location while counterpoint bends it", () => {
  const options = jungAwareFallbackOptions({ storyState: { ...defaultStoryState(), current_location: "glowing_path", scene_anchors: [{ text: "a clear glowing light on a dark path", ttl: 3 }] }, psyche: defaultDreamPsyche(), fallbackFactory: fallbackOptions, previousOptions: [] });
  assert.ok(["fallback_tree", "fallback_light", "fallback_bridge", "fallback_portal", "fallback_car"].includes(options.option_1_id));
  assert.ok(["fallback_fog", "fallback_rain", "fallback_portal", "fallback_red_sky"].includes(options.option_2_id));
  assert.equal(options.option_1_archetypal_role, "continuation");
  assert.equal(options.option_2_archetypal_role, "counterpoint");
});

test("fallback defers a recently committed destination when another connected route exists", () => {
  const story = { ...defaultStoryState(), current_location: "luminous_world", recent_events: ["entered_the_luminous_portal", "found_the_glowing_tree"] };
  const options = jungAwareFallbackOptions({ storyState: story, psyche: defaultDreamPsyche(), fallbackFactory: (previous, _random, currentStory) => fallbackOptions(previous, () => 0, currentStory), previousOptions: [] });
  assert.notEqual(options.option_1_id, "fallback_portal");
  assert.notEqual(options.option_1_id, "fallback_tree");
  assert.ok(["fallback_light", "fallback_bridge"].includes(options.option_1_id));
});

test("returning motif encourages a changed counterpoint gesture", () => {
  const story = { ...defaultStoryState(), current_location: "luminous_world" };
  const psyche = { ...defaultDreamPsyche(), recurring_symbols: [{ symbol: "a luminous portal", first_seen: 1, last_seen: 4, appearances: 2, unresolved: true, strength: 0.6, contexts: ["glowing_path"], last_intent: "inspect" }] };
  let calls = 0;
  const make = (one, two, oneIntent, twoIntent) => ({
    option_1_tr: one, option_2_tr: two, option_1_en: one, option_2_en: two,
    option_1_result_prompt_en: "The character is now standing on a misty bridge.", option_2_result_prompt_en: "The character is now standing in a long dim corridor.",
    option_1_scene_anchors: ["a misty bridge"], option_2_scene_anchors: ["a long dim corridor"],
    option_1_state_patch: { current_location: "misty_bridge", recent_event: "reached_the_misty_bridge" }, option_2_state_patch: { current_location: "long_corridor", recent_event: "entered_the_long_corridor" },
    option_1_intent: oneIntent, option_2_intent: twoIntent,
  });
  const options = jungAwareFallbackOptions({ storyState: story, psyche, fallbackFactory: () => calls++ === 0 ? make("Ağaca yaklaş", "Aynaya bak", "approach", "inspect") : make("Işığı takip et", "Sis çöksün", "follow", "observe"), previousOptions: [] });
  assert.equal(options.option_2_intent, "observe");
});

test("collective confrontation pressure makes the counterpoint non-confrontational", () => {
  let psyche = defaultDreamPsyche();
  for (let scene = 1; scene <= 10; scene += 1) psyche = updateDreamPsyche(psyche, { label_tr: "Yüzleş", intent: "confront" }, scene);
  const options = jungAwareFallbackOptions({ storyState: { ...defaultStoryState(), current_location: "long_corridor" }, psyche, fallbackFactory: fallbackOptions, previousOptions: [] });
  assert.ok(["inspect", "listen", "surrender", "preserve", "observe"].includes(options.option_2_intent));
  assert.equal(options.option_2_archetypal_role, "counterpoint");
});

test("different collective choices produce different bounded dream paths", () => {
  const run = (randomValue, winner) => {
    let story = defaultStoryState();
    let psyche = defaultDreamPsyche();
    let previousOptions = [];
    const locations = [];
    for (let scene = 1; scene <= 12; scene += 1) {
      const deterministicFallback = (previous, _random, currentStory) => fallbackOptions(previous, () => randomValue, currentStory);
      const options = jungAwareFallbackOptions({ storyState: story, psyche, fallbackFactory: deterministicFallback, previousOptions });
      const meta = optionMeta(options, winner);
      const index = winner === "1" ? "1" : "2";
      locations.push(story.current_location);
      psyche = rememberOptionPair(updateDreamPsyche(psyche, { label_tr: options[`option_${index}_tr`], intent: meta.intent, psyche_delta: meta.psycheDelta, scene_anchors: meta.sceneAnchors, symbol_delta: meta.symbolDelta, context: story.current_location }, scene), options);
      story = applyStatePatch(story, meta.statePatch);
      story.recent_options = [...new Set([...story.recent_options, options.option_1_tr, options.option_2_tr])].slice(-8);
      previousOptions = story.recent_options;
    }
    return { locations, psyche };
  };
  const continuation = run(0.01, "1");
  const counterpoint = run(0.99, "2");
  assert.notDeepEqual(continuation.locations, counterpoint.locations);
  assert.notEqual(continuation.psyche.compensation_pressure, counterpoint.psyche.compensation_pressure);
});

test("Qwen fallback receives bounded current-scene grounding only", async () => {
  let requestBody = "";
  const response = {
    option_1_tr: "Kapıdan çık",
    option_2_tr: "Sisin içine bak",
    option_1_en: "Step outside",
    option_2_en: "Look into the fog",
    option_1_result_prompt_en: "The character is now standing just outside a strange doorway.",
    option_2_result_prompt_en: "The strange room is now covered in thick silver fog.",
    option_1_scene_anchors: ["a strange doorway"],
    option_2_scene_anchors: ["thick silver fog"],
    option_1_state_patch: { current_location: "outside_door", recent_event: "stepped_out" },
    option_2_state_patch: { recent_event: "watched_the_fog" },
    option_1_intent: "enter",
    option_2_intent: "inspect",
  };
  const server = createServer((req, res) => {
    req.on("data", (chunk) => { requestBody += chunk.toString(); });
    req.on("end", () => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(response) } }] })); });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let psyche = defaultDreamPsyche();
  psyche = updateDreamPsyche(psyche, { intent: "inspect", scene_anchors: ["a luminous portal"], context: "mirror_room" }, 1);
  psyche = updateDreamPsyche(psyche, { intent: "approach", scene_anchors: ["a luminous portal"], context: "glowing_path" }, 2);
  await generateOptions({ storyState: defaultStoryState(), previousOptions: [], qwenUrl: `http://127.0.0.1:${server.address().port}`, timeoutMs: 500, dreamPsyche: psyche });
  await new Promise((resolve) => server.close(resolve));
  assert.match(requestBody, /S=red house exterior/);
  assert.match(requestBody, /V=red house exterior, closed front door, bare tree, anonymous figure/);
  assert.match(requestBody, /N=red_house_doorstep, front_path/);
  assert.doesNotMatch(requestBody, /a luminous portal/);
  assert.doesNotMatch(requestBody, /DREAM MEMORY SIGNALS/);
});

test("Qwen scene that teleports outside deterministic context is rejected", async () => {
  const bad = {
    option_1_tr: "Çöle çık", option_2_tr: "Koridorda ilerle", option_1_en: "Enter the desert", option_2_en: "Walk through the corridor",
    option_1_result_prompt_en: "The character is now standing in a vast desert.", option_2_result_prompt_en: "The character is now standing in a long dim corridor.",
    option_1_scene_anchors: ["a vast desert"], option_2_scene_anchors: ["a long dim corridor"],
    option_1_state_patch: { current_location: "vast_desert", recent_event: "entered_the_desert", scene_anchors: ["a vast desert"] },
    option_2_state_patch: { current_location: "long_corridor", recent_event: "entered_the_long_corridor", scene_anchors: ["a long dim corridor"] },
  };
  const server = createServer((_req, res) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(bad) } }] })); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const result = await generateOptions({ storyState: defaultStoryState(), previousOptions: [], qwenUrl: `http://127.0.0.1:${port}`, timeoutMs: 400, dreamPsyche: defaultDreamPsyche() });
  await new Promise((resolve) => server.close(resolve));
  assert.notEqual(result.option_1_tr, "Çöle çık");
  assert.equal(result.option_1_archetypal_role, "continuation");
  assert.equal(result.option_2_archetypal_role, "counterpoint");
});

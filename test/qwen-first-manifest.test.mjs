import test from "node:test";
import assert from "node:assert/strict";
import { defaultStoryState, generateOptions, normalizeStoryState } from "../app/lib/options.mjs";

function mockedQwen(content) {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) });
  return () => { globalThis.fetch = previous; };
}

test("Qwen-first manifest accepts two grounded red-house branches", async () => {
  const restore = mockedQwen({ c: [
    ["Kapıya yaklaş", "The closed front door is now open", "red_house_doorstep"],
    ["Yolu izle", "The cracked front path is now covered with leaves", "front_path"],
  ] });
  try {
    const options = await generateOptions({ storyState: defaultStoryState(), qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    assert.equal(options._qwenTrace.finalValidationResult, "qwen");
    assert.match(options.option_1_tr, /Kapı|Yol/);
    assert.notEqual(options.option_1_result_prompt_en, options.option_2_result_prompt_en);
  } finally { restore(); }
});

test("outside manifest rejects corridor, portal, fog and orb candidates without a fallback pair", async () => {
  const restore = mockedQwen({ c: [
    ["Portaldan geç", "A glowing portal appears in thick fog", "portal_world"],
    ["Küreyi izle", "A bright orb appears in the corridor", "long_corridor"],
  ] });
  try {
    const options = await generateOptions({ storyState: defaultStoryState(), qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    assert.equal(options._qwenUnavailable, true);
    assert.equal(options.option_1_tr, undefined);
  } finally { restore(); }
});

test("memory-only entity cannot ground an ordinary physical action", async () => {
  const story = normalizeStoryState({ ...defaultStoryState(), memory_entities: ["old radio"], important_objects: ["old radio"] });
  const restore = mockedQwen({ c: [
    ["Radyoyu aç", "The old radio is now glowing beside the house", "red_house_exterior"],
    ["Radyoyu sustur", "The old radio is silent on the cracked path", "red_house_exterior"],
  ] });
  try {
    const options = await generateOptions({ storyState: story, qwenUrl: "http://mock", timeoutMs: 500, fallbackOnFailure: false });
    assert.equal(options._qwenUnavailable, true);
  } finally { restore(); }
});

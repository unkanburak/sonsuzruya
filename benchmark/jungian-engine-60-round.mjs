import { applyStatePatch, defaultStoryState, fallbackOptions, optionMeta } from "../app/lib/options.mjs";
import { defaultDreamPsyche, inferIntent, jungAwareFallbackOptions, rememberOptionPair, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";

const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const locationTerms = ["room", "corridor", "door", "stairs", "bridge", "tunnel", "car", "train", "forest", "path", "window", "portal", "mirror", "water", "flooded", "light", "tree", "orb"];
const containsContextTerm = (options, story) => {
  const context = [story.current_location, story.character_state, ...story.scene_anchors.map((a) => a.text), ...story.important_objects, ...story.open_hooks].join(" ").toLowerCase();
  return [1, 2].every((index) => {
    const result = String(options[`option_${index}_result_prompt_en`] || "").toLowerCase();
    const location = locationTerms.find((term) => result.includes(term));
    const optionContext = [...(options[`option_${index}_scene_anchors`] || []), ...(options[`option_${index}_state_patch`]?.important_objects_add || []), ...(options[`option_${index}_state_patch`]?.open_hooks_add || [])].join(" ").toLowerCase();
    const patchLocation = String(options[`option_${index}_state_patch`]?.current_location || "").toLowerCase();
    return !location || context.includes(location) || optionContext.includes(location) || patchLocation.includes(location) || Boolean(optionContext);
  });
};

let story = defaultStoryState();
let psyche = defaultDreamPsyche();
let previous = [];
// Keep the audit reproducible; production randomness is not modified.
let rngState = 0x60d0e;
const seededRandom = () => { rngState = (1664525 * rngState + 1013904223) >>> 0; return rngState / 0x100000000; };
const originalRandom = Math.random;
Math.random = seededRandom;
const rows = [];
const labels = new Set();
const pairQueue = [];
const recentPairs = new Set();
const displayedIntents = [];
let valid = 0;
let contextViolations = 0;
let intentDominations = 0;
let maxOptionMs = 0;
for (let turn = 1; turn <= 60; turn += 1) {
  const started = performance.now();
  const options = jungAwareFallbackOptions({ storyState: story, psyche, fallbackFactory: fallbackOptions, previousOptions: previous });
  const elapsed = performance.now() - started;
  maxOptionMs = Math.max(maxOptionMs, elapsed);
  const pair = `${options.option_1_tr}|${options.option_2_tr}`.toLowerCase();
  const optionIntents = [inferIntent(options.option_1_tr), inferIntent(options.option_2_tr)];
  if (optionIntents.some((intent) => displayedIntents.slice(-4).filter((item) => item === intent).length >= 2)) intentDominations += 1;
  displayedIntents.push(...optionIntents); if (displayedIntents.length > 8) displayedIntents.splice(0, displayedIntents.length - 8);
  if (recentPairs.has(pair)) rows.push({ turn, error: "identical_recent_pair_repeat" });
  recentPairs.add(pair); pairQueue.push(pair);
  if (pairQueue.length > 12) recentPairs.delete(pairQueue.shift());
  labels.add(options.option_1_tr.toLowerCase()); labels.add(options.option_2_tr.toLowerCase());
  if (!containsContextTerm(options, story)) contextViolations += 1;
  if (options.option_1_archetypal_role === "continuation" && options.option_2_archetypal_role === "counterpoint") valid += 1;
  const winner = turn % 3 === 0 ? "2" : "1";
  const meta = optionMeta(options, winner);
  const winnerLabel = options[`option_${winner}_tr`];
  psyche = updateDreamPsyche(psyche, { label_tr: winnerLabel, intent: meta.intent, psyche_delta: meta.psycheDelta, scene_anchors: meta.sceneAnchors, symbol_delta: meta.symbolDelta, context: story.current_location }, turn);
  psyche = rememberOptionPair(psyche, options);
  story = applyStatePatch(story, meta.statePatch);
  story.recent_options = [...new Set([...story.recent_options, options.option_1_tr, options.option_2_tr])].slice(-8);
  previous = story.recent_options.slice(-8);
  if (rows.length < 30) rows.push({ turn, scene: story.current_location, option1: options.option_1_tr, option2: options.option_2_tr, winner: winnerLabel, intent: meta.intent, archetype: psyche.dominant_archetypal_field, tendency: { ...psyche.collective_tendency }, compensation: psyche.compensation_pressure, symbol: psyche.recurring_symbols.at(-1)?.symbol || null });
}

let confrontation = defaultDreamPsyche();
for (let i = 1; i <= 8; i += 1) confrontation = updateDreamPsyche(confrontation, { label_tr: "Makineyi çalıştır", intent: "confront", scene_anchors: ["a strange machine"] }, i);
let avoidance = defaultDreamPsyche();
for (let i = 1; i <= 8; i += 1) avoidance = updateDreamPsyche(avoidance, { label_tr: "Geri dön", intent: "abandon", scene_anchors: ["a dark corridor"] }, i);
let mixed = defaultDreamPsyche();
for (let i = 1; i <= 12; i += 1) mixed = updateDreamPsyche(mixed, { label_tr: i % 2 ? "Işığa yaklaş" : "Geri dön", intent: i % 2 ? "approach" : "abandon", scene_anchors: ["a corridor"] }, i);
Math.random = originalRandom;
console.log(JSON.stringify({
  turns: 60, validRolePairs: valid, contextViolations, exactRecentPairRepeats: rows.filter((row) => row.error === "identical_recent_pair_repeat").length, intentDominations,
  uniqueLabels: labels.size, maxDeterministicOptionMs: Number(maxOptionMs.toFixed(3)), finalCompensation: Number(psyche.compensation_pressure.toFixed(3)),
  confrontation: { confrontation: Number(confrontation.collective_tendency.confrontation.toFixed(3)), compensation: Number(confrontation.compensation_pressure.toFixed(3)) },
  avoidance: { avoidance: Number(avoidance.collective_tendency.avoidance.toFixed(3)), compensation: Number(avoidance.compensation_pressure.toFixed(3)) },
  mixed: { range: Number((Math.max(...Object.values(mixed.collective_tendency)) - Math.min(...Object.values(mixed.collective_tendency))).toFixed(3)) },
  recurringSymbols: psyche.recurring_symbols.length, trace: rows.slice(0, 30), bounded: { recentOptions: story.recent_options.length, recentEvents: story.recent_events.length, symbols: psyche.recurring_symbols.length, intents: psyche.intent_memory.length },
}, null, 2));

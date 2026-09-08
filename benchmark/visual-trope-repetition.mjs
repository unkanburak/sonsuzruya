import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyStatePatch, defaultStoryState, fallbackOptions, jungContextGate, optionMeta, recordRenderedVisualMotifs } from "../app/lib/options.mjs";
import { buildJungCandidateDirections, defaultDreamPsyche, jungAwareFallbackOptions, rememberOptionPair, updateDreamPsyche, visualMotifFamiliesForText } from "../app/lib/jungian-dream-engine.mjs";

const ROOT = process.cwd();
const OUT = join(ROOT, "benchmark", "visual-trope-repetition");
const N = Number(process.env.TROPE_ROUNDS || 150);
const navIntents = new Set(["enter", "approach", "descend", "ascend", "follow", "abandon", "return"]);
const genericFamilies = new Set(["THRESHOLD", "PASSAGE", "LIGHT_EFFECT", "ATMOSPHERIC", "WINDOW", "LONE_NATURE", "VEHICLE"]);
const rng = (seed) => { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; };

function choose(options, random) { return random() < 0.5 ? "1" : "2"; }
function update(story, psyche, options, winner, scene) {
  const meta = optionMeta(options, winner);
  const pending = applyStatePatch(story, meta.statePatch);
  const nextPsyche = updateDreamPsyche(psyche, { label_tr: options[`option_${winner}_tr`], intent: meta.intent, psyche_delta: meta.psycheDelta, scene_anchors: meta.sceneAnchors, symbol_delta: meta.symbolDelta, context: pending.current_location }, scene);
  const committed = recordRenderedVisualMotifs(pending, [meta.resultPrompt, ...meta.sceneAnchors].join(" "));
  committed.recent_options = [...new Set([...committed.recent_options, options.option_1_tr, options.option_2_tr])].slice(-8);
  return { story: committed, psyche: rememberOptionPair(nextPsyche, options), meta };
}

function runMode(mode, seed) {
  const random = rng(seed); let story = defaultStoryState(); let psyche = defaultDreamPsyche();
  const fallbackFactory = (previous, _random, currentStory) => fallbackOptions(previous, random, currentStory);
  const motifCounts = Object.fromEntries(["THRESHOLD", "PASSAGE", "LIGHT_EFFECT", "ATMOSPHERIC", "WINDOW", "LONE_NATURE", "VEHICLE", "WATER", "MECHANICAL", "DOMESTIC"].map((key) => [key, 0]));
  let navigation = 0; let navigationHeavyPairs = 0; let genericScenes = 0; let exactPairRepeats = 0; let contextViolations = 0; let previousPair = new Set(); let maxSameFamily = 0; let lastFamily = null; let sameFamily = 0; const samples = [];
  for (let scene = 1; scene <= N; scene += 1) {
    // Ablation control: clearing the bounded history removes only the new
    // motif penalty while keeping the same renderable catalog and RNG.
    const plannerStory = mode === "ablation_no_motif_memory" ? { ...story, recent_visual_motifs: [] } : story;
    const options = jungAwareFallbackOptions({ storyState: plannerStory, psyche, fallbackFactory, previousOptions: plannerStory.recent_options || [] });
    const candidates = buildJungCandidateDirections({ storyState: plannerStory, psyche, fallbackFactory, previousOptions: plannerStory.recent_options || [] });
    if (!jungContextGate(options, plannerStory, candidates)) contextViolations += 1;
    const pair = `${options.option_1_tr}|${options.option_2_tr}`.toLowerCase();
    if (previousPair.has(pair)) exactPairRepeats += 1;
    previousPair.add(pair);
    if (navIntents.has(options.option_1_intent || "") && navIntents.has(options.option_2_intent || "")) navigationHeavyPairs += 1;
    const winner = choose(options, random);
    const result = options[`option_${winner}_result_prompt_en`];
    const families = visualMotifFamiliesForText([result, ...(options[`option_${winner}_scene_anchors`] || [])].join(" "));
    for (const family of families) motifCounts[family] = (motifCounts[family] || 0) + 1;
    // Count the specific cliché cluster this patch targets: a threshold or
    // passage scene combined with light/fog. A single rain, room or tree is a
    // legitimate visual detail and is not itself a generic-dream failure.
    const hasRouteTrope = families.includes("THRESHOLD") || families.includes("PASSAGE");
    const hasGlowAtmosphere = families.includes("LIGHT_EFFECT") || families.includes("ATMOSPHERIC");
    if (hasRouteTrope && hasGlowAtmosphere) genericScenes += 1;
    if (navIntents.has(options[`option_${winner}_intent`])) navigation += 1;
    const dominant = families[0] || "NONE";
    if (dominant === lastFamily) sameFamily += 1; else sameFamily = 1;
    lastFamily = dominant; maxSameFamily = Math.max(maxSameFamily, sameFamily);
    if (scene <= 20) samples.push({ scene, winner, label: options[`option_${winner}_tr`], result, families });
    const committed = update(story, psyche, options, winner, scene);
    story = committed.story; psyche = committed.psyche;
  }
  return { mode, rounds: N, motifCounts, motifFrequency: Object.fromEntries(Object.entries(motifCounts).map(([key, value]) => [key, Number((value / N).toFixed(4))])), navigationHeavyRatio: Number((navigationHeavyPairs / N).toFixed(4)), renderedNavigationRatio: Number((navigation / N).toFixed(4)), genericDreamTropeRatio: Number((genericScenes / N).toFixed(4)), exactPairRepeats, contextViolations, maxSameFamilyRecurrence: maxSameFamily, finalStoryMotifs: story.recent_visual_motifs, samples };
}

async function captureRealScenes() {
  const base = "http://127.0.0.1:3000"; const dir = join(OUT, "real-scenes"); const realCount = Number(process.env.REAL_SCENES || 15); await mkdir(dir, { recursive: true });
  let state = await (await fetch(`${base}/api/state`)).json(); const rows = [];
  for (let i = 1; i <= realCount; i += 1) {
    const userId = `trope-review-${Date.now()}-${i}`;
    const before = Number(state.sceneNumber || 0);
    await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, vote: String((i % 2) + 1) }) });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) { await new Promise((resolve) => setTimeout(resolve, 250)); state = await (await fetch(`${base}/api/state`)).json(); if (Number(state.sceneNumber || 0) > before && state.phase === "PLAYING_VOTING") break; }
    if (Number(state.sceneNumber || 0) <= before) { rows.push({ turn: i, status: "timeout", sceneNumber: state.sceneNumber }); continue; }
    const media = String(state.media || ""); const response = await fetch(`${base}${media}`); const bytes = Buffer.from(await response.arrayBuffer()); const file = `turn_${String(i).padStart(2, "0")}_scene_${state.sceneNumber}.png`; await writeFile(join(dir, file), bytes);
    rows.push({ turn: i, sceneNumber: state.sceneNumber, media, file: join("benchmark", "visual-trope-repetition", "real-scenes", file), bytes: bytes.length, options: [state.options?.option_1_tr, state.options?.option_2_tr] });
  }
  await writeFile(join(OUT, "real-scenes.json"), JSON.stringify(rows, null, 2)); return rows;
}

const before = runMode("ablation_no_motif_memory", 0x51f15);
const after = runMode("motif_memory_enabled", 0x51f15);
let realScenes = [];
if (process.env.SKIP_REAL !== "1") realScenes = await captureRealScenes();
const result = { generatedAt: new Date().toISOString(), deterministicRounds: N, before, after, realScenes };
await mkdir(OUT, { recursive: true }); await writeFile(join(ROOT, "benchmark", "visual-trope-repetition-results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ before: { motifFrequency: before.motifFrequency, navigationHeavyRatio: before.navigationHeavyRatio, genericDreamTropeRatio: before.genericDreamTropeRatio, maxSameFamilyRecurrence: before.maxSameFamilyRecurrence }, after: { motifFrequency: after.motifFrequency, navigationHeavyRatio: after.navigationHeavyRatio, genericDreamTropeRatio: after.genericDreamTropeRatio, maxSameFamilyRecurrence: after.maxSameFamilyRecurrence }, realScenes: realScenes.length }, null, 2));

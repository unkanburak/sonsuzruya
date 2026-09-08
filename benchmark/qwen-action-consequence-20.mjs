import { appendFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { defaultStoryState, generateOptions, normalizeStoryState } from "../app/lib/options.mjs";

const qwenUrl = process.env.QWEN_URL || "http://127.0.0.1:8080";
const scenes = [
  ["misty_bridge", ["misty_bridge", "old_lantern", "standing_alone"]],
  ["strange_room", ["strange_room", "old_radio", "standing_alone"]],
  ["wooden_hallway", ["wooden_hallway", "old_photograph", "standing_alone"]],
  ["machine_room", ["machine_room", "strange_machine", "standing_alone"]],
  ["flooded_room", ["flooded_room", "still_water", "standing_alone"]],
];
const rows = []; let previous = [];
for (let i = 0; i < 20; i += 1) {
  const [location, entities] = scenes[i % scenes.length];
  const state = normalizeStoryState({ ...defaultStoryState(), current_location: location, current_scene_entities: entities, memory_entities: ["old_portal", "forgotten_key"], scene_anchors: [{ text: entities[1], ttl: 3 }], recent_events: [`round_${i}_committed`] });
  const started = performance.now();
  const options = await generateOptions({ storyState: state, previousOptions: previous.slice(-8), qwenUrl, timeoutMs: Number(process.env.QWEN_TIMEOUT_MS || 8000) });
  const elapsed = performance.now() - started;
  const trace = options._creativeTrace || {};
  const qwen = String(options.option_1_id || "").startsWith("qwen_") && String(options.option_2_id || "").startsWith("qwen_");
  rows.push({ round: i + 1, location, elapsedMs: Math.round(elapsed), source: qwen ? "qwen" : "fallback", currentSceneEntities: state.current_scene_entities, memoryEntities: state.memory_entities, rawCandidates: trace.candidates || [], options: { option1: { action: options.option_1_tr, consequence: options.option_1_result_prompt_en }, option2: { action: options.option_2_tr, consequence: options.option_2_result_prompt_en } } });
  previous.push(options.option_1_tr, options.option_2_tr);
}
const times = rows.map((row) => row.elapsedMs).sort((a, b) => a - b); const percentile = (p) => times[Math.min(times.length - 1, Math.ceil(times.length * p) - 1)] || 0;
const summary = { generatedAt: new Date().toISOString(), qwenUrl, calls: rows.length, qwenCalls: rows.filter((row) => row.source === "qwen").length, fallbackCalls: rows.filter((row) => row.source === "fallback").length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), minMs: times[0] || 0, maxMs: times.at(-1) || 0, rows };
await writeFile("benchmark/qwen-action-consequence-20-result.json", JSON.stringify(summary, null, 2), "utf8");
await appendFile("benchmark/qwen-action-consequence-20.jsonl", rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
console.log(JSON.stringify({ ...summary, rows: undefined }, null, 2));

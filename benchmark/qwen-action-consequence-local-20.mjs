import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { applyStatePatch, defaultStoryState, generateOptions, normalizeStoryState } from "../app/lib/options.mjs";

const qwenUrl = process.env.QWEN_URL || "http://127.0.0.1:8080";
let story = normalizeStoryState({ ...defaultStoryState(), current_location: "strange_room", current_scene_entities: ["strange_room", "standing_alone"], memory_entities: ["old_radio", "old_photograph"] });
let previous = []; const rounds = [];
for (let i = 0; i < 20; i += 1) {
  const started = performance.now();
  const options = await generateOptions({ storyState: story, previousOptions: previous.slice(-8), qwenUrl, timeoutMs: 8000 });
  const elapsedMs = Math.round(performance.now() - started); const trace = options._creativeTrace || {};
  const source = String(options.option_1_id || "").startsWith("qwen_") && String(options.option_2_id || "").startsWith("qwen_") ? "qwen" : "fallback";
  const winnerIndex = i % 2 === 0 ? 1 : 2;
  const winnerPatch = options[`option_${winnerIndex}_state_patch`] || {};
  rounds.push({ round: i + 1, elapsedMs, source, currentCommittedScene: story.current_location, currentPhysicalEntities: story.current_scene_entities, memoryOnlyEntities: story.memory_entities, rawQwenCandidates: trace.candidates || [], finalOptions: [1, 2].map((index) => ({ action: options[`option_${index}_tr`], consequence: options[`option_${index}_result_prompt_en`] })), winner: options[`option_${winnerIndex}_tr`], winnerConsequence: options[`option_${winnerIndex}_result_prompt_en`] });
  story = applyStatePatch(story, winnerPatch); previous = [...previous, options.option_1_tr, options.option_2_tr].slice(-8);
}
const times = rounds.map((item) => item.elapsedMs).sort((a, b) => a - b); const pct = (p) => times[Math.min(times.length - 1, Math.ceil(times.length * p) - 1)] || 0;
const report = { generatedAt: new Date().toISOString(), qwenUrl, roundsCompleted: rounds.length, qwenRounds: rounds.filter((item) => item.source === "qwen").length, fallbackRounds: rounds.filter((item) => item.source === "fallback").length, p50Ms: pct(0.5), p95Ms: pct(0.95), rounds };
await writeFile("benchmark/qwen-action-consequence-local-20-result.json", JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ ...report, rounds: undefined }, null, 2));

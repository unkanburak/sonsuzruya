import { readFile, writeFile } from "node:fs/promises";
import { generateOptions } from "../app/lib/options.mjs";

const qwenUrl = process.env.QWEN_URL || "http://127.0.0.1:8080";
const source = JSON.parse(await readFile("state/current.json", "utf8"));
const baseStory = source.storyState || { current_location: "strange_room", character_state: "standing_alone", current_scene_entities: ["strange_room", "standing_alone"], memory_entities: [], recent_events: [], recent_options: [], scene_anchors: [], open_hooks: [], tone: "mysterious_surreal" };
const psyche = source.dreamPsyche || source.dream_psyche;
const previous = source.storyState?.recent_options || [];

async function runTokenSeries(tokens, count = 20) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const story = { ...baseStory, current_location: `${baseStory.current_location || "strange_room"}_${tokens}_${i}` };
    const started = Date.now();
    const result = await generateOptions({ storyState: story, previousOptions: previous, qwenUrl, timeoutMs: 12000, maxTokens: tokens, dreamPsyche: psyche });
    rows.push({ index: i + 1, tokens, elapsedMs: Date.now() - started, source: String(result.option_1_id || "").startsWith("fallback_") ? "fallback" : "qwen", trace: result._qwenTrace || null });
  }
  return rows;
}

const results = { generatedAt: new Date().toISOString(), productionMaxTokens: 48, timeoutMs: 12000, series48: await runTokenSeries(48), series64: await runTokenSeries(64) };
for (const key of ["series48", "series64"]) {
  const rows = results[key]; const lat = rows.map((r) => r.elapsedMs).sort((a, b) => a - b);
  results[key + "Summary"] = { count: rows.length, qwen: rows.filter((r) => r.source === "qwen").length, fallback: rows.filter((r) => r.source === "fallback").length, completeJson: rows.filter((r) => r.trace?.rawJsonComplete).length, completePairs: rows.filter((r) => Number(r.trace?.candidatePairsRecovered || 0) >= 2).length, p50Ms: lat[Math.floor(lat.length * 0.5)] ?? null, p95Ms: lat[Math.min(lat.length - 1, Math.ceil(lat.length * 0.95) - 1)] ?? null, reasons: Object.fromEntries(rows.reduce((m, r) => { const k = r.trace?.fallbackReason || "QWEN_SUCCESS"; m.set(k, (m.get(k) || 0) + 1); return m; }, new Map())) };
}
await writeFile(process.env.RESULT_FILE || "benchmark/qwen-live-runtime-recovery-result.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify({ series48: results.series48Summary, series64: results.series64Summary }, null, 2));

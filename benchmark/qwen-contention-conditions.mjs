import { readFile, writeFile } from "node:fs/promises";
import { generateOptions } from "../app/lib/options.mjs";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";
const cfg = JSON.parse(await readFile("config.json", "utf8"));
const saved = JSON.parse(await readFile("state/current.json", "utf8"));
const story = { ...saved.storyState, current_location: "misty_bridge", character_state: "standing_alone", current_scene_entities: ["misty_bridge", "a cracked stone bridge", "standing_alone", "silver fog"], memory_entities: [], recent_events: ["reached_the_misty_bridge"], recent_options: [], scene_anchors: [{ text: "a cracked stone bridge", ttl: 3 }], open_hooks: [], tone: "mysterious_surreal" };
const psyche = saved.dreamPsyche || saved.dream_psyche;
const previous = story?.recent_options || [];
const qwenUrl = process.env.QWEN_URL || cfg.qwenUrl;
const engine = new ComfyImageEngine({ comfyUrl: cfg.comfyUrl, comfyRoot: cfg.comfyRoot, outputRoot: cfg.comfyOutputRoot || cfg.comfyRoot, profile: cfg.imageProfile, initialInput: cfg.initialInput, timeoutMs: cfg.generationTimeoutMs });
async function qwen(label, i) { const t = Date.now(); const out = await generateOptions({ storyState: { ...story, current_location: story.current_location }, previousOptions: previous, qwenUrl, timeoutMs: cfg.qwenTimeoutMs, maxTokens: 64, dreamPsyche: psyche }); return { label, i, elapsedMs: Date.now() - t, source: String(out.option_1_id || "").startsWith("fallback_") ? "fallback" : "qwen", trace: out._qwenTrace || null }; }
const mode = process.env.MODE || "ALL";
const result = { generatedAt: new Date().toISOString(), timeoutMs: cfg.qwenTimeoutMs, mode, isolatedNodeNoComfy: [], nodeComfyIdle: [], nodeParallelSdxl: [], nodeSequentialSdxlFirst: [] };
if (mode === "A" || mode === "ALL") for (let i = 0; i < 5; i += 1) result.isolatedNodeNoComfy.push(await qwen("A", i + 1));
if (mode === "B" || mode === "ALL") for (let i = 0; i < 5; i += 1) result.nodeComfyIdle.push(await qwen("B", i + 1));
if (mode === "C" || mode === "ALL") for (let i = 0; i < 5; i += 1) { const q = qwen("C", i + 1); const s = engine.generate({ prompt: `Contention diagnostic scene ${i + 1}.`, sceneNumber: `qwen-contention-${i + 1}`, seed: 900000 + i }); const t = Date.now(); const [qr, sr] = await Promise.allSettled([q, s]); result.nodeParallelSdxl.push({ qwen: qr.status === "fulfilled" ? qr.value : { error: String(qr.reason) }, sdxl: sr.status === "fulfilled" ? { elapsedMs: Date.now() - t, generationTime: sr.value.generationTime } : { error: String(sr.reason) } }); }
if (mode === "D" || mode === "ALL") for (let i = 0; i < 5; i += 1) { const t = Date.now(); const sr = await engine.generate({ prompt: `Sequential diagnostic scene ${i + 1}.`, sceneNumber: `qwen-sequential-${i + 1}`, seed: 910000 + i }); const qr = await qwen("D", i + 1); result.nodeSequentialSdxlFirst.push({ sdxl: { elapsedMs: sr ? Date.now() - t : null, generationTime: sr.generationTime }, qwen: qr }); }
function summary(rows) { const flat = rows.map((r) => r.qwen || r).filter((r) => r && r.elapsedMs); const lat = flat.map((r) => r.elapsedMs).sort((a, b) => a - b); return { count: flat.length, qwen: flat.filter((r) => r.source === "qwen").length, fallback: flat.filter((r) => r.source === "fallback").length, p50Ms: lat[Math.floor(lat.length * .5)] ?? null, p95Ms: lat[Math.ceil(lat.length * .95) - 1] ?? null, reasons: Object.fromEntries(flat.reduce((m, r) => { const k = r.trace?.fallbackReason || "QWEN_SUCCESS"; m.set(k, (m.get(k) || 0) + 1); return m; }, new Map())) }; }
result.summaries = { A: summary(result.isolatedNodeNoComfy), B: summary(result.nodeComfyIdle), C: summary(result.nodeParallelSdxl), D: summary(result.nodeSequentialSdxlFirst) };
await writeFile("benchmark/qwen-contention-conditions-result.json", JSON.stringify(result, null, 2)); console.log(JSON.stringify(result.summaries, null, 2));

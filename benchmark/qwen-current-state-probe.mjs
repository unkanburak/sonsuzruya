import { performance } from "node:perf_hooks";
import { generateOptions } from "../app/lib/options.mjs";
const state = await (await fetch("http://127.0.0.1:3000/api/state")).json();
const started = performance.now();
const options = await generateOptions({ storyState: state.storyState, previousOptions: state.storyState?.recent_options || [], qwenUrl: "http://127.0.0.1:8080", timeoutMs: 12000, dreamPsyche: state.dreamPsyche || state.dream_psyche });
console.log(JSON.stringify({ latencyMs: Number((performance.now() - started).toFixed(1)), source: String(options.option_1_id || "").startsWith("qwen_") ? "qwen" : "fallback", options }, null, 2));

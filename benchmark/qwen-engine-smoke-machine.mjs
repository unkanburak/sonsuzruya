import { performance } from "node:perf_hooks";
import { defaultStoryState, generateOptions } from "../app/lib/options.mjs";
const story = { ...defaultStoryState(), current_location: "machine_room", important_objects: ["strange_machine", "blue_switch"], scene_anchors: [{ text: "dust", ttl: 3 }, { text: "blue reflections", ttl: 3 }], recent_events: ["entered_machine_room"] };
const started = performance.now(); const options = await generateOptions({ storyState: story, previousOptions: [], qwenUrl: "http://127.0.0.1:8080", timeoutMs: 8000, dreamPsyche: { tensions: { control: 0.7 }, compensation_pressure: 0.4, collective_tendency: "threshold", recurring_symbols: [] } });
console.log(JSON.stringify({ latencyMs: Number((performance.now() - started).toFixed(1)), source: options.option_1_id?.startsWith("qwen_") ? "qwen" : "fallback", options }, null, 2));

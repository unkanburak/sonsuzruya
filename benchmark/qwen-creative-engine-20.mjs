import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import { defaultStoryState, generateOptions } from "../app/lib/options.mjs";
const scenes = [
  ["misty_bridge", ["old_lantern"], ["silver fog", "distant water"]], ["wooden_hallway", ["broken_watch"], ["dim warm light"]], ["machine_room", ["strange_machine", "blue_switch"], ["dust", "blue reflections"]], ["flooded_room", ["old_table", "paper_receipt"], ["still water"]], ["red_house_exterior", ["iron_key", "overgrown_tree"], ["cold rain"]], ["small_kitchen", ["old_radio", "family_photograph"], ["muted dawn"]], ["dark_tunnel", ["old_lantern"], ["distant light", "water"]], ["empty_classroom", ["wooden_desks", "stopped_clock"], ["late haze"]], ["mirror_room", ["giant_mirror", "wooden_chair"], ["blue shadow"]], ["glowing_forest", ["glowing_tree"], ["red sky", "mist"]]
];
const rows = [];
for (let i = 0; i < 20; i += 1) {
  const [location, objects, anchors] = scenes[i % scenes.length];
  const story = { ...defaultStoryState(), current_location: location, important_objects: objects, scene_anchors: anchors.map((text) => ({ text, ttl: 3 })), recent_events: [`entered_${location}`, ...(i ? [`observed_${scenes[(i - 1) % scenes.length][0]}`] : [])], recent_options: i ? [`previous option ${i}`] : [] };
  const started = performance.now();
  const options = await generateOptions({ storyState: story, previousOptions: story.recent_options, qwenUrl: "http://127.0.0.1:8080", timeoutMs: 8000, dreamPsyche: { tensions: { approach_avoidance: 0.5 + (i % 3) * 0.1 }, compensation_pressure: (i % 4) * 0.2, collective_tendency: "threshold", recurring_symbols: [] } });
  rows.push({ round: i + 1, location, latencyMs: Number((performance.now() - started).toFixed(1)), source: String(options.option_1_id || "").startsWith("qwen_") ? "qwen" : "fallback", option1: options.option_1_tr, option2: options.option_2_tr, option1Id: options.option_1_id, option2Id: options.option_2_id });
  console.log(JSON.stringify(rows.at(-1)));
}
const values = rows.map((row) => row.latencyMs).sort((a, b) => a - b); const pct = (p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] ?? null;
const out = { generatedAt: new Date().toISOString(), rows, successRate: rows.filter((row) => row.source === "qwen").length / rows.length, qwenCount: rows.filter((row) => row.source === "qwen").length, fallbackCount: rows.filter((row) => row.source === "fallback").length, p50Ms: pct(0.5), p95Ms: pct(0.95) };
await fs.writeFile("benchmark/qwen-creative-engine-20-result.json", JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2));

import { performance } from "node:perf_hooks";
import { defaultStoryState, jungContextGate, validateDynamicOptions } from "../app/lib/options.mjs";

const endpoint = process.env.QWEN_URL || "http://127.0.0.1:8080";
const scenes = [
  { location: "quiet_dining_room", objects: ["old_radio", "family_photograph", "warm_tea"], figures: ["two_anonymous_figures"], environment: "rain outside an open doorway" },
  { location: "misty_bridge", objects: ["old_lantern"], figures: ["one_anonymous_figure"], environment: "silver fog and distant water" },
  { location: "wooden_hallway", objects: ["broken_watch"], figures: ["one_anonymous_figure"], environment: "dim warm practical light" },
  { location: "machine_room", objects: ["strange_machine", "blue_switch"], figures: ["one_anonymous_figure"], environment: "dust and blue reflections" },
  { location: "flooded_room", objects: ["old_table", "paper_receipt"], figures: [], environment: "still reflective water" },
  { location: "empty_classroom", objects: ["wooden_desks", "stopped_clock"], figures: ["seated_anonymous_figure"], environment: "late afternoon haze" },
  { location: "submerged_tunnel_entrance", objects: ["lantern"], figures: ["partial_anonymous_figure"], environment: "dark water and pale light" },
  { location: "red_house_exterior", objects: ["iron_key", "overgrown_tree"], figures: [], environment: "cold evening rain" },
  { location: "mirror_room", objects: ["giant_mirror", "wooden_chair"], figures: ["backlit_anonymous_figure"], environment: "quiet blue shadow" },
  { location: "small_kitchen", objects: ["telephone", "cup", "photograph"], figures: ["one_anonymous_figure"], environment: "muted dawn light" },
];
const system = "You are a concise safe interactive dream option generator. Return JSON only, no markdown, no explanation. Use only visible current-scene entities. Option 1 is natural continuation; option 2 is a controlled surprising transformation of an existing entity. No unrelated props/locations, violence, brands, real people or copyrighted characters.";
const makePrompt = (scene) => `CURRENT SCENE MANIFEST\nVISIBLE CURRENT: location=${scene.location}; objects=${scene.objects.join(", ") || "none"}; figures=${scene.figures.join(", ") || "none"}; environment=${scene.environment}.\nMEMORY: bounded recent events only; do not treat as visible.\nJUNG DIRECTION: choose psychological behavior (approach/avoidance, confrontation/surrender, control/release), never literal scenery.\nReturn exactly these fields: option_1_tr, option_2_tr, option_1_en, option_2_en, option_1_result_prompt_en, option_2_result_prompt_en, option_1_scene_anchors, option_2_scene_anchors, option_1_state_patch, option_2_state_patch. Result prompts describe completed visual states in short English. Each option <=8 words and each result prompt <=24 words.`;

const results = [];
for (let i = 0; i < scenes.length; i += 1) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const row = { probe: i + 1, scene: scenes[i].location, endpoint, httpStatus: null, latencyMs: null, reason: null, validJson: false, schemaAccepted: false, contextAccepted: false, generatedTokens: null, promptTokens: null, tokensPerSecond: null };
  try {
    const response = await fetch(`${endpoint}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: "qwen3-4b", temperature: 0.8, max_tokens: 320, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: makePrompt(scenes[i]) }] }) });
    row.httpStatus = response.status;
    const body = await response.json();
    row.latencyMs = Number((performance.now() - started).toFixed(1));
    const content = body?.choices?.[0]?.message?.content || "";
    try { const match = content.match(/\{[\s\S]*\}/); const parsed = match ? JSON.parse(match[0]) : null; row.validJson = Boolean(parsed); if (parsed) { const state = { ...defaultStoryState(), current_location: scenes[i].location, important_objects: scenes[i].objects, character_state: scenes[i].figures.join("_") || "absent" }; const schema = validateDynamicOptions(parsed, [], state); row.schemaAccepted = Boolean(schema); row.contextAccepted = Boolean(schema && jungContextGate(schema, state, [])); } } catch { row.validJson = false; }
    const usage = body?.usage || {};
    row.generatedTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
    row.promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? null;
    row.tokensPerSecond = row.generatedTokens && row.latencyMs ? Number((row.generatedTokens / (row.latencyMs / 1000)).toFixed(2)) : null;
    row.reason = row.httpStatus < 200 || row.httpStatus >= 300 ? "QWEN_HTTP_ERROR" : row.contextAccepted ? "QWEN_SUCCESS" : row.schemaAccepted ? "QWEN_CONTEXT_REJECT" : row.validJson ? "QWEN_SCHEMA_REJECT" : "QWEN_JSON_REJECT";
  } catch (error) { row.latencyMs = Number((performance.now() - started).toFixed(1)); row.reason = error?.name === "AbortError" ? "QWEN_TIMEOUT" : "QWEN_HTTP_ERROR"; row.error = String(error?.message || error); } finally { clearTimeout(timer); }
  results.push(row);
  console.error(JSON.stringify(row));
}
const latency = results.filter((row) => row.latencyMs).map((row) => row.latencyMs).sort((a, b) => a - b);
const percentile = (values, p) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] : null;
console.log(JSON.stringify({ endpoint, probes: results.length, results, p50Ms: percentile(latency, 0.5), p95Ms: percentile(latency, 0.95), reasonCounts: Object.fromEntries([...new Set(results.map((row) => row.reason))].map((reason) => [reason, results.filter((row) => row.reason === reason).length])) }, null, 2));

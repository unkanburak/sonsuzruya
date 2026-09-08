// Micro A/B spike: current Soft Lock versus result-state-gated protagonist
// presence. Production config and prompts are not changed by this script.
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(execFile);
const URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const ROOT = path.resolve("benchmark/protagonist-presence-spike");
const OUTPUT_ROOT = path.resolve("runtime/comfy8188-output");
const STYLE = "cinematic surreal realism, muted cool palette, restrained warm practical lighting, atmospheric haze, realistic materials, no text, no logo, no brand, no celebrity, no copyrighted character, no violence, no weapon, no gore, no nsfw";
const scenes = [
  { id: "radio", mode: "ABSENT_OBJECT_LED", result: "An old radio is playing on a quiet wooden table; the room and radio carry the scene.", b: "Object close-up of the old radio on the table, subtle sound implied visually, no visible protagonist required." },
  { id: "photograph", mode: "ABSENT_OBJECT_LED", result: "A family photograph lies face-down on a wooden tabletop beside a small cup.", b: "Close tabletop composition focused on the face-down photograph and cup; hands may enter the frame, no full protagonist." },
  { id: "tea", mode: "ABSENT_OBJECT_LED", result: "Tea has spilled across a kitchen table, reflecting the dim room light.", b: "Object-led close shot of spilled tea spreading across the table, the environment carries the result, no protagonist required." },
  { id: "outside_house", mode: "OPTIONAL_PARTIAL", result: "Someone appears outside the abandoned red house in the rain.", b: "Asymmetric over-the-shoulder view from a doorway toward a distant figure outside the red house; protagonist may be only a partial foreground edge." },
  { id: "watch_exchange", mode: "REQUIRED_TWO_FIGURE", result: "The protagonist gives a broken watch to another anonymous adult figure in a dim room.", b: "Two-figure medium interaction, one hand passing the broken watch to the other figure; faces indistinct, action clearly visible." },
  { id: "machine", mode: "OPTIONAL_OBJECT_LED", result: "A strange machine is activated and casts blue illumination across a basement room.", b: "Machine-dominant three-quarter view with blue light spreading across the basement; protagonist may be partial or off-center, not a centered standing silhouette." },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function queueEmpty() { for (let i = 0; i < 240; i += 1) { const q = await (await fetch(`${URL}/queue`)).json(); if (!(q.queue_running?.length || q.queue_pending?.length)) return true; await sleep(150); } return false; }
function workflow(prompt, seed, prefix) { return { "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "sdxl_lightning_4step.safetensors" } }, "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 1] } }, "3": { class_type: "CLIPTextEncode", inputs: { text: "text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality", clip: ["1", 1] } }, "4": { class_type: "EmptyLatentImage", inputs: { width: 1024, height: 576, batch_size: 1 } }, "5": { class_type: "KSampler", inputs: { model: ["1", 0], seed, steps: 4, cfg: 1, sampler_name: "euler", scheduler: "sgm_uniform", positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], denoise: 1 } }, "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } }, "7": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: prefix } } }; }
async function run(profile, scene, index) {
  if (!(await queueEmpty())) throw new Error("queue_not_empty");
  const seed = 730000 + index * 7919;
  const prefix = `protagonist_presence/${profile}/${String(index).padStart(2, "0")}_${scene.id}_${Date.now()}_${seed}`;
  const prompt = profile === "A_SOFT_LOCK"
    ? `WORLD: cinematic surreal realism, muted cool palette, restrained warm practical lighting. PROTAGONIST: same lone adult figure, slim silhouette, dark long coat, understated appearance. STYLE: atmospheric haze, realistic materials, 35mm cinematic framing. CURRENT RESULT STATE: ${scene.result} MUST SHOW: ${scene.result} ${STYLE}`
    : `WORLD: cinematic surreal realism, muted cool palette, restrained warm practical lighting. PROTAGONIST: same lone adult protagonist exists in the dream; visibility is gated by the result state. STYLE: atmospheric haze, realistic materials, 35mm cinematic framing. PRESENCE MODE: ${scene.mode}. COMPOSITION: ${scene.b} CURRENT RESULT STATE: ${scene.result} MUST SHOW: ${scene.result} ${STYLE}`;
  const started = performance.now();
  const accepted = await (await fetch(`${URL}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow(prompt, seed, prefix), client_id: `presence-${profile}-${seed}` }) })).json();
  if (!accepted.prompt_id) throw new Error(`rejected:${JSON.stringify(accepted)}`);
  let history;
  for (;;) { history = (await (await fetch(`${URL}/history/${accepted.prompt_id}`)).json())[accepted.prompt_id]; if (history?.status?.status_str === "error") throw new Error(`execution:${JSON.stringify(history.status.messages)}`); if (history?.status?.completed) break; await sleep(200); }
  const image = history.outputs?.["7"]?.images?.[0];
  const output = image ? path.join(OUTPUT_ROOT, String(image.subfolder || "").replace(/[\\/]+/g, path.sep), image.filename) : null;
  let bytes = null; if (output) { try { bytes = (await stat(output)).size; } catch {} }
  return { profile, scene: scene.id, mode: scene.mode, result: scene.result, gatedPrompt: profile === "B_GATED" ? scene.b : null, seed, promptId: accepted.prompt_id, output: image ? `${image.subfolder ? `${image.subfolder}/` : ""}${image.filename}` : null, outputPath: output, bytes, latencySeconds: (performance.now() - started) / 1000, success: Boolean(image) };
}

async function main() {
  await mkdir(ROOT, { recursive: true });
  if (!(await (await fetch(`${URL}/system_stats`)).ok)) throw new Error(`comfy_not_ready:${URL}`);
  const results = [];
  for (const profile of ["A_SOFT_LOCK", "B_GATED"]) for (let i = 0; i < scenes.length; i += 1) { const row = await run(profile, scenes[i], i + 1); results.push(row); console.log(`${results.length}/12 ${profile} ${scenes[i].id} ${row.latencySeconds.toFixed(2)}s`); }
  const report = { generatedAt: new Date().toISOString(), endpoint: URL, productionUntouched: true, settings: { checkpoint: "sdxl_lightning_4step.safetensors", width: 1024, height: 576, steps: 4, cfg: 1, sampler: "euler", scheduler: "sgm_uniform" }, scenes, results };
  await writeFile(path.join(ROOT, "results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ success: results.filter((x) => x.success).length, outputs: results.map((x) => ({ profile: x.profile, scene: x.scene, output: x.output, latencySeconds: x.latencySeconds })) }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

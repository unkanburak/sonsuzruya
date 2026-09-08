// Isolated single-stage last-frame -> AnimateDiff feasibility spike.
// Never imported by app/server.mjs; production IMAGE_MOTION remains untouched.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(".");
const COMFY = process.env.COMFY_URL || "http://127.0.0.1:8191";
const COMFY_ROOT = process.env.COMFY_ROOT || "D:\\InfiniteAILive\\ComfyUI_windows_portable\\ComfyUI";
const ENGINE_INPUT = process.env.ENGINE_INPUT || path.join(ROOT, "benchmark", "single-stage", "input");
const ENGINE_OUTPUT = process.env.ENGINE_OUTPUT || path.join(ROOT, "benchmark", "single-stage", "output");
const START_FRAME = process.env.START_FRAME || path.join(ROOT, "public", "initial.png");
const REPORT_JSON = path.join(ROOT, "benchmark", "single-stage-i2v-results.json");
const WIDTH = 384, HEIGHT = 224, FRAMES = 16, FPS = 8, STEPS = 2, CFG = 1, DENOISE = 0.55;
const CHECKPOINT = "DreamShaper_8_pruned.safetensors";
const MOTION = "animatediff_lightning_2step_comfyui.safetensors";
const NEGATIVE = "text, watermark, logo, low quality, blurry, deformed, extra limbs";
const transitions = [
  ["outside a red house", "The same character is now inside the red house in a dim wooden hallway."],
  ["inside a dim wooden hallway", "The same character is now standing in an underground basement beneath the house."],
  ["underground basement", "The same character is now standing beside a large glowing machine in the basement."],
  ["beside a glowing machine", "The same character is now facing the machine switched on, casting blue light."],
  ["machine room", "The same character is now standing in a room flooded with shallow reflective water."],
  ["flooded room", "The same character is now at the entrance of a submerged dark tunnel."],
  ["submerged tunnel entrance", "The same character is now standing on a misty stone bridge."],
  ["misty stone bridge", "The same character is now near a glowing light beneath the bridge."],
  ["light beneath the bridge", "The same character is now in front of a luminous portal in a red foggy field."],
  ["red foggy portal", "The same character is now beyond the portal in a strange alien landscape."],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function mkdirs() { await Promise.all([fs.mkdir(ENGINE_INPUT, { recursive: true }), fs.mkdir(ENGINE_OUTPUT, { recursive: true })]); }
async function json(url, options) { const r = await fetch(url, options); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = { raw: t }; } if (!r.ok) throw new Error(`${r.status} ${url}: ${JSON.stringify(b)}`); return b; }
async function queueEmpty() { const q = await json(`${COMFY}/queue`); return (q.queue_running?.length || 0) === 0 && (q.queue_pending?.length || 0) === 0; }
async function waitQueueEmpty(timeoutMs = 120000) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { if (await queueEmpty()) return true; await sleep(500); } return false; }
function workflow(prompt, inputName, prefix, seed) {
  return {
    "1": { class_type: "LoadImage", inputs: { image: inputName } },
    "2": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CHECKPOINT } },
    "3": { class_type: "VAEEncode", inputs: { pixels: ["1", 0], vae: ["2", 2] } },
    "4": { class_type: "RepeatLatentBatch", inputs: { samples: ["3", 0], amount: FRAMES } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["2", 1] } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: NEGATIVE, clip: ["2", 1] } },
    "7": { class_type: "ADE_AnimateDiffLoaderGen1", inputs: { model: ["2", 0], model_name: MOTION, beta_schedule: "sqrt_linear (AnimateDiff)" } },
    "8": { class_type: "KSampler", inputs: { model: ["7", 0], seed, steps: STEPS, cfg: CFG, sampler_name: "euler", scheduler: "sgm_uniform", positive: ["5", 0], negative: ["6", 0], latent_image: ["4", 0], denoise: DENOISE } },
    "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["2", 2] } },
    "10": { class_type: "VHS_VideoCombine", inputs: { images: ["9", 0], frame_rate: FPS, loop_count: 0, filename_prefix: prefix, format: "video/h264-mp4", pix_fmt: "yuv420p", crf: 19, save_metadata: true, pingpong: false, save_output: true } },
  };
}
async function copyInput(source, turn) { const name = `turn_${String(turn).padStart(2, "0")}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`; const dest = path.join(ENGINE_INPUT, name); await fs.copyFile(source, dest); const st = await fs.stat(dest); if (!st.size) throw new Error(`empty input ${dest}`); return { name, path: dest }; }
async function extractFinalFrame(videoPath, turn) { const out = path.join(ROOT, "benchmark", "single-stage", "frames", `turn_${String(turn).padStart(2, "0")}_final.png`); await fs.mkdir(path.dirname(out), { recursive: true }); await execFileAsync("ffmpeg", ["-y", "-sseof", "-0.5", "-i", videoPath, "-frames:v", "1", "-update", "1", out], { windowsHide: true, timeout: 30000 }); const st = await fs.stat(out); if (!st.size) throw new Error(`empty final frame ${out}`); return out; }
async function runTurn(inputPath, turn, prompt, state) {
  if (!(await waitQueueEmpty())) throw new Error("queue_not_empty_before_turn");
  const input = await copyInput(inputPath, turn);
  const id = crypto.randomUUID(); const prefix = `single_stage/turn_${String(turn).padStart(2, "0")}_${id}`; const seed = 100000 + turn * 7919 + Math.floor(Math.random() * 1000);
  const submittedAt = performance.now();
  const accepted = await json(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow(prompt, input.name, prefix, seed), client_id: `single-stage-${id}` }) });
  const promptId = accepted.prompt_id; if (!promptId) throw new Error(`missing_prompt_id:${JSON.stringify(accepted)}`);
  let item; const deadline = Date.now() + 120000;
  while (Date.now() < deadline) { const h = await json(`${COMFY}/history/${promptId}`); item = h[promptId]; if (item?.status?.completed || item?.status?.status_str === "error") break; await sleep(250); }
  if (!item?.status?.completed) throw new Error(`execution_failed_or_timeout:${JSON.stringify(item?.status || {})}`);
  const video = item.outputs?.["10"]?.gifs?.[0]; if (!video?.filename) throw new Error(`missing_video_output:${JSON.stringify(item.outputs || {})}`);
  const videoPath = path.join(ENGINE_OUTPUT, video.subfolder || "", video.filename); const videoStat = await fs.stat(videoPath); if (!videoStat.size) throw new Error(`empty_video:${videoPath}`);
  const finalFrame = await extractFinalFrame(videoPath, turn);
  const elapsed = (performance.now() - submittedAt) / 1000;
  const executed = item.execution_start_time ? Object.keys(item.outputs || {}) : [];
  return { turn, inputState: state, resultStatePrompt: prompt, inputFrame: inputPath, copiedInput: input.path, promptId, seed, videoPath, finalFrame, clientSeconds: elapsed, serverExecutionStart: item.execution_start_time || null, status: item.status, executedOutputNodes: executed, nextState: transitions[turn - 1]?.[1] || prompt };
}
async function main() {
  await mkdirs(); await fs.access(START_FRAME); const stats = await json(`${COMFY}/system_stats`); const results = []; let frame = START_FRAME; let state = transitions[0][0];
  for (let i = 0; i < transitions.length; i++) { const turn = i + 1; console.log(`turn ${turn}/10: ${state} -> ${transitions[i][1]}`); const r = await runTurn(frame, turn, transitions[i][1], state); results.push(r); frame = r.finalFrame; state = r.nextState; console.log(JSON.stringify({ turn, seconds: r.clientSeconds, video: r.videoPath, finalFrame: r.finalFrame })); }
  const times = results.map((r) => r.clientSeconds).sort((a, b) => a - b); const p50 = times[Math.floor(times.length / 2)] ?? null; const p95 = times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)] ?? null;
  const report = { startedAt: new Date().toISOString(), engine: "AnimateDiff-Lightning approximate image-conditioned motion", trueI2V: false, sdxlUsed: false, settings: { width: WIDTH, height: HEIGHT, frames: FRAMES, fps: FPS, steps: STEPS, cfg: CFG, sampler: "euler", scheduler: "sgm_uniform", checkpoint: CHECKPOINT, motion: MOTION, denoise: DENOISE }, comfySystemStats: stats, startFrame: START_FRAME, results, latency: { cold: results[0]?.clientSeconds ?? null, warmSamples: results.slice(1).map((r) => r.clientSeconds), warmP50: p50, warmP95: p95 }, note: "Semantic and continuity scores require human review of the generated final frames; no production code was changed." };
  await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ report: REPORT_JSON, cold: report.latency.cold, warmP50: p50, warmP95: p95, outputs: results.length }, null, 2));
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

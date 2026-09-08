// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
// İzole AnimateDiff-Lightning ComfyUI benchmarkı; ana uygulamaya bağlı değildir.
import { writeFile } from "node:fs/promises";
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8191";
const prompts = [
  "A character is now sitting inside a mysterious red car, cinematic stylized motion.",
  "A character is now standing at the entrance of a dark tunnel, foggy atmospheric motion.",
  "A character is now in front of a glowing portal in a red foggy field, surreal stylized motion."
];
const settings = { width: 384, height: 224, frames: 16, fps: 8, steps: 2, cfg: 1, sampler: "euler", scheduler: "sgm_uniform", checkpoint: "DreamShaper_8_pruned.safetensors", motion: "animatediff_lightning_2step_comfyui.safetensors" };
function workflow(prompt, label) { return {
  "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: settings.checkpoint } },
  "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
  "7": { class_type: "CLIPTextEncode", inputs: { text: "text, watermark, logo, low quality, blurry, deformed", clip: ["4", 1] } },
  "5": { class_type: "EmptyLatentImage", inputs: { width: settings.width, height: settings.height, batch_size: settings.frames } },
  "10": { class_type: "ADE_AnimateDiffLoaderGen1", inputs: { model: ["4", 0], model_name: settings.motion, beta_schedule: "sqrt_linear (AnimateDiff)" } },
  "3": { class_type: "KSampler", inputs: { model: ["10", 0], seed: 314159, steps: settings.steps, cfg: settings.cfg, sampler_name: settings.sampler, scheduler: settings.scheduler, positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0], denoise: 1 } },
  "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
  "11": { class_type: "VHS_VideoCombine", inputs: { images: ["8", 0], frame_rate: settings.fps, loop_count: 0, filename_prefix: `benchmark/animatediff_${label}`, format: "video/h264-mp4", pix_fmt: "yuv420p", crf: 19, save_metadata: true, pingpong: false, save_output: true } }
}; }
async function run(prompt, label) { const t = performance.now(); const response = await fetch(`${COMFY_URL}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow(prompt, label), client_id: "animatediff-lightning-benchmark" }) }); const body = await response.json(); if (!body.prompt_id) throw new Error(JSON.stringify(body)); for (;;) { const history = await (await fetch(`${COMFY_URL}/history/${body.prompt_id}`)).json(); const item = history[body.prompt_id]; if (item?.status?.completed || item?.status?.status_str === "error") return { label, prompt, seconds: (performance.now() - t) / 1000, success: item.status.completed === true, history: item }; await new Promise((r) => setTimeout(r, 300)); } }
async function main() { const results = []; for (let i = 0; i < prompts.length; i += 1) { console.log(`run ${i + 1}/3`); results.push(await run(prompts[i], `run${i + 1}`)); console.log(results.at(-1).seconds, results.at(-1).success); } const times = results.filter((r) => r.success).map((r) => r.seconds).sort((a, b) => a - b); const report = { startedAt: new Date().toISOString(), settings, results, summary: { success: results.filter((r) => r.success).length, warmP50: times[Math.floor(times.length / 2)] ?? null, warmP95: times.at(-1) ?? null, note: "T2V smoke only. AnimateDiff-Lightning official Comfy workflow is T2V; no native last-frame I2V node was assumed." } }; await writeFile("benchmark/animatediff-lightning-results.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify({ summary: report.summary, results: results.map(({ label, seconds, success }) => ({ label, seconds, success })) }, null, 2)); }
main().catch((e) => { console.error(e); process.exitCode = 1; });

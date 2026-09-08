// Isolated image-conditioned motion smoke test; never used by the main app.
import { writeFile } from "node:fs/promises";
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8191";
const inputName = "sdxl_result_state_for_animatediff.png";
const prompts = [
  "The character is now sitting inside a mysterious red car, clear stylized motion.",
  "The character is now standing at the entrance of a dark tunnel, foggy motion.",
  "The character is now in front of a glowing portal in a red foggy field, surreal motion.",
  "The character is now sitting inside a mysterious red car, clear stylized motion."
];
const settings = { width: 384, height: 224, frames: 16, fps: 8, steps: 2, cfg: 1, denoise: 0.55, sampler: "euler", scheduler: "sgm_uniform", checkpoint: "DreamShaper_8_pruned.safetensors", motion: "animatediff_lightning_2step_comfyui.safetensors" };
function workflow(prompt, label) { return {
  "1": { class_type: "LoadImage", inputs: { image: inputName } },
  "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: settings.checkpoint } },
  "2": { class_type: "VAEEncode", inputs: { pixels: ["1", 0], vae: ["4", 2] } },
  "5": { class_type: "RepeatLatentBatch", inputs: { samples: ["2", 0], amount: settings.frames } },
  "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
  "7": { class_type: "CLIPTextEncode", inputs: { text: "text, watermark, logo, low quality, blurry, deformed", clip: ["4", 1] } },
  "10": { class_type: "ADE_AnimateDiffLoaderGen1", inputs: { model: ["4", 0], model_name: settings.motion, beta_schedule: "sqrt_linear (AnimateDiff)" } },
  "3": { class_type: "KSampler", inputs: { model: ["10", 0], seed: 271828, steps: settings.steps, cfg: settings.cfg, sampler_name: settings.sampler, scheduler: settings.scheduler, positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0], denoise: settings.denoise } },
  "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
  "11": { class_type: "VHS_VideoCombine", inputs: { images: ["8", 0], frame_rate: settings.fps, loop_count: 0, filename_prefix: `benchmark/animatediff_i2v_${label}`, format: "video/h264-mp4", pix_fmt: "yuv420p", crf: 19, save_metadata: true, pingpong: false, save_output: true } }
}; }
async function run(prompt, label) { const t = performance.now(); const response = await fetch(`${COMFY_URL}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow(prompt, label), client_id: "animatediff-lightning-i2v" }) }); const body = await response.json(); if (!body.prompt_id) throw new Error(JSON.stringify(body)); for (;;) { if (performance.now() - t >= 45000) return { label, prompt, seconds: (performance.now() - t) / 1000, success: false, error: "timeout_45s", promptId: body.prompt_id }; const history = await (await fetch(`${COMFY_URL}/history/${body.prompt_id}`)).json(); const item = history[body.prompt_id]; if (item?.status?.completed || item?.status?.status_str === "error") return { label, prompt, seconds: (performance.now() - t) / 1000, success: item.status.completed === true, history: item, promptId: body.prompt_id }; await new Promise((r) => setTimeout(r, 300)); } }
async function main() { const results = []; for (let i = 0; i < prompts.length; i += 1) results.push(await run(prompts[i], `run${i + 1}`)); const times = results.filter((r) => r.success).map((r) => r.seconds).sort((a, b) => a - b); const report = { sourceImage: inputName, settings, results, summary: { success: results.filter((r) => r.success).length, warmP50: times[Math.floor(times.length / 2)] ?? null, warmP95: times.at(-1) ?? null, limitation: "Approximate image-conditioned motion: SDXL image latent is repeated across 16 frames. AnimateDiff-Lightning itself has no native first-frame I2V model." } }; await writeFile(process.env.RESULT_FILE || "animatediff-lightning-i2v-results-overnight.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify({ summary: report.summary, results: results.map(({ label, seconds, success }) => ({ label, seconds, success })) }, null, 2)); }
main().catch((e) => { console.error(e); process.exitCode = 1; });

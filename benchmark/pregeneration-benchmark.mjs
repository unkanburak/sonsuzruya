// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
// V2 prototipi: iki aday dalı oy kilidinden önce hazırlamanın gerçek oranını ölçer.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const COMFY_ROOT = process.env.COMFY_ROOT || "D:\\InfiniteAILive\\ComfyUI_windows_portable\\ComfyUI";
const VOTE_SECONDS = 6;
const ROUNDS = Number(process.env.ROUNDS || 10);
const CANDIDATE_TIMEOUT_MS = Number(process.env.CANDIDATE_TIMEOUT_MS || 20_000);
const IMAGE_PROFILE = {
  checkpoint: "sdxl_lightning_4step.safetensors",
  width: 768,
  height: 448,
  steps: 4,
  cfg: 1,
};
const VIDEO_PROFILE = {
  checkpoint: "ltxv-2b-0.9.6-distilled-04-25.safetensors",
  width: 384,
  height: 224,
  frames: Number(process.env.FRAMES || 25),
  steps: 2,
  fps: 24,
};
const OUTCOMES = [
  ["A glowing portal appears", "The corridor fills with light"],
  ["Floating orbs appear", "A misty bridge appears"],
  ["A glowing tree grows", "A doorway opens into bright light"],
  ["The sky turns crimson", "The room fills with water"],
  ["The floor becomes a giant mirror", "A glowing portal appears"],
  ["The corridor fills with light", "Floating orbs appear"],
  ["A misty bridge appears", "The sky turns crimson"],
  ["A doorway opens into bright light", "The room fills with water"],
  ["A glowing tree grows", "The floor becomes a giant mirror"],
  ["A glowing portal appears", "A misty bridge appears"],
];

function safeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function imageWorkflow(outcome, label, seed) {
  const p = IMAGE_PROFILE;
  const positive = `A cinematic surreal scene showing this exact outcome: ${outcome}. Make the selected outcome visually obvious, literal and central. Dreamlike bizarre environment, wide shot, vivid lighting, coherent composition, no text, no logo. An anonymous faceless fictional person may appear only if useful.`;
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: p.checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: positive, clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: "text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality", clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: p.width, height: p.height, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { model: ["1", 0], seed, steps: p.steps, cfg: p.cfg, sampler_name: "euler", scheduler: "sgm_uniform", positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], denoise: 1 } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: `benchmark/pregeneration/${label}_${safeSlug(outcome)}` } },
  };
}

function videoWorkflow(outcome, inputImage, label, seed) {
  const p = VIDEO_PROFILE;
  const positive = `A surreal cinematic scene. The exact outcome is ${outcome}. Gentle continuous motion: the environment subtly moves, light and fog drift, and the anonymous faceless figure moves naturally if present. Keep the main outcome visible, no text, no logo.`;
  return {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: "t5xxl_fp8_e4m3fn.safetensors", type: "ltxv", device: "cpu" } },
    "2": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: p.checkpoint } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: positive, clip: ["1", 0] } },
    "4": { class_type: "CLIPTextEncode", inputs: { text: "static, frozen, text, watermark, low quality, nsfw, gore, weapon", clip: ["1", 0] } },
    "5": { class_type: "LoadImage", inputs: { image: inputImage } },
    "13": { class_type: "ImageFromBatch", inputs: { image: ["5", 0], batch_index: 0, length: 1 } },
    "6": { class_type: "LTXVImgToVideo", inputs: { positive: ["3", 0], negative: ["4", 0], vae: ["2", 2], image: ["13", 0], width: p.width, height: p.height, length: p.frames, batch_size: 1, strength: 0.15 } },
    "7": { class_type: "LTXVConditioning", inputs: { positive: ["6", 0], negative: ["6", 1], frame_rate: p.fps } },
    "8": { class_type: "LTXVScheduler", inputs: { steps: p.steps, max_shift: 2.05, base_shift: 0.95, stretch: true, terminal: 0.1, latent: ["6", 2] } },
    "9": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "10": { class_type: "SamplerCustom", inputs: { model: ["2", 0], add_noise: true, noise_seed: seed, cfg: 1, positive: ["7", 0], negative: ["7", 1], sampler: ["9", 0], sigmas: ["8", 0], latent_image: ["6", 2] } },
    "11": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["2", 2] } },
    "12": { class_type: "SaveAnimatedWEBP", inputs: { images: ["11", 0], filename_prefix: `benchmark/pregeneration/${label}_video`, fps: p.fps, lossless: false, quality: 65, method: "fastest" } },
  };
}

async function submit(workflow) {
  const response = await fetch(`${COMFY_URL}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: "pregeneration-benchmark" }) });
  const body = await response.json();
  if (!response.ok || body.error || !body.prompt_id) throw new Error(`workflow_rejected:${JSON.stringify(body)}`);
  return body.prompt_id;
}

async function wait(promptId, outputNode, timeoutMs = CANDIDATE_TIMEOUT_MS) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const item = (await (await fetch(`${COMFY_URL}/history/${promptId}`)).json())[promptId];
    if (item?.status?.status_str === "error" || item?.status?.messages?.some((entry) => entry?.[0] === "execution_error")) throw new Error("execution_error");
    if (item?.status?.completed) {
      const output = item.outputs?.[outputNode]?.images?.[0];
      if (!output?.filename) throw new Error("missing_output");
      return { seconds: (performance.now() - started) / 1000, output };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("timeout");
}

async function uploadInput(image) {
  const name = `pregeneration_${image.label}.png`;
  const form = new FormData();
  form.append("image", new Blob([image.bytes], { type: "image/png" }), name);
  form.append("overwrite", "true");
  const response = await fetch(`${COMFY_URL}/upload/image`, { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok || !body.name) throw new Error(`upload_rejected:${JSON.stringify(body)}`);
  return body.subfolder ? `${body.subfolder}/${body.name}` : body.name;
}

async function makeCandidate(outcome, label, seed, roundStarted) {
  try {
    const imagePrompt = await submit(imageWorkflow(outcome, label, seed));
    const image = await wait(imagePrompt, "7");
    const viewUrl = `${COMFY_URL}/view?${new URLSearchParams({ filename: image.output.filename, subfolder: image.output.subfolder || "", type: image.output.type || "output" })}`;
    const inputName = await uploadInput({
      label,
      bytes: new Uint8Array(await (await fetch(viewUrl)).arrayBuffer()),
    });
    const videoPrompt = await submit(videoWorkflow(outcome, inputName, label, seed + 1000));
    const video = await wait(videoPrompt, "12");
    return { outcome, imageSeconds: image.seconds, videoSeconds: video.seconds, readyAtSeconds: (performance.now() - roundStarted) / 1000, ready: true, videoOutput: video.output };
  } catch (error) {
    try {
      await fetch(`${COMFY_URL}/interrupt`, { method: "POST" });
      await fetch(`${COMFY_URL}/queue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clear: true }) });
    } catch {}
    return { outcome, readyAtSeconds: (performance.now() - roundStarted) / 1000, ready: false, error: String(error?.message || error) };
  }
}

async function main() {
  if (!(await (await fetch(`${COMFY_URL}/system_stats`)).ok)) throw new Error("ComfyUI is not ready");
  const report = { principle: "Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.", startedAt: new Date().toISOString(), voteSeconds: VOTE_SECONDS, rounds: [] };
  for (let index = 0; index < ROUNDS; index += 1) {
    const roundStarted = performance.now();
    const [outcome1, outcome2] = OUTCOMES[index];
    console.log(`[round ${index + 1}/${ROUNDS}] starting two candidates`);
    const candidates = await Promise.all([
      makeCandidate(outcome1, `r${index + 1}_a`, 910000 + index * 2, roundStarted),
      makeCandidate(outcome2, `r${index + 1}_b`, 910001 + index * 2, roundStarted),
    ]);
    const elapsed = (performance.now() - roundStarted) / 1000;
    const bothReadyByLock = candidates.every((candidate) => candidate.ready && candidate.readyAtSeconds <= VOTE_SECONDS);
    const result = { round: index + 1, candidates, elapsedSeconds: elapsed, voteLockSeconds: VOTE_SECONDS, bothReadyByLock };
    report.rounds.push(result);
    await writeFile("benchmark/pregeneration-benchmark-results.json", JSON.stringify(report, null, 2));
    console.log(result);
  }
  const passed = report.rounds.filter((round) => round.bothReadyByLock).length;
  report.finishedAt = new Date().toISOString();
  report.readyRate = passed / ROUNDS;
  report.decision = report.readyRate >= 0.9 ? "CONTINUE_V2" : report.readyRate >= 0.7 ? "BORDERLINE_REDUCE_PROFILE" : "STAY_IMAGE_MOTION";
  await writeFile("benchmark/pregeneration-benchmark-results.json", JSON.stringify(report, null, 2));
  console.log("FINAL", { passed, total: ROUNDS, readyRate: report.readyRate, decision: report.decision });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

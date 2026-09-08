// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const REPORT_PATH = "benchmark/image-model-benchmark-results.json";
const TIMEOUT_MS = 180_000;

const challengeActions = [
  "Open the door",
  "Climb the staircase",
  "Open the mysterious box",
  "Enter the mirror",
  "Jump into the portal",
  "Turn the floor into liquid",
  "Look behind the curtain",
  "Follow the strange light",
  "Enter the tunnel",
  "Fold the sky",
];
const reliableActions = [
  "A glowing portal appears",
  "The corridor fills with light",
  "A giant shadow appears",
  "Floating orbs appear",
  "A misty bridge appears",
  "A glowing tree grows",
  "A tunnel opens into darkness",
  "A doorway opens into bright light",
  "The sky turns crimson",
  "The room fills with water",
  "The walls begin to melt",
  "The floor becomes a giant mirror",
];
const actions = process.env.ACTION_SET === "reliable" ? reliableActions : challengeActions;

const allProfiles = [
  {
    name: "sd15_current",
    checkpoint: "v1-5-pruned-emaonly-fp16.safetensors",
    width: 512,
    height: 288,
    steps: 16,
    cfg: 7,
    sampler: "dpmpp_2m",
    scheduler: "karras",
  },
  {
    name: "sdxl_lightning_4step",
    checkpoint: "sdxl_lightning_4step.safetensors",
    width: 768,
    height: 448,
    steps: 4,
    cfg: 1,
    sampler: "euler",
    scheduler: "sgm_uniform",
  },
];
const profiles = process.env.PROFILE
  ? allProfiles.filter((profile) => profile.name === process.env.PROFILE)
  : allProfiles;

function safeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function positivePrompt(action) {
  return `A cinematic surreal scene showing this exact outcome: ${action}. Make the selected outcome visually obvious, literal and central. Dreamlike bizarre environment, wide shot, vivid lighting, coherent composition, no text, no logo. An anonymous faceless fictional person may appear only if useful.`;
}

function workflow(profile, action, index, seed) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: profile.checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: positivePrompt(action), clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: "text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality", clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: profile.width, height: profile.height, batch_size: 1 } },
    "5": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0], seed, steps: profile.steps, cfg: profile.cfg,
        sampler_name: profile.sampler, scheduler: profile.scheduler,
        positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], denoise: 1,
      },
    },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": {
      class_type: "SaveImage",
      inputs: { images: ["6", 0], filename_prefix: `benchmark/image_models/${profile.name}_${String(index).padStart(2, "0")}_${safeSlug(action)}` },
    },
  };
}

async function gpuMemoryMiB() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=memory.used", "--format=csv,noheader,nounits"]);
    return Number.parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function submit(prompt) {
  const response = await fetch(`${COMFY_URL}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, client_id: "image-model-benchmark" }),
  });
  const body = await response.json();
  if (!response.ok || body.error || !body.prompt_id) throw new Error(`workflow_rejected:${JSON.stringify(body)}`);
  return body.prompt_id;
}

async function waitForCompletion(promptId) {
  const startedAt = performance.now();
  let peakVramMiB = 0;
  while (performance.now() - startedAt < TIMEOUT_MS) {
    peakVramMiB = Math.max(peakVramMiB, await gpuMemoryMiB());
    const response = await fetch(`${COMFY_URL}/history/${promptId}`);
    const history = await response.json();
    const item = history[promptId];
    if (item) {
      const failed = item.status?.status_str === "error"
        || item.status?.messages?.some((entry) => entry?.[0] === "execution_error");
      if (failed) throw new Error(`execution_error:${JSON.stringify(item.status?.messages || [])}`);
      if (item.status?.completed) {
        const image = item.outputs?.["7"]?.images?.[0];
        return {
          generationTime: (performance.now() - startedAt) / 1000,
          peakVramMiB,
          output: image ? `${image.subfolder ? `${image.subfolder}/` : ""}${image.filename}` : null,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("generation_timeout");
}

async function run(profile, action, index, seed) {
  const startedAt = new Date().toISOString();
  try {
    const promptId = await submit(workflow(profile, action, index, seed));
    const result = await waitForCompletion(promptId);
    return { action, seed, startedAt, promptId, success: true, ...result, error: null };
  } catch (error) {
    return { action, seed, startedAt, success: false, generationTime: null, peakVramMiB: await gpuMemoryMiB(), output: null, error: String(error?.message || error) };
  }
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(profile, warmup, runs) {
  const successful = runs.filter((entry) => entry.success);
  const times = successful.map((entry) => entry.generationTime).sort((a, b) => a - b);
  return {
    profile,
    warmup,
    runs,
    successfulRuns: successful.length,
    failedRuns: runs.length - successful.length,
    p50Seconds: percentile(times, 0.5),
    g95Seconds: percentile(times, 0.95),
    maxSeconds: times.at(-1) ?? null,
    peakVramMiB: Math.max(0, warmup.peakVramMiB || 0, ...runs.map((entry) => entry.peakVramMiB || 0)),
  };
}

async function main() {
  const health = await fetch(`${COMFY_URL}/system_stats`);
  if (!health.ok) throw new Error(`ComfyUI is not ready at ${COMFY_URL}`);

  const report = {
    principle: "Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.",
    startedAt: new Date().toISOString(),
    comparison: "Same ten actions and deterministic seeds; SD1.5 current profile versus SDXL-Lightning 4-step.",
    profiles: [],
  };

  for (const profile of profiles) {
    console.log(`\n[${profile.name}] warm-up`);
    const warmup = await run(profile, actions[0], 0, 730000);
    console.log(warmup);
    const runs = [];
    if (warmup.success) {
      for (let index = 0; index < actions.length; index += 1) {
        console.log(`[${profile.name}] ${index + 1}/${actions.length}: ${actions[index]}`);
        const result = await run(profile, actions[index], index + 1, 730001 + index);
        runs.push(result);
        console.log(result);
        if (!result.success && /out of memory|allocation/i.test(result.error || "")) break;
      }
    }
    const summary = summarize(profile, warmup, runs);
    report.profiles.push(summary);
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log("summary", summary);
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

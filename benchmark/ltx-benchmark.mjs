// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const VOTE_SECONDS = 6;
const SAFETY_MARGIN_SECONDS = 2;
const MIN_PLAYBACK_RATE = 0.6;
const RUNS_PER_PROFILE = 5;

const profiles = [
  { name: "turbo_384x224_81f_2s", width: 384, height: 224, frames: 81, steps: 2, fps: 24 },
  { name: "long_384x224_121f_2s", width: 384, height: 224, frames: 121, steps: 2, fps: 24 },
  { name: "wide_512x288_81f_2s", width: 512, height: 288, frames: 81, steps: 2, fps: 24 },
];

function workflow(profile, runLabel) {
  return {
    "1": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "t5xxl_fp8_e4m3fn.safetensors",
        type: "ltxv",
        device: "cpu",
      },
    },
    "2": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "ltxv-2b-0.9.6-distilled-04-25.safetensors" },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "A red fox walks through deep snow as the environment slowly transforms into a surreal dream, cinematic continuous movement, strange shifting light, dynamic camera.",
        clip: ["1", 0],
      },
    },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: { text: "static, frozen, text, watermark, low quality", clip: ["1", 0] },
    },
    "5": { class_type: "LoadImage", inputs: { image: "benchmark.webp" } },
    "13": {
      class_type: "ImageFromBatch",
      inputs: { image: ["5", 0], batch_index: 0, length: 1 },
    },
    "6": {
      class_type: "LTXVImgToVideo",
      inputs: {
        positive: ["3", 0],
        negative: ["4", 0],
        vae: ["2", 2],
        image: ["13", 0],
        width: profile.width,
        height: profile.height,
        length: profile.frames,
        batch_size: 1,
        strength: 0.15,
      },
    },
    "7": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["6", 0], negative: ["6", 1], frame_rate: profile.fps },
    },
    "8": {
      class_type: "LTXVScheduler",
      inputs: {
        steps: profile.steps,
        max_shift: 2.05,
        base_shift: 0.95,
        stretch: true,
        terminal: 0.1,
        latent: ["6", 2],
      },
    },
    "9": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "10": {
      class_type: "SamplerCustom",
      inputs: {
        model: ["2", 0],
        add_noise: true,
        noise_seed: Math.floor(Math.random() * 2_000_000_000),
        cfg: 1,
        positive: ["7", 0],
        negative: ["7", 1],
        sampler: ["9", 0],
        sigmas: ["8", 0],
        latent_image: ["6", 2],
      },
    },
    "11": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["2", 2] } },
    "12": {
      class_type: "SaveAnimatedWEBP",
      inputs: {
        images: ["11", 0],
        filename_prefix: `benchmark/${runLabel}`,
        fps: profile.fps,
        lossless: false,
        quality: 65,
        method: "fastest",
      },
    },
  };
}

async function gpuMemoryMiB() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=memory.used",
      "--format=csv,noheader,nounits",
    ]);
    return Number.parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function submit(prompt) {
  const response = await fetch(`${COMFY_URL}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, client_id: "ltx-mvp-benchmark" }),
  });
  const body = await response.json();
  if (!response.ok || body.error || !body.prompt_id) {
    throw new Error(`Workflow rejected: ${JSON.stringify(body)}`);
  }
  return body.prompt_id;
}

async function waitForCompletion(promptId) {
  const startedAt = performance.now();
  let peakVramMiB = 0;
  while (true) {
    peakVramMiB = Math.max(peakVramMiB, await gpuMemoryMiB());
    const response = await fetch(`${COMFY_URL}/history/${promptId}`);
    const history = await response.json();
    const item = history[promptId];
    if (item) {
      const status = item.status || {};
      const completed = status.completed === true;
      const failed = Array.isArray(status.messages)
        && status.messages.some((entry) => entry?.[0] === "execution_error");
      if (completed || failed) {
        const generationTime = (performance.now() - startedAt) / 1000;
        return { generationTime, peakVramMiB, success: completed && !failed, status };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function runOnce(profile, label) {
  const started = new Date().toISOString();
  try {
    const promptId = await submit(workflow(profile, label));
    const result = await waitForCompletion(promptId);
    return { ...result, started, promptId, error: null };
  } catch (error) {
    return {
      generationTime: null,
      peakVramMiB: await gpuMemoryMiB(),
      success: false,
      started,
      promptId: null,
      error: String(error?.message || error),
    };
  }
}

function summarize(profile, runs) {
  const successful = runs.filter((run) => run.success && Number.isFinite(run.generationTime));
  const generationTimes = successful.map((run) => run.generationTime).sort((a, b) => a - b);
  const g95 = generationTimes.length ? generationTimes.at(-1) : null;
  const rawVideoDuration = profile.frames / profile.fps;
  const maxEffectivePlayback = rawVideoDuration / MIN_PLAYBACK_RATE;
  const requiredPlayback = g95 == null ? null : VOTE_SECONDS + g95 + SAFETY_MARGIN_SECONDS;
  return {
    profile,
    runs,
    successfulRuns: successful.length,
    g95,
    rawVideoDuration,
    maxEffectivePlayback,
    requiredPlayback,
    requiredPlaybackRate: requiredPlayback ? rawVideoDuration / requiredPlayback : null,
    feasible: requiredPlayback != null && maxEffectivePlayback >= requiredPlayback,
    peakVramMiB: Math.max(0, ...runs.map((run) => run.peakVramMiB || 0)),
  };
}

async function main() {
  const health = await fetch(`${COMFY_URL}/system_stats`);
  if (!health.ok) throw new Error(`ComfyUI is not ready at ${COMFY_URL}`);

  const report = {
    principle: "Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.",
    startedAt: new Date().toISOString(),
    settings: { VOTE_SECONDS, SAFETY_MARGIN_SECONDS, MIN_PLAYBACK_RATE, RUNS_PER_PROFILE },
    profiles: [],
  };

  for (const profile of profiles) {
    console.log(`\n[${profile.name}] warm-up`);
    const warmup = await runOnce(profile, `${profile.name}_warmup`);
    console.log(warmup);

    const runs = [];
    if (warmup.success) {
      for (let run = 1; run <= RUNS_PER_PROFILE; run += 1) {
        console.log(`[${profile.name}] measured run ${run}/${RUNS_PER_PROFILE}`);
        const result = await runOnce(profile, `${profile.name}_run${run}`);
        runs.push(result);
        console.log(result);
        if (!result.success) break;
      }
    } else {
      runs.push(warmup);
    }

    const summary = summarize(profile, runs);
    report.profiles.push(summary);
    await writeFile("benchmark/ltx-benchmark-results.json", JSON.stringify(report, null, 2));
    console.log("summary", summary);
  }

  const feasible = report.profiles.filter((entry) => entry.feasible);
  report.finishedAt = new Date().toISOString();
  report.decision = feasible.length
    ? { engine: "LTX_VIDEO", turbo: feasible[0].profile.name, normal: feasible.at(-1).profile.name }
    : { engine: "IMAGE_MOTION", reason: "No LTX profile met the playback feasibility condition." };

  await writeFile("benchmark/ltx-benchmark-results.json", JSON.stringify(report, null, 2));
  console.log("\nFINAL DECISION", report.decision);
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

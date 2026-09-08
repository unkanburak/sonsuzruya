// Controlled SDXL-Lightning 4-step vs matching 8-step benchmark.
import { readFile, writeFile } from "node:fs/promises";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";

const config = JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
const prompts = [
  "The character is now standing in a dim room beside an old door.",
  "The character is now walking through a long corridor with a brass lantern.",
  "The character is now standing on a wet empty street at night.",
  "The character is now sitting inside a mysterious car in the rain.",
  "The character is now inside a dark tunnel with a distant light.",
  "The character is now standing on a misty stone bridge.",
  "The character is now beneath the bridge near a large glowing light.",
  "The character is now inside a strange luminous world beyond a portal.",
  "The character is now standing in a foggy forest beside a glowing tree.",
  "The character is now looking over a floating city beneath a crimson sky.",
];

async function run(name, checkpoint, steps, width, height) {
  const profile = { ...config.imageProfile, checkpoint, steps, width, height, continuityMode: "TEXT_ANCHOR" };
  const engine = new ComfyImageEngine({ comfyUrl: config.comfyUrl, comfyRoot: config.comfyRoot, profile, initialInput: config.initialInput, resetInterval: 1, timeoutMs: config.generationTimeoutMs });
  const rows = [];
  for (let i = 0; i < prompts.length; i += 1) {
    const started = performance.now();
    try {
      const result = await engine.generate({ prompt: `A cinematic surreal scene. ${prompts[i]} Visually clear central subject, atmospheric lighting, no text, no logo.`, sceneNumber: 9500 + (name === "B_QUALITY" ? 100 : 0) + i, seed: 12000 + i });
      rows.push({ round: i + 1, prompt: prompts[i], success: true, generationTime: result.generationTime, media: result.media, elapsed: (performance.now() - started) / 1000 });
    } catch (error) {
      rows.push({ round: i + 1, prompt: prompts[i], success: false, error: String(error?.message || error) });
    }
  }
  const times = rows.filter((row) => row.success).map((row) => row.generationTime).sort((a, b) => a - b);
  return { name, checkpoint, width, height, steps, cfg: profile.cfg, sampler: profile.sampler, scheduler: profile.scheduler, rows, successCount: times.length, generationTimeP50: times.length ? times[Math.floor(times.length / 2)] : null, generationTimeP95: times.length ? times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)] : null, peakVRAM: "not exposed by Comfy history" };
}

const results = [
  await run("A_BASELINE", "sdxl_lightning_4step.safetensors", 4, config.imageProfile.width, config.imageProfile.height),
  await run("B_QUALITY", "sdxl_lightning_8step.safetensors", 8, config.imageProfile.width, config.imageProfile.height),
];
await writeFile(new URL("./sdxl-quality-ab-results.json", import.meta.url), JSON.stringify({ createdAt: new Date().toISOString(), prompts, results }, null, 2));
console.log(JSON.stringify(results, null, 2));

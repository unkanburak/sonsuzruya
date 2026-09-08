// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
// Kontrollü deneme: text->video ilk parça, ardından son kare + text->video devamı.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8188";
const COMFY_ROOT = process.env.COMFY_ROOT || "D:\\InfiniteAILive\\ComfyUI_windows_portable\\ComfyUI";
const WIDTH = 384;
const HEIGHT = 224;
const FRAMES = 81;
const FPS = 24;
const STEPS = 2;
const SEED = 424242;

function common(prompt, latentNode, conditioningNode = "6", latentIndex = 2) {
  return {
    "1": { class_type: "CLIPLoader", inputs: { clip_name: "t5xxl_fp8_e4m3fn.safetensors", type: "ltxv", device: "cpu" } },
    "2": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "ltxv-2b-0.9.6-distilled-04-25.safetensors" } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 0] } },
    "4": { class_type: "CLIPTextEncode", inputs: { text: "static, frozen, text, watermark, low quality", clip: ["1", 0] } },
    "8": { class_type: "LTXVScheduler", inputs: { steps: STEPS, max_shift: 2.05, base_shift: 0.95, stretch: true, terminal: 0.1, latent: [latentNode, latentIndex] } },
    "9": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "10": { class_type: "SamplerCustom", inputs: { model: ["2", 0], add_noise: true, noise_seed: SEED, cfg: 1, positive: [conditioningNode, 0], negative: [conditioningNode, 1], sampler: ["9", 0], sigmas: ["8", 0], latent_image: [latentNode, latentIndex] } },
    "11": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["2", 2] } },
  };
}

function textToVideo(prompt, label) {
  return { ...common(prompt, "5", "6", 0),
    "5": { class_type: "EmptyLTXVLatentVideo", inputs: { width: WIDTH, height: HEIGHT, length: FRAMES, batch_size: 1 } },
    "6": { class_type: "LTXVConditioning", inputs: { positive: ["3", 0], negative: ["4", 0], frame_rate: FPS } },
    "12": { class_type: "SaveAnimatedWEBP", inputs: { images: ["11", 0], filename_prefix: `benchmark/${label}`, fps: FPS, lossless: false, quality: 65, method: "fastest" } },
  };
}

function imageToVideo(prompt, imageName, label) {
  return { ...common(prompt, "6", "7"),
    "5": { class_type: "LoadImage", inputs: { image: imageName } },
    "6": { class_type: "LTXVImgToVideo", inputs: { positive: ["3", 0], negative: ["4", 0], vae: ["2", 2], image: ["5", 0], width: WIDTH, height: HEIGHT, length: FRAMES, batch_size: 1, strength: 0.15 } },
    "7": { class_type: "LTXVConditioning", inputs: { positive: ["6", 0], negative: ["6", 1], frame_rate: FPS } },
    "12": { class_type: "SaveAnimatedWEBP", inputs: { images: ["11", 0], filename_prefix: `benchmark/${label}`, fps: FPS, lossless: false, quality: 65, method: "fastest" } },
  };
}

async function submit(prompt) {
  const response = await fetch(`${COMFY_URL}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, client_id: "ltx-text-video-test" }) });
  const body = await response.json();
  if (!response.ok || !body.prompt_id) throw new Error(JSON.stringify(body));
  return body.prompt_id;
}

async function wait(id) {
  const started = performance.now();
  for (;;) {
    const history = await (await fetch(`${COMFY_URL}/history/${id}`)).json();
    const item = history[id];
    if (item) {
      const failed = item.status?.messages?.some((m) => m?.[0] === "execution_error");
      if (item.status?.completed || failed) return { seconds: (performance.now() - started) / 1000, success: item.status?.completed && !failed, history: item };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function main() {
  const started = new Date().toISOString();
  const first = await wait(await submit(textToVideo("A lone character walks out of a dim house into a rainy street, cinematic surreal continuous movement.", "text_video_start")));
  const output = first.history?.outputs || {};
  const files = Object.values(output).flatMap((o) => o?.gifs || o?.images || []);
  const video = files.find((f) => /text_video_start/i.test(f.filename));
  if (!video) throw new Error(`First video output not found: ${JSON.stringify(files)}`);
  const inputDir = path.join(COMFY_ROOT, "input");
  await mkdir(inputDir, { recursive: true });
  const lastFrameName = "ltx_continuation_last.png";
  await execFileAsync("ffmpeg", ["-y", "-sseof", "-0.05", "-i", path.join(COMFY_ROOT, "output", video.subfolder || "", video.filename), "-frames:v", "1", path.join(inputDir, lastFrameName)]);
  const second = await wait(await submit(imageToVideo("The character is now sitting inside a mysterious red car in the rain, the scene continues directly from the previous moment.", lastFrameName, "text_video_continuation")));
  const report = { started, settings: { width: WIDTH, height: HEIGHT, frames: FRAMES, fps: FPS, steps: STEPS, cfg: 1, sampler: "euler", scheduler: "sgm_uniform" }, first, continuation: second, firstVideo: video, lastFrame: lastFrameName, note: "Continuation uses previous video's extracted last frame as LTX image guide; this is not pure text-only T2V." };
  await writeFile("benchmark/ltx-text-video-continuation-results.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

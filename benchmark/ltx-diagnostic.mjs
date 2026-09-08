// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
// ComfyUI LTX text-to-video node, GPU ve CPU gözlem testi. Ana uygulamaya bağlanmaz.
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);
const BASE = process.env.COMFY_URL || "http://127.0.0.1:8188";
const WS_BASE = BASE.replace(/^http/, "ws");
const clientId = `ltx-diagnostic-${Date.now()}`;
const WIDTH = 384, HEIGHT = 224, FRAMES = 81, FPS = 24, STEPS = 2;

const workflow = {
  "1": { class_type: "CLIPLoader", inputs: { clip_name: "t5xxl_fp8_e4m3fn.safetensors", type: "ltxv", device: "cpu" } },
  "2": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "ltxv-2b-0.9.6-distilled-04-25.safetensors" } },
  "3": { class_type: "CLIPTextEncode", inputs: { text: "A lone character walks from a dim house into a rainy street, cinematic surreal continuous movement.", clip: ["1", 0] } },
  "4": { class_type: "CLIPTextEncode", inputs: { text: "static, frozen, text, watermark, low quality", clip: ["1", 0] } },
  "5": { class_type: "EmptyLTXVLatentVideo", inputs: { width: WIDTH, height: HEIGHT, length: FRAMES, batch_size: 1 } },
  "6": { class_type: "LTXVConditioning", inputs: { positive: ["3", 0], negative: ["4", 0], frame_rate: FPS } },
  "8": { class_type: "LTXVScheduler", inputs: { steps: STEPS, max_shift: 2.05, base_shift: 0.95, stretch: true, terminal: 0.1, latent: ["5", 0] } },
  "9": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
  "10": { class_type: "SamplerCustom", inputs: { model: ["2", 0], add_noise: true, noise_seed: 878787, cfg: 1, positive: ["6", 0], negative: ["6", 1], sampler: ["9", 0], sigmas: ["8", 0], latent_image: ["5", 0] } },
  "11": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["2", 2] } },
  "12": { class_type: "SaveAnimatedWEBP", inputs: { images: ["11", 0], filename_prefix: "benchmark/ltx-diagnostic", fps: FPS, lossless: false, quality: 65, method: "fastest" } },
};

async function sample() {
  let gpu = {};
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=utilization.gpu,utilization.memory,memory.used,memory.free", "--format=csv,noheader,nounits"]);
    const [gpuUtil, memUtil, used, free] = stdout.trim().split(",").map((v) => Number(v.trim()));
    gpu = { gpuUtil, memUtil, usedMiB: used, freeMiB: free };
  } catch {}
  let cpu = null;
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples[0].CookedValue"]);
    cpu = Number.parseFloat(stdout.trim());
  } catch {}
  return { at: new Date().toISOString(), gpu, cpuPercent: Number.isFinite(cpu) ? cpu : null };
}

async function main() {
  const ws = new WebSocket(`${WS_BASE}/ws?clientId=${clientId}`);
  const events = [];
  const samples = [];
  const startedAt = performance.now();
  const sampler = setInterval(async () => samples.push(await sample()), 1000);
  const promptResponse = await fetch(`${BASE}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: clientId }) });
  const promptBody = await promptResponse.json();
  if (!promptBody.prompt_id) throw new Error(JSON.stringify(promptBody));
  const promptId = promptBody.prompt_id;
  const nodeStarted = new Map();
  const nodeTimes = {};
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("diagnostic timeout")), 900000);
    ws.on("message", (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type !== "executing" || msg.data?.prompt_id !== promptId) return;
      const node = msg.data.node;
      events.push({ at: (performance.now() - startedAt) / 1000, node });
      if (node) nodeStarted.set(node, performance.now());
      else {
        for (const [id, t] of nodeStarted) nodeTimes[id] = (performance.now() - t) / 1000;
      }
      if (node === null) { clearTimeout(timeout); resolve(); }
    });
    ws.on("error", reject);
  });
  clearInterval(sampler); ws.close();
  const result = { promptId, settings: { WIDTH, HEIGHT, FRAMES, FPS, STEPS, cfg: 1, sampler: "euler", scheduler: "sgm_uniform" }, totalSeconds: (performance.now() - startedAt) / 1000, nodeEvents: events, nodeTimes, samples, offload: { comfyArgs: "--windows-standalone-build --lowvram --listen 127.0.0.1 --port 8188", clipDevice: "cpu", interpretation: "lowvram activates ComfyUI model offload; CLIP explicitly on CPU" } };
  await writeFile("benchmark/ltx-diagnostic-results.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

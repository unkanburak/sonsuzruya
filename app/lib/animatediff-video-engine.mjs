// Optional motion layer. It never replaces the SDXL image engine.

import path from "node:path";
import { stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class AnimateDiffVideoEngine {
  constructor({ comfyUrl, comfyRoot, timeoutMs = 10000, profile = {} }) {
    const parsed = new URL(comfyUrl);
    if (parsed.hostname !== "127.0.0.1" || parsed.port !== "8191") throw new Error(`animatediff_requires_port_8191:${comfyUrl}`);
    this.url = comfyUrl;
    this.root = comfyRoot;
    this.timeoutMs = timeoutMs;
    this.profile = { width: 384, height: 224, frames: 16, fps: 8, steps: 2, cfg: 1, ...profile };
    this.inProgress = false;
  }

  async checkReady(timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.url}/system_stats`, { signal: controller.signal });
      return response.ok;
    } catch { return false; }
    finally { clearTimeout(timer); }
  }

  workflow({ prompt, inputImage, sceneNumber, seed = Math.floor(Math.random() * 2_000_000_000) }) {
    const p = this.profile;
    const base = p.checkpoint || "DreamShaper_8_pruned.safetensors";
    const motion = p.motionModel || "animatediff_lightning_2step_comfyui.safetensors";
    const nodes = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: base } },
      "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 1] } },
      "3": { class_type: "CLIPTextEncode", inputs: { text: "text, watermark, logo, low quality, blurry, deformed", clip: ["1", 1] } },
      "4": { class_type: "EmptyLatentImage", inputs: { width: p.width, height: p.height, batch_size: p.frames } },
      "5": { class_type: "KSampler", inputs: { model: ["10", 0], seed, steps: p.steps, cfg: p.cfg, sampler_name: "euler", scheduler: "sgm_uniform", positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], denoise: 1 } },
      "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      "10": { class_type: "ADE_AnimateDiffLoaderGen1", inputs: { model: ["1", 0], model_name: motion, beta_schedule: "sqrt_linear (AnimateDiff)" } },
      "11": { class_type: "VHS_VideoCombine", inputs: { images: ["6", 0], frame_rate: p.fps, loop_count: 0, filename_prefix: `live/video_scene_${String(sceneNumber).padStart(5, "0")}`, format: "video/h264-mp4", pix_fmt: "yuv420p", crf: 19, save_metadata: true, pingpong: false, save_output: true } },
    };
    if (inputImage) {
      nodes["7"] = { class_type: "LoadImage", inputs: { image: path.basename(inputImage) } };
      nodes["8"] = { class_type: "VAEEncode", inputs: { pixels: ["7", 0], vae: ["1", 2] } };
      nodes["9"] = { class_type: "RepeatLatentBatch", inputs: { samples: ["8", 0], amount: p.frames } };
      nodes["5"].inputs.latent_image = ["9", 0];
      nodes["5"].inputs.denoise = p.denoise ?? 0.55;
    }
    return nodes;
  }

  async generate({ prompt, inputImage, sceneNumber }) {
    if (this.inProgress) throw new Error("animatediff_generation_locked");
    this.inProgress = true;
    const started = performance.now();
    try {
      if (inputImage) await this.validateInput(inputImage);
      const response = await fetch(`${this.url}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: this.workflow({ prompt, inputImage, sceneNumber }), client_id: "surreal-live-animatediff" }) });
      const accepted = await response.json();
      if (!response.ok || accepted.error || !accepted.prompt_id) throw new Error(`animatediff_rejected:${JSON.stringify(accepted)}`);
      const history = await this.wait(accepted.prompt_id);
      const video = history?.outputs?.["11"]?.gifs?.[0];
      if (!video?.filename) throw new Error("animatediff_missing_output");
      const relative = path.join(video.subfolder || "", video.filename);
      return { media: `/generated/${relative.split(path.sep).join("/")}`, generationTime: (performance.now() - started) / 1000 };
    } finally { this.inProgress = false; }
  }

  async validateInput(inputImage) {
    const info = await stat(inputImage);
    if (!info.isFile() || info.size <= 0) throw new Error(`animatediff_input_invalid:size_or_file:${inputImage}`);
    const python = path.join(path.dirname(this.root), "python_embeded", "python.exe");
    try {
      await execFileAsync(python, ["-c", "from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.verify()", inputImage], { windowsHide: true, timeout: 5000 });
    } catch (error) {
      throw new Error(`animatediff_input_invalid:png_decode:${inputImage}:${error?.message || error}`);
    }
  }

  async wait(promptId) {
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      const item = (await (await fetch(`${this.url}/history/${promptId}`)).json())[promptId];
      if (item?.status?.completed) return item;
      if (item?.status?.status_str === "error") throw new Error("animatediff_execution_error");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("animatediff_timeout");
  }
}

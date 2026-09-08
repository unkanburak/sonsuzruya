// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import path from "node:path";
import crypto from "node:crypto";
import { copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class ComfyImageEngine {
  constructor({ comfyUrl, comfyRoot, outputRoot = comfyRoot, profile, initialInput = "seed.png", resetInterval = 10, timeoutMs = 120000, historyCleanupEvery = 25 }) {
    this.url = comfyUrl;
    this.root = comfyRoot;
    this.outputRoot = outputRoot;
    this.profile = profile;
    this.initialInput = initialInput;
    this.resetInterval = resetInterval;
    this.timeoutMs = timeoutMs;
    this.historyCleanupEvery = Math.max(0, Number(historyCleanupEvery) || 0);
    this.completedJobs = 0;
    this.currentInput = "benchmark.webp";
    this.inProgress = false;
  }

  workflow({ prompt, sceneNumber, seed }) {
    const p = this.profile;
    const referencePath = path.join(this.root, "input", this.currentInput);
    const useReference = p.continuityMode === "PREVIOUS_IMAGE" && this.currentInput && existsSync(referencePath);
    const workflow = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: p.checkpoint } },
      "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 1] } },
      "3": { class_type: "CLIPTextEncode", inputs: { text: "text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality", clip: ["1", 1] } },
      "4": { class_type: "EmptyLatentImage", inputs: { width: p.width, height: p.height, batch_size: 1 } },
      "5": {
        class_type: "KSampler",
        inputs: {
          model: ["1", 0], seed: seed ?? Math.floor(Math.random() * 2_000_000_000), steps: p.steps, cfg: p.cfg,
          sampler_name: p.sampler || "dpmpp_2m", scheduler: p.scheduler || "karras",
          positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], denoise: 1,
        },
      },
      "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      "8": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: `live/scene_${String(sceneNumber).padStart(5, "0")}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` } },
    };
    if (useReference) {
      workflow["9"] = { class_type: "LoadImage", inputs: { image: this.currentInput } };
      workflow["10"] = { class_type: "VAEEncode", inputs: { pixels: ["9", 0], vae: ["1", 2] } };
      workflow["5"].inputs.latent_image = ["10", 0];
      workflow["5"].inputs.denoise = p.denoise ?? 0.55;
    }
    return workflow;
  }

  async generate({ prompt, sceneNumber, seed }) {
    if (this.inProgress) throw new Error("generation_locked");
    this.inProgress = true;
    const started = performance.now();
    try {
      const response = await fetch(`${this.url}/prompt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: this.workflow({ prompt, sceneNumber, seed }), client_id: "surreal-live" }),
      });
      const accepted = await response.json();
      if (!response.ok || accepted.error || !accepted.prompt_id) throw new Error(`comfy_rejected:${JSON.stringify(accepted)}`);
      const history = await this.wait(accepted.prompt_id);
      const image = history?.outputs?.["8"]?.images?.[0];
      if (!image?.filename) throw new Error("comfy_missing_output");

      const relative = path.join(image.subfolder || "", image.filename);
      let source = path.join(image.type === "temp" ? this.root : this.outputRoot, image.type === "temp" ? "temp" : "", relative);
      // Comfy can report an output-relative path while its configured output
      // directory differs from the app's delivery mirror. Prefer the reported
      // configured root, then safely fall back to the instance's native output.
      if (image.type !== "temp") {
        const nativeOutput = path.join(this.root, "output", relative);
        if (existsSync(nativeOutput)) source = nativeOutput;
      }
      if (!existsSync(source)) {
        for (let attempt = 0; attempt < 20 && !existsSync(source); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 250));
      }
      // Never overwrite ComfyUI's potentially locked input/current.png on Windows.
      // A per-scene snapshot preserves the same continuity purpose without EPERM races.
      const inputName = `animatediff_input_${String(sceneNumber).padStart(5, "0")}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`;
      let inputImage = null;
      let handoffError = null;
      try {
        const inputPath = path.join(this.root, "input", inputName);
        let copied = false;
        let lastCopyError = null;
        for (let attempt = 0; attempt < 8 && !copied; attempt += 1) {
          try { await copyFile(source, inputPath); copied = true; }
          catch (error) { lastCopyError = error; await new Promise((resolve) => setTimeout(resolve, 250)); }
        }
        if (!copied) throw lastCopyError || new Error("handoff_copy_failed");
        const info = await stat(inputPath);
        if (!info.isFile() || info.size <= 0) throw new Error("handoff_empty_file");
        const python = path.join(path.dirname(this.root), "python_embeded", "python.exe");
        await execFileAsync(python, ["-c", "from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.verify()", inputPath], { windowsHide: true, timeout: 5000 });
        inputImage = inputPath;
      } catch (error) {
        handoffError = String(error?.message || error);
      }
      if (inputImage) this.currentInput = inputName;
      this.completedJobs += 1;
      await this.maybePruneHistory();
      return {
        media: `/generated/${relative.split(path.sep).join("/")}`,
        sourcePath: source,
        inputImage,
        handoffError,
        generationTime: (performance.now() - started) / 1000,
      };
    } finally {
      this.inProgress = false;
    }
  }

  async maybePruneHistory() {
    if (!this.historyCleanupEvery || this.completedJobs % this.historyCleanupEvery !== 0) return;
    try {
      const queueResponse = await fetch(`${this.url}/queue`);
      const queue = await queueResponse.json();
      if ((queue.queue_running?.length || 0) > 0 || (queue.queue_pending?.length || 0) > 0) return;
      await fetch(`${this.url}/history`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
    } catch {
      // History is disposable metadata; cleanup failure must never fail a scene.
    }
  }

  async wait(promptId) {
    const deadline = Date.now() + this.timeoutMs;
    while (true) {
      if (Date.now() >= deadline) throw new Error("comfy_generation_timeout");
      const response = await fetch(`${this.url}/history/${promptId}`);
      const body = await response.json();
      const item = body[promptId];
      if (item?.status?.completed) return item;
      if (item?.status?.status_str === "error") {
        const failure = item.status.messages?.find((message) => message?.[0] === "execution_error")?.[1] || {};
        const details = [failure.node_id && `node=${failure.node_id}`, failure.node_type && `type=${failure.node_type}`, failure.exception_type && `exception=${failure.exception_type}`, failure.exception_message && `message=${failure.exception_message}`, failure.current_inputs?.filename_prefix && `path=${failure.current_inputs.filename_prefix}`].filter(Boolean).join("; ");
        throw new Error(`comfy_execution_error${details ? `: ${details}` : ""}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

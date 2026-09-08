// Deterministic static-image -> lightweight motion loop. No semantic generation.
import path from "node:path";
import crypto from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

export class LoopMotionEngine {
  constructor({ outputRoot, publicPrefix = "/loops", ffmpeg = "ffmpeg", timeoutMs = 120000, width = 768, height = 448, amplitude = 0.07 }) {
    this.outputRoot = outputRoot; this.publicPrefix = publicPrefix; this.ffmpeg = ffmpeg; this.timeoutMs = timeoutMs;
    this.width = Math.max(32, Math.floor(Number(width) || 768) - (Math.floor(Number(width) || 768) % 2));
    this.height = Math.max(32, Math.floor(Number(height) || 448) - (Math.floor(Number(height) || 448) % 2));
    this.amplitude = Math.min(0.15, Math.max(0.01, Number(amplitude) || 0.07));
    this.active = false; this.pending = null; this.activeChildren = 0; this.maxPendingObserved = 0;
  }
  enqueue(job) {
    return new Promise((resolve, reject) => {
      const item = { job, resolve, reject };
      if (this.active) {
        if (this.pending) this.pending.reject(new Error("loop_superseded"));
        this.pending = item; this.maxPendingObserved = Math.max(this.maxPendingObserved, 1);
      } else void this.#run(item);
    });
  }
  async #run(item) {
    this.active = true;
    try { item.resolve(await this.generate(item.job)); } catch (error) { item.reject(error); }
    finally {
      this.active = false;
      const next = this.pending; this.pending = null;
      if (next) void this.#run(next);
    }
  }
  async generate({ inputImage, sceneId }) {
    if (!inputImage) throw new Error("loop_missing_input");
    const info = await stat(inputImage); if (!info.isFile() || info.size <= 0) throw new Error("loop_empty_input");
    await mkdir(this.outputRoot, { recursive: true });
    const name = `scene_${String(sceneId).padStart(5, "0")}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp4`;
    const output = path.join(this.outputRoot, name);
    // Keep the committed image composition stable.  A single cosine breathing
    // curve adds a gentle but clearly visible push-in/pull-out while
    // returning exactly to the opening frame, so the loop does not pump or
    // read as a camera cut. No pan, particles or semantic transformation.
    const w = this.width; const h = this.height;
    const frames = 48; const fps = 12; const amplitude = this.amplitude;
    // A fixed-center cosine envelope gives one slow push-in and one slow
    // return over the complete loop.  Use frame-wise scale + a centered crop
    // instead of zoompan: zoompan rounds its crop origin independently per
    // frame, which can look like a one-pixel side-to-side tremor. Even-sized
    // scaled frames keep the crop origin exactly centered.
    const envelope = `1+${amplitude}*(0.5-0.5*cos(2*PI*n/${frames - 1}))`;
    const filter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,scale=w='2*ceil(iw*(${envelope})/2)':h='2*ceil(ih*(${envelope})/2)':eval=frame,crop=${w}:${h}:x='(iw-ow)/2':y='(ih-oh)/2',setsar=1,fps=${fps}`;
    const started = performance.now();
    this.activeChildren += 1;
    try { await execFileAsync(this.ffmpeg, ["-y", "-loop", "1", "-i", inputImage, "-vf", filter, "-frames:v", String(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { windowsHide: true, timeout: this.timeoutMs, maxBuffer: 4 * 1024 * 1024 }); }
    finally { this.activeChildren -= 1; }
    const out = await stat(output); if (!out.isFile() || out.size <= 0) throw new Error("loop_empty_output");
    return { media: `${this.publicPrefix}/${name}`, sceneId, outputPath: output, bytes: out.size, renderTime: (performance.now() - started) / 1000 };
  }
  stats() { return { active: this.active, pending: this.pending ? 1 : 0, activeChildren: this.activeChildren, maxPendingObserved: this.maxPendingObserved }; }
}

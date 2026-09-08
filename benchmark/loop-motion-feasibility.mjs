// Isolated static-image -> lightweight motion-loop benchmark.
// This is not AnimateDiff, I2V, story continuation, or production integration.
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(".");
const OUT = path.join(ROOT, "benchmark", "loop-motion");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const samples = [
  ["initial-room", "public/initial.png", "indoor corridor / central figure"],
  ["run1-a", "benchmark/frames/run1_01.png", "indoor / dark"],
  ["run1-b", "benchmark/frames/run1_02.png", "indoor / brighter"],
  ["run1-c", "benchmark/frames/run1_03.png", "indoor / central figure"],
  ["run2-a", "benchmark/frames/run2_01.png", "outdoor or transition"],
  ["run2-b", "benchmark/frames/run2_02.png", "outdoor / atmospheric"],
  ["run2-c", "benchmark/frames/run2_03.png", "darker scene"],
  ["run3-a", "benchmark/frames/run3_01.png", "surreal / central figure"],
  ["i2v-portal", "benchmark/frames/i2v_run3_01.png", "surreal portal / glow"],
  ["i2v-tunnel", "benchmark/frames/i2v_run2_01.png", "tunnel / dark transition"],
];
const formats = {
  mp4: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
  webm: ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "35", "-pix_fmt", "yuv420p"],
  webp: ["-c:v", "libwebp", "-lossless", "0", "-q:v", "70", "-loop", "0"],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function runFfmpeg(input, output, extra) {
  const filter = "scale=768:448:force_original_aspect_ratio=decrease,pad=768:448:(ow-iw)/2:(oh-ih)/2,zoompan=z='1.0+0.035*(0.5-0.5*cos(2*PI*on/47))':x='iw/2-(iw/zoom/2)+2*sin(2*PI*on/48)':y='ih/2-(ih/zoom/2)+2*cos(2*PI*on/48)':d=48:s=768x448:fps=12";
  const args = ["-y", "-loop", "1", "-i", input, "-vf", filter, "-frames:v", "48", ...extra, output];
  const started = performance.now();
  const result = await execFileAsync(FFMPEG, args, { windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  return { seconds: (performance.now() - started) / 1000, stderr: result.stderr?.slice(-1000) || "" };
}
async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const results = [];
  for (const [id, relative, category] of samples) {
    const input = path.join(ROOT, relative);
    try { await fs.access(input); } catch { results.push({ id, relative, category, error: "missing_source" }); continue; }
    const item = { id, sourceImage: input, category, formats: {} };
    for (const [format, extra] of Object.entries(formats)) {
      const output = path.join(OUT, `${id}.${format}`);
      try {
        const run = await runFfmpeg(input, output, extra);
        const st = await fs.stat(output);
        item.formats[format] = { output, durationSeconds: 4, resolution: "768x448", fps: 12, renderSeconds: run.seconds, fileBytes: st.size, success: st.size > 0 };
      } catch (error) { item.formats[format] = { output, success: false, error: String(error?.message || error) }; }
    }
    results.push(item);
    console.log(JSON.stringify({ id, formats: item.formats }));
  }
  const all = results.flatMap((r) => Object.entries(r.formats || {}).map(([format, v]) => ({ ...v, id: r.id, format })));
  const ok = all.filter((x) => x.success);
  const stat = (xs, key) => { const a = xs.map((x) => x[key]).filter(Number.isFinite).sort((x, y) => x - y); return { average: a.length ? a.reduce((s, x) => s + x, 0) / a.length : null, p95: a.length ? a[Math.min(a.length - 1, Math.ceil(a.length * 0.95) - 1)] : null }; };
  const summary = {}; for (const format of Object.keys(formats)) { const xs = ok.filter((x) => x.format === format); summary[format] = { success: xs.length, renderSeconds: stat(xs, "renderSeconds"), fileBytes: stat(xs, "fileBytes") }; }
  await fs.writeFile(path.join(ROOT, "benchmark", "loop-motion-results.json"), JSON.stringify({ startedAt: new Date().toISOString(), approach: "deterministic FFmpeg zoom/drift loop from one image", samples, results, summary }, null, 2));
  console.log(JSON.stringify({ summary }, null, 2));
}
main().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });

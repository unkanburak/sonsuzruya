import { mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Captures the actual local viewer-facing PNG for each of 50 debug-vote turns.
// This is a benchmark artifact only; it does not alter production settings.
const base = "http://127.0.0.1:3000";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(root, "benchmark", "jungian-observer-50");
const comfyOutputRoot = path.join(root, "runtime", "comfy8188-output");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getState = async () => (await fetch(`${base}/api/state`)).json();
const sourcePathFromMedia = (media) => {
  const value = String(media || "");
  const prefix = "/generated/";
  if (!value.startsWith(prefix)) return null;
  return path.join(comfyOutputRoot, ...decodeURIComponent(value.slice(prefix.length)).split("/").filter(Boolean));
};

await mkdir(outputDir, { recursive: true });
const rows = [];
for (let i = 1; i <= 50; i += 1) {
  let before = await getState();
  for (let wait = 0; wait < 120 && before.phase !== "PLAYING_VOTING"; wait += 1) { await sleep(500); before = await getState(); }
  const fromScene = before.sceneNumber;
  const vote = String(i % 2 === 0 ? 2 : 1);
  const selected = before.options?.[`option_${vote}_tr`] || null;
  const started = performance.now();
  const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `jung-visual-${Date.now()}-${i}`, vote }) });
  if (!response.ok) throw new Error(`vote_failed_${i}_${response.status}`);
  let after = before;
  for (let wait = 0; wait < 240; wait += 1) { await sleep(500); after = await getState(); if (after.sceneNumber > fromScene && after.phase === "PLAYING_VOTING") break; }
  const source = sourcePathFromMedia(after.lastFrame || after.media);
  const filename = `turn_${String(i).padStart(2, "0")}.png`;
  const destination = path.join(outputDir, filename);
  let copied = false;
  let copyError = null;
  if (source) {
    try { await copyFile(source, destination); copied = true; } catch (error) { copyError = String(error?.message || error); }
  } else copyError = "no_png_media_path";
  rows.push({ turn: i, fromScene, toScene: after.sceneNumber, vote, selected, location: after.storyState?.current_location || null, media: after.lastFrame || after.media || null, copied, output: copied ? `benchmark/jungian-observer-50/${filename}` : null, copyError, seconds: Number(((performance.now() - started) / 1000).toFixed(3)) });
  console.log(`${i}/50 scene=${after.sceneNumber} copied=${copied} ${rows.at(-1).seconds}s`);
}
await writeFile(path.join(outputDir, "trace.json"), JSON.stringify({ startedAt: new Date().toISOString(), rows }, null, 2), "utf8");
console.log(JSON.stringify({ turns: rows.length, copied: rows.filter((row) => row.copied).length, output: "benchmark/jungian-observer-50/trace.json" }, null, 2));

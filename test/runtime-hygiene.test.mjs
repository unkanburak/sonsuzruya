import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile, readFile, readdir } from "node:fs/promises";
import { AtomicStateStore, RotatingJsonlLog, MediaJanitor } from "../app/lib/runtime-hygiene.mjs";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";

test("atomic state keeps a readable committed snapshot", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "infinite-state-")); const file = path.join(dir, "state.json"); const store = new AtomicStateStore(file);
  await store.write({ sceneNumber: 1 }); await store.write({ sceneNumber: 2 });
  assert.equal((await store.read()).sceneNumber, 2); assert.equal(JSON.parse(await readFile(file, "utf8")).sceneNumber, 2);
});

test("event log rotates at a fixed size", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "infinite-log-")); const file = path.join(dir, "events.jsonl"); const log = new RotatingJsonlLog(file, { maxBytes: 100, backups: 2 });
  for (let i = 0; i < 20; i += 1) await log.append({ i, payload: "x".repeat(30) });
  const names = await readdir(dir); assert.ok(names.length <= 3); assert.ok(names.includes("events.jsonl"));
});

test("media janitor retains only a recent fixed scene window", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "infinite-media-")); const manifest = path.join(dir, "manifest.json"); const janitor = new MediaJanitor({ manifestFile: manifest, keepScenes: 3, cleanupEvery: 1 }); await janitor.load();
  for (let i = 1; i <= 8; i += 1) { const file = path.join(dir, `scene_${i}.mp4`); await writeFile(file, "x"); await janitor.register(i, [file]); }
  const names = (await readdir(dir)).filter((x) => x.endsWith(".mp4")); assert.deepEqual(names.sort(), ["scene_6.mp4", "scene_7.mp4", "scene_8.mp4"]);
});

test("Comfy history cleanup is bounded and never blocks a scene", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });
    if (String(url).endsWith("/queue")) return { json: async () => ({ queue_running: [], queue_pending: [] }) };
    return { ok: true, json: async () => ({}) };
  };
  try {
    const engine = new ComfyImageEngine({ comfyUrl: "http://test-comfy", comfyRoot: ".", profile: {}, historyCleanupEvery: 1 });
    engine.completedJobs = 1;
    await engine.maybePruneHistory();
    assert.deepEqual(calls, [
      { url: "http://test-comfy/queue", method: "GET" },
      { url: "http://test-comfy/history", method: "POST" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

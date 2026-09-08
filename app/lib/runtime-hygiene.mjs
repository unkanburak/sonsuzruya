// Bounded runtime storage for the frozen production pipeline.
import path from "node:path";
import { mkdir, readFile, writeFile, rename, unlink, stat, readdir } from "node:fs/promises";

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${file}.bak`;
  await writeFile(temp, JSON.stringify(value, null, 2));
  try { await unlink(backup); } catch {}
  try { await rename(file, backup); } catch {}
  try { await rename(temp, file); }
  catch (error) {
    try { await rename(backup, file); } catch {}
    try { await unlink(temp); } catch {}
    throw error;
  }
}

export class AtomicStateStore {
  constructor(file) { this.file = file; this.chain = Promise.resolve(); }
  async read() {
    for (const candidate of [this.file, `${this.file}.bak`]) {
      try { return JSON.parse(await readFile(candidate, "utf8")); } catch {}
    }
    throw new Error("state_unavailable");
  }
  write(value) {
    const snapshot = structuredClone(value);
    this.chain = this.chain.then(() => atomicJson(this.file, snapshot));
    return this.chain;
  }
}

export class RotatingJsonlLog {
  constructor(file, { maxBytes = 5 * 1024 * 1024, backups = 3 } = {}) { this.file = file; this.maxBytes = maxBytes; this.backups = backups; this.chain = Promise.resolve(); }
  append(value) {
    this.chain = this.chain.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      let size = 0; try { size = (await stat(this.file)).size; } catch {}
      const line = `${JSON.stringify(value)}\n`;
      if (size + Buffer.byteLength(line) > this.maxBytes) {
        try { await unlink(`${this.file}.${this.backups}`); } catch {}
        for (let i = this.backups - 1; i >= 1; i -= 1) { try { await rename(`${this.file}.${i}`, `${this.file}.${i + 1}`); } catch {} }
        try { await rename(this.file, `${this.file}.1`); } catch {}
      }
      await writeFile(this.file, line, { flag: "a" });
    });
    return this.chain;
  }
}

export class MediaJanitor {
  constructor({ manifestFile, keepScenes = 8, cleanupEvery = 10 }) { this.manifestFile = manifestFile; this.keepScenes = keepScenes; this.cleanupEvery = cleanupEvery; this.items = []; this.turns = 0; this.chain = Promise.resolve(); }
  async load() { try { const value = JSON.parse(await readFile(this.manifestFile, "utf8")); this.items = Array.isArray(value.items) ? value.items.slice(-this.keepScenes * 4) : []; } catch { this.items = []; } }
  register(sceneId, files = []) {
    const safe = files.filter((file) => typeof file === "string" && path.isAbsolute(file));
    this.items.push({ sceneId: Number(sceneId), files: safe }); this.turns += 1;
    if (this.turns % this.cleanupEvery === 0 || this.items.length > this.keepScenes * 3) return this.cleanup(sceneId);
    return this.save();
  }
  cleanup(activeSceneId) {
    this.chain = this.chain.then(async () => {
      const protectFrom = Number(activeSceneId) - this.keepScenes + 1;
      const keep = [], remove = [];
      for (const item of this.items) (item.sceneId >= protectFrom ? keep : remove).push(item);
      for (const item of remove) for (const file of item.files) {
        const name = path.basename(file);
        if (!/^(scene_|animatediff_input_)/.test(name)) continue;
        try { await unlink(file); } catch {}
      }
      this.items = keep.slice(-this.keepScenes * 3);
      await atomicJson(this.manifestFile, { updatedAt: new Date().toISOString(), items: this.items });
    });
    return this.chain;
  }
  save() { this.chain = this.chain.then(() => atomicJson(this.manifestFile, { updatedAt: new Date().toISOString(), items: this.items.slice(-this.keepScenes * 3) })); return this.chain; }
  stats() { return { trackedScenes: this.items.length, trackedFiles: this.items.reduce((n, x) => n + x.files.length, 0), keepScenes: this.keepScenes }; }
}

export async function directoryStats(directory, prefix = null) {
  let files = []; try { files = await readdir(directory, { withFileTypes: true }); } catch { return { files: 0, bytes: 0 }; }
  let count = 0, bytes = 0;
  for (const entry of files) {
    if (!entry.isFile() || (prefix && !entry.name.startsWith(prefix))) continue;
    try { const s = await stat(path.join(directory, entry.name)); count += 1; bytes += s.size; } catch {}
  }
  return { files: count, bytes };
}

export async function pruneManagedDirectory(directory, { prefix, keep = 24, protect = [] }) {
  const protectedNames = new Set(protect.map((x) => path.basename(x || "")).filter(Boolean));
  let entries = []; try { entries = await readdir(directory, { withFileTypes: true }); } catch { return { removed: 0 }; }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(prefix) || protectedNames.has(entry.name)) continue;
    try { const s = await stat(path.join(directory, entry.name)); files.push({ path: path.join(directory, entry.name), mtimeMs: s.mtimeMs }); } catch {}
  }
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  let removed = 0;
  for (const item of files.slice(keep)) { try { await unlink(item.path); removed += 1; } catch {} }
  return { removed };
}

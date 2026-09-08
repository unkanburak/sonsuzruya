// Safe media lifecycle helper. Dry-run is the default; deletion requires --apply.
import path from "node:path";
import { readdir, stat, unlink } from "node:fs/promises";

const root = "D:\\InfiniteAILive\\ComfyUI_windows_portable\\ComfyUI\\output\\live";
const keep = Number(process.env.MEDIA_KEEP || 200);
const apply = process.argv.includes("--apply");
const entries = [];
for (const name of await readdir(root)) {
  const file = path.join(root, name);
  const info = await stat(file).catch(() => null);
  if (info?.isFile()) entries.push({ file, name, mtime: info.mtimeMs, size: info.size });
}
entries.sort((a, b) => b.mtime - a.mtime);
const remove = entries.slice(Math.max(keep, 0));
console.log(JSON.stringify({ root, keep, apply, total: entries.length, removeCount: remove.length, removeBytes: remove.reduce((n, item) => n + item.size, 0), files: remove.map((item) => item.name) }, null, 2));
if (apply) for (const item of remove) await unlink(item.file);

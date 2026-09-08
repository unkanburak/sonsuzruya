// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

const width = 512;
const height = 288;
const raw = Buffer.alloc((width * 4 + 1) * height);
let seed = 73421;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) & 255) / 255;

for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1);
  raw[row] = 0;
  for (let x = 0; x < width; x += 1) {
    const horizon = y / height;
    const center = Math.abs(x - width / 2) / (width / 2);
    let r = 18 + 42 * horizon + 20 * center;
    let g = 12 + 20 * horizon;
    let b = 42 + 65 * (1 - center) + 22 * horizon;

    const floor = y > 184 + center * 34;
    if (floor) { r = 45 + 45 * horizon; g = 20 + 12 * center; b = 62 + 40 * center; }
    const door = x > 202 && x < 310 && y > 55 && y < 226;
    const doorCore = x > 216 && x < 296 && y > 72 && y < 226;
    if (door) { r = 155; g = 61; b = 188; }
    if (doorCore) { r = 240 - 80 * horizon; g = 126 + 80 * (1 - horizon); b = 92 + 130 * (1 - horizon); }
    const figure = ((x - 256) ** 2 / 14 ** 2 + (y - 171) ** 2 / 49 ** 2 < 1) || ((x - 256) ** 2 + (y - 118) ** 2 < 15 ** 2);
    if (figure) { r = 8; g = 6; b = 15; }
    const grain = (noise() - 0.5) * 12;
    const i = row + 1 + x * 4;
    raw[i] = Math.max(0, Math.min(255, r + grain));
    raw[i + 1] = Math.max(0, Math.min(255, g + grain));
    raw[i + 2] = Math.max(0, Math.min(255, b + grain));
    raw[i + 3] = 255;
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0); name.copy(out, 4); data.copy(out, 8); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, data.length + 8);
  return out;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
await writeFile("public/initial.png", png);
console.log(`public/initial.png (${width}x${height})`);

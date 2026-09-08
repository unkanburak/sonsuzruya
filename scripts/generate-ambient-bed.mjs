import { mkdir, writeFile } from "node:fs/promises";

// Original, deterministic low-level ambient bed. No external/copyrighted audio.
const sampleRate = 44100;
const seconds = 90;
const channels = 2;
const frames = sampleRate * seconds;
const data = Buffer.alloc(frames * channels * 2);
let noise = 0;
for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const a = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / seconds);
  const slow = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 37);
  const n = (Math.random() * 2 - 1) * 0.006;
  noise = noise * 0.985 + n * 0.015;
  const left = (0.026 * Math.sin(2 * Math.PI * 55 * t) + 0.012 * Math.sin(2 * Math.PI * 82.5 * t + 0.7) + (0.004 + 0.004 * slow) * noise) * (0.75 + 0.25 * a);
  const right = (0.026 * Math.sin(2 * Math.PI * 55 * t + 0.35) + 0.012 * Math.sin(2 * Math.PI * 82.5 * t + 1.1) + (0.004 + 0.004 * slow) * noise) * (0.75 + 0.25 * a);
  for (const [channel, value] of [[0, left], [1, right]]) {
    const offset = (i * channels + channel) * 2;
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(value * 32767))), offset);
  }
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22); header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28); header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(data.length, 40);
await mkdir("assets/audio", { recursive: true });
await writeFile("assets/audio/ambient_main.wav", Buffer.concat([header, data]));
console.log(JSON.stringify({ path: "assets/audio/ambient_main.wav", seconds, sampleRate, channels, bytes: header.length + data.length }));

// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import { mkdir, writeFile } from "node:fs/promises";

const durationSeconds = Number(process.argv[2] || 3600);
const reportPath = process.argv[3] || "state/soak-report.json";
const baseUrl = process.env.MVP_URL || "http://127.0.0.1:3000";
const startedAt = new Date();
const failures = [];
let samples = 0;
let firstState = null;
let lastState = null;

while ((Date.now() - startedAt.getTime()) / 1000 < durationSeconds) {
  try {
    const [healthResponse, stateResponse] = await Promise.all([fetch(`${baseUrl}/health`), fetch(`${baseUrl}/api/state`)]);
    if (!healthResponse.ok || !stateResponse.ok) throw new Error(`http_${healthResponse.status}_${stateResponse.status}`);
    const health = await healthResponse.json();
    const state = await stateResponse.json();
    if (!state.media) failures.push({ at: new Date().toISOString(), code: "missing_media" });
    if (!firstState) firstState = state;
    lastState = { ...state, health };
    samples += 1;
  } catch (error) {
    failures.push({ at: new Date().toISOString(), code: String(error?.message || error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

const report = {
  startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), requestedDurationSeconds: durationSeconds,
  samples, startScene: firstState?.sceneNumber ?? null, endScene: lastState?.sceneNumber ?? null,
  completedRounds: firstState && lastState ? lastState.sceneNumber - firstState.sceneNumber : 0,
  missingMediaSamples: failures.filter((item) => item.code === "missing_media").length,
  requestFailures: failures.filter((item) => item.code !== "missing_media"),
  passed: Boolean(firstState && lastState && lastState.sceneNumber - firstState.sceneNumber >= 10 && failures.length === 0),
};

await mkdir("state", { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

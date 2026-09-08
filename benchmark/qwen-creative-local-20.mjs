import fs from "node:fs/promises";
const base = "http://127.0.0.1:3000";
const eventFile = "state/events.jsonl";
const trace = [];
async function readEvents() {
  const text = await fs.readFile(eventFile, "utf8").catch(() => "");
  return text.split(/\r?\n/).filter(Boolean).slice(-400).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
}
async function waitForRound() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const state = await (await fetch(`${base}/api/state`)).json();
    if (state.phase === "PLAYING_VOTING" && state.roundId) return state;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("playing_round_timeout");
}
for (let i = 0; i < 20; i += 1) {
  const state = await waitForRound();
  const started = Date.now();
  const vote = String((i % 2) + 1);
  const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `qwen-creative-local-${Date.now()}-${i}`, vote }) });
  if (!response.ok) throw new Error(`vote_${response.status}`);
  const deadline = Date.now() + 40000;
  let committed;
  let optionsCreated;
  while (Date.now() < deadline) {
    const events = await readEvents();
    optionsCreated = events.find((event) => event.type === "OPTIONS_CREATED" && event.roundId === state.roundId);
    committed = events.find((event) => event.type === "NEXT_SCENE_COMMITTED" && event.roundId === state.roundId);
    if (committed) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!committed) throw new Error(`round_${i + 1}_commit_timeout`);
  trace.push({ round: i + 1, roundId: state.roundId, fromScene: state.sceneNumber, toScene: committed.nextScene, vote, source: optionsCreated?.source || "unknown", elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)), options: [state.options?.option_1_tr || "", state.options?.option_2_tr || ""] });
  console.log(JSON.stringify(trace.at(-1)));
}
const latencies = trace.map((row) => row.elapsedSeconds).sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)] ?? null;
const output = { completed: trace.length, qwenCount: trace.filter((row) => row.source === "qwen").length, fallbackCount: trace.filter((row) => row.source === "fallback").length, p50Seconds: percentile(0.5), p95Seconds: percentile(0.95), trace };
await fs.writeFile("benchmark/qwen-creative-local-20-result.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));

import fs from "node:fs/promises";

const base = "http://127.0.0.1:3000";
const initial = await (await fetch(`${base}/api/state`)).json();
const startScene = initial.sceneNumber;
const targetScene = startScene + 50;
const rows = [];
let lastRound = "";
const deadline = Date.now() + 900_000;
while (Date.now() < deadline) {
  const state = await (await fetch(`${base}/api/state`)).json();
  if (state.sceneNumber >= targetScene) {
    await fs.writeFile("benchmark/history-fix-50-result.json", JSON.stringify({ startScene, targetScene, endScene: state.sceneNumber, rows }, null, 2));
    process.stdout.write(JSON.stringify({ status: "complete", startScene, targetScene, endScene: state.sceneNumber, rounds: rows.length }));
    process.exit(0);
  }
  if (state.phase === "PLAYING_VOTING" && state.optionsReady && state.roundId && state.roundId !== lastRound) {
    const labels = [state.options?.option_1_tr, state.options?.option_2_tr];
    const records = state.storyState?.recent_option_records || [];
    const sources = [...new Set(records.filter((r) => labels.includes(r.label_tr)).map((r) => r.source).filter(Boolean))];
    const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `history-fix-${state.sceneNumber}-${state.roundId}`, vote: String((rows.length % 2) + 1) }) });
    rows.push({ scene: state.sceneNumber, location: state.storyState?.current_location, options: labels, source: sources.join(",") || "unknown", status: response.status });
    lastRound = state.roundId;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
await fs.writeFile("benchmark/history-fix-50-result.json", JSON.stringify({ startScene, targetScene, timeout: true, endScene: (await (await fetch(`${base}/api/state`)).json()).sceneNumber, rows }, null, 2));
process.stdout.write(JSON.stringify({ status: "timeout", startScene, targetScene, rounds: rows.length }));
process.exit(1);

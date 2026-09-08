import fs from "node:fs/promises";

const base = "http://127.0.0.1:3000";
const initial = await (await fetch(`${base}/api/state`)).json();
const startScene = initial.sceneNumber;
const targetScene = startScene + 200;
const rows = [];
let lastRound = "";
const deadline = Date.now() + 1_200_000;

while (Date.now() < deadline) {
  const state = await (await fetch(`${base}/api/state`)).json();
  if (state.sceneNumber >= targetScene) {
    await fs.writeFile("benchmark/option-200-real-result.json", JSON.stringify({ startScene, targetScene, endScene: state.sceneNumber, rows }, null, 2));
    process.stdout.write(JSON.stringify({ status: "complete", startScene, targetScene, endScene: state.sceneNumber, rounds: rows.length }));
    process.exit(0);
  }
  if (state.phase === "PLAYING_VOTING" && state.optionsReady && state.roundId && state.roundId !== lastRound) {
    const options = [state.options?.option_1_tr || "", state.options?.option_2_tr || ""];
    const vote = String((rows.length % 2) + 1);
    const response = await fetch(`${base}/api/debug/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: `option-200-${state.sceneNumber}-${state.roundId}`, vote }),
    });
    rows.push({
      round: rows.length + 1,
      scene: state.sceneNumber,
      location: state.storyState?.current_location || "",
      options,
      vote,
      status: response.status,
      previousOptions: state.previousOptions || [],
      recentRecords: (state.storyState?.recent_option_records || []).slice(-2),
    });
    lastRound = state.roundId;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const end = await (await fetch(`${base}/api/state`)).json();
await fs.writeFile("benchmark/option-200-real-result.json", JSON.stringify({ startScene, targetScene, endScene: end.sceneNumber, timeout: true, rows }, null, 2));
process.stdout.write(JSON.stringify({ status: "timeout", startScene, targetScene, endScene: end.sceneNumber, rounds: rows.length }));
process.exit(1);

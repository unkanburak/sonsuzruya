const base = "http://127.0.0.1:3000";
const initial = await (await fetch(`${base}/api/state`)).json();
const startScene = initial.sceneNumber;
const targetScene = startScene + 30;
let lastVotedRound = "";
const deadline = Date.now() + 480_000;

while (Date.now() < deadline) {
  const state = await (await fetch(`${base}/api/state`)).json();
  if (state.sceneNumber >= targetScene) {
    console.log(JSON.stringify({ status: "complete", startScene, targetScene, endScene: state.sceneNumber, phase: state.phase }));
    process.exit(0);
  }
  if (state.phase === "PLAYING_VOTING" && state.optionsReady && state.roundId && state.roundId !== lastVotedRound) {
    const vote = String(((state.sceneNumber - startScene) % 2) + 1);
    const response = await fetch(`${base}/api/debug/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: `two-route-real-${state.sceneNumber}-${state.roundId}`, vote })
    });
    lastVotedRound = state.roundId;
    console.log(JSON.stringify({ event: "vote", scene: state.sceneNumber, vote, status: response.status, options: [state.options?.option_1_tr, state.options?.option_2_tr] }));
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}

console.log(JSON.stringify({ status: "timeout", startScene, targetScene }));
process.exit(1);

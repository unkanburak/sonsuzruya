const base = "http://127.0.0.1:3000";
const trace = [];
let lastScene = null;
for (let i = 0; i < 12; i += 1) {
  const deadline = Date.now() + 30000;
  let state;
  do {
    state = await (await fetch(`${base}/api/state`)).json();
    if (state.phase === "PLAYING_VOTING" && state.sceneNumber !== lastScene) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  if (!state || state.phase !== "PLAYING_VOTING") throw new Error(`round_${i + 1}_not_ready`);
  const fromScene = state.sceneNumber;
  const options = [state.options?.option_1_tr || "", state.options?.option_2_tr || ""];
  const vote = String((i % 2) + 1);
  const started = performance.now();
  const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `grounding-local-${Date.now()}-${i}`, vote }) });
  if (!response.ok) throw new Error(`round_${i + 1}_vote_${response.status}`);
  let next;
  do { await new Promise((resolve) => setTimeout(resolve, 250)); next = await (await fetch(`${base}/api/state`)).json(); } while (next.sceneNumber === fromScene && Date.now() < deadline);
  trace.push({ round: i + 1, fromScene, toScene: next.sceneNumber, vote, options, nextOptions: [next.options?.option_1_tr || "", next.options?.option_2_tr || ""], elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)), media: next.media || null, phase: next.phase });
  lastScene = next.sceneNumber;
}
console.log(JSON.stringify({ completed: trace.length, trace }, null, 2));

const base = "http://127.0.0.1:3000";
const samples = [];
let previousScene = null;
for (let i = 0; i < 10; i += 1) {
  let state;
  const deadline = Date.now() + 15000;
  do { state = await (await fetch(`${base}/api/state`)).json(); if (state.phase === "PLAYING_VOTING" && state.sceneNumber !== previousScene) break; await new Promise((r) => setTimeout(r, 250)); } while (Date.now() < deadline);
  if (!state || state.phase !== "PLAYING_VOTING") throw new Error(`round_${i + 1}_not_ready`);
  previousScene = state.sceneNumber;
  const t0 = performance.now();
  const vote = String((i % 2) + 1);
  const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `targeted-local-${Date.now()}-${i}`, vote }) });
  if (!response.ok) throw new Error(`vote_${i + 1}_rejected`);
  let next = state;
  do { await new Promise((r) => setTimeout(r, 250)); next = await (await fetch(`${base}/api/state`)).json(); } while (next.sceneNumber === previousScene && Date.now() < deadline + 30000);
  const image = next.media ? await fetch(`${base}${next.media}`).then((r) => ({ status: r.status, ok: r.ok })) : { status: 0, ok: false };
  samples.push({ round: i + 1, fromScene: previousScene, toScene: next.sceneNumber, vote, seconds: Number(((performance.now() - t0) / 1000).toFixed(3)), imageStatus: image.status, imageOk: image.ok, options: [next.options?.option_1_tr, next.options?.option_2_tr] });
}
console.log(JSON.stringify({ completed: samples.length, samples }, null, 2));

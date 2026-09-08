import fs from 'node:fs/promises';
const base = 'http://127.0.0.1:3000';
const initial = await (await fetch(`${base}/api/state`)).json();
const startScene = Number(initial.sceneNumber);
const targetScene = startScene + 300;
const rows = [];
let lastRound = '';
let lastProgress = 0;
const deadline = Date.now() + 2_700_000;
while (Date.now() < deadline) {
  const state = await (await fetch(`${base}/api/state`)).json();
  if (Number(state.sceneNumber) >= targetScene) {
    await fs.writeFile('benchmark/long-horizon-300-result.json', JSON.stringify({ startScene, targetScene, endScene: state.sceneNumber, rows }, null, 2));
    console.log(JSON.stringify({ status: 'complete', startScene, targetScene, endScene: state.sceneNumber, rounds: rows.length }));
    process.exit(0);
  }
  if (state.phase === 'PLAYING_VOTING' && state.optionsReady && state.roundId && state.roundId !== lastRound) {
    const labels = [state.options?.option_1_tr, state.options?.option_2_tr].filter(Boolean);
    const records = state.storyState?.recent_option_records || [];
    const shown = records.filter((r) => labels.includes(r.label_tr)).slice(-2);
    const response = await fetch(`${base}/api/debug/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: `long-horizon-300-${state.sceneNumber}-${state.roundId}`, vote: String((rows.length % 2) + 1) }), signal: AbortSignal.timeout(15000) });
    rows.push({ scene: Number(state.sceneNumber), location: state.storyState?.current_location, options: labels, source: shown.map((r) => r.source).filter(Boolean).at(-1) || 'unknown', status: response.status, optionsReady: Boolean(state.optionsReady) });
    lastRound = state.roundId;
    await fs.writeFile('benchmark/long-horizon-300-progress.json', JSON.stringify({ startScene, targetScene, rows }, null, 2));
    if (rows.length >= lastProgress + 25) { lastProgress = rows.length; console.log(`progress ${rows.length}/300 scene=${state.sceneNumber}`); }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
const final = await (await fetch(`${base}/api/state`)).json();
await fs.writeFile('benchmark/long-horizon-300-result.json', JSON.stringify({ startScene, targetScene, endScene: final.sceneNumber, timeout: true, rows }, null, 2));
console.log(JSON.stringify({ status: 'timeout', startScene, targetScene, endScene: final.sceneNumber, rounds: rows.length }));
process.exit(1);

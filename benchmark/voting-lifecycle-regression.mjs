const base = 'http://127.0.0.1:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async () => (await (await fetch(`${base}/api/state`)).json());
const rows = [];
for (let i = 0; i < 30; i += 1) {
  let before;
  do { before = await get(); if (before.phase !== 'PLAYING_VOTING' || before.secondsLeft < 2) await sleep(250); } while (before.phase !== 'PLAYING_VOTING' || before.secondsLeft < 2);
  const t0 = Date.now();
  const response = await fetch(`${base}/api/debug/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: `forensic-${Date.now()}-${i}`, vote: String((i % 2) + 1) }) });
  if (!response.ok) throw new Error(`vote_failed_${i}`);
  let after;
  do { await sleep(350); after = await get(); } while (after.sceneNumber <= before.sceneNumber || after.phase !== 'PLAYING_VOTING');
  rows.push({ turn: i + 1, from: before.sceneNumber, to: after.sceneNumber, roundId: before.roundId, openedAt: before.openedAt, closesAt: before.closesAt, observedWindowMs: before.closesAt - before.openedAt, elapsedMs: Date.now() - t0 });
  console.log(`${i + 1}/30 ${before.sceneNumber}->${after.sceneNumber} window=${rows.at(-1).observedWindowMs}ms`);
}
console.log(JSON.stringify({ turns: rows.length, rows }, null, 2));

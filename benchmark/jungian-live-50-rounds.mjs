const base = "http://127.0.0.1:3000";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getState = async () => (await fetch(`${base}/api/state`)).json();
const rounds = Math.max(1, Number(process.env.JUNG_ROUNDS || 50));
const rows = [];
let ok = 0;
let fail = 0;
const displayedIntents = [];
const recentPairs = new Set();
const pairQueue = [];
let intentDominations = 0;
let recentPairRepeats = 0;
for (let i = 1; i <= rounds; i += 1) {
  let state = await getState();
  // /api/state intentionally exposes the public scene state, not health.readiness.
  // Wait only for a votable phase; /health is checked separately before the run.
  for (let wait = 0; wait < 90 && state.phase !== "PLAYING_VOTING"; wait += 1) { await sleep(500); state = await getState(); }
  const before = state.sceneNumber;
  const response = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `jung-soak-${i}`, vote: String((i % 2) + 1) }) });
  if (!response.ok) { fail += 1; rows.push({ turn: i, before, error: "vote_rejected" }); continue; }
  let done = null;
  for (let wait = 0; wait < 100; wait += 1) { await sleep(500); const next = await getState(); if (next.sceneNumber > before && next.phase === "PLAYING_VOTING") { done = next; break; } }
  if (done) {
    ok += 1;
    const optionIntents = [done.options?.option_1_intent, done.options?.option_2_intent].filter(Boolean);
    if (optionIntents.some((intent) => displayedIntents.slice(-4).filter((item) => item === intent).length >= 2)) intentDominations += 1;
    displayedIntents.push(...optionIntents); if (displayedIntents.length > 8) displayedIntents.splice(0, displayedIntents.length - 8);
    const pair = (done.options?.option_1_tr || "") + "|" + (done.options?.option_2_tr || "");
    if (recentPairs.has(pair)) recentPairRepeats += 1;
    recentPairs.add(pair); pairQueue.push(pair); if (pairQueue.length > 12) recentPairs.delete(pairQueue.shift());
    rows.push({ turn: i, before, after: done.sceneNumber, options: [done.options?.option_1_tr, done.options?.option_2_tr], intents: optionIntents, tendency: done.collectiveTendency });
  }
  else { fail += 1; rows.push({ turn: i, before, error: "scene_timeout" }); break; }
}
const diagnostics = await (await fetch(`${base}/api/diagnostics`)).json();
console.log(JSON.stringify({ turnsRequested: rounds, ok, fail, intentDominations, recentPairRepeats, first: rows[0], last: rows.at(-1), rows, diagnostics: { queue: diagnostics.queue, media: diagnostics.media, storyStateBytes: diagnostics.storyStateBytes, stateBytes: diagnostics.stateBytes, metrics: diagnostics.metrics } }, null, 2));

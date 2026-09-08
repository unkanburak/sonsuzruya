import { readFile, writeFile } from "node:fs/promises";
import { fallbackOptions, optionMeta, situationFamilyForOption } from "../app/lib/options.mjs";

const base = "http://127.0.0.1:3000";
const startedAt = Date.now();
const rows = [];
const labels = [];
const families = [];
const intent = (value) => {
  const s = String(value || "").toLowerCase();
  if (/bekle|sessiz|dinle|izle/.test(s)) return "observe";
  if (/aç|gir|çık|geç|ilerle|yaklaş|takip|in|bin/.test(s)) return "travel";
  if (/çevir|incele|bak|dokun|radyo|saat|fotoğraf|makine/.test(s)) return "inspect";
  if (/ver|al|bırak|paylaş|değiş/.test(s)) return "exchange";
  if (/sis|yağmur|su|ışık|parla|gök/.test(s)) return "transform";
  return "other";
};
const words = (value) => String(value || "").toLowerCase().replaceAll("_", " ").split(/[^a-zçğıöşü]+/).filter((w) => w.length > 3);
const knownVisual = /room|house|corridor|door|window|stairs|bridge|tunnel|car|train|forest|path|portal|mirror|light|water|fog|rain|machine|lantern|orb|classroom|photograph|radio|watch|table|telephone|tea|tree|sky|landscape|silver|wooden|glowing|shadow|street|road|basement|shore|desert|mountain/;
const grounding = (label, result, state) => {
  const text = `${label} ${result}`.toLowerCase();
  const story = state.storyState || {};
  const objectWords = words([...(story.important_objects || [])].join(" "));
  const spaceWords = words(story.current_location || "");
  const anchorWords = words((story.scene_anchors || []).map((a) => typeof a === "string" ? a : a?.text).join(" "));
  const hookWords = words((story.open_hooks || []).join(" "));
  const has = (arr) => arr.some((w) => text.includes(w));
  const by = [];
  if (has(objectWords)) by.push("visible_object");
  if (has(spaceWords)) by.push("visible_space");
  if (/character|figure|protagonist|the person|karakter|figür/.test(text)) by.push("active_character");
  if (has(anchorWords)) by.push("anchor");
  if (has(hookWords)) by.push("stale_hook");
  if (!by.length) by.push("symbolic_prior");
  const score = by.includes("visible_object") || by.includes("visible_space") || by.includes("anchor") ? 2 : by.includes("stale_hook") ? 1 : 0;
  return { score, groundedBy: by, visuallyGrounded: score === 2 ? "yes" : score === 1 ? "partial" : "no", contradictionRisk: score === 0 && knownVisual.test(result) ? "high" : "low" };
};
const readEvents = async () => (await readFile("state/events.jsonl", "utf8")).split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let previousScene = null;
for (let round = 1; round <= 60; round += 1) {
  let state;
  const readyDeadline = Date.now() + 30000;
  do { state = await (await fetch(`${base}/api/state`)).json(); if (state.phase === "PLAYING_VOTING" && state.readiness === "ready" && state.sceneNumber !== previousScene) break; await wait(250); } while (Date.now() < readyDeadline);
  if (!state || state.phase !== "PLAYING_VOTING") throw new Error(`round_${round}_not_ready`);
  previousScene = state.sceneNumber;
  const shown = state.options || {};
  const shownPair = [shown.option_1_tr, shown.option_2_tr].filter(Boolean);
  const pre = { scene: state.sceneNumber, lastPrompt: state.lastPrompt, storyState: state.storyState, options: shownPair, activeAnchors: state.storyState?.scene_anchors || [], activeHooks: state.storyState?.open_hooks || [] };
  const candidate = fallbackOptions(state.storyState?.recent_options || [], () => (round * 37 % 101) / 101, state.storyState);
  const duplicatePair = rows.some((row) => row.finalOptions[0] === shownPair[0] && row.finalOptions[1] === shownPair[1]);
  const recent12 = labels.slice(-24);
  const optionRows = [1, 2].map((i) => {
    const label = shown[`option_${i}_tr`];
    const result = shown[`option_${i}_result_prompt_en`] || shown[`option_${i}_en`];
    const g = grounding(label, result, state);
    return { label, family: situationFamilyForOption(label), intent: intent(label), source: "observed_final", ...g, whySelected: "final option after Qwen/fallback validation" };
  });
  const t0 = Date.now();
  const vote = String((round % 2) + 1);
  const voteResponse = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `forensic-${startedAt}-${round}`, vote }) });
  if (!voteResponse.ok) throw new Error(`round_${round}_vote_rejected_${voteResponse.status}`);
  let next = state;
  do { await wait(250); next = await (await fetch(`${base}/api/state`)).json(); } while (next.sceneNumber === previousScene && Date.now() < t0 + 30000);
  const events = await readEvents();
  const optionEvent = events.filter((event) => event.type === "OPTIONS_CREATED" && new Date(event.at).getTime() >= t0 - 1000).at(-1);
  const source = optionEvent?.source || "unknown";
  for (const row of optionRows) { labels.push(row.label); families.push(row.family); }
  rows.push({ round, roundId: state.roundId, scene: state.sceneNumber, visibleSceneSummary: state.lastPrompt, committedResultState: state.storyState?.recent_events?.at(-1), activeAnchors: pre.activeAnchors, activeHooks: pre.activeHooks, qwenCalled: source === "qwen", qwenStatus: source === "qwen" ? "success" : source === "fallback" ? "fallback" : "unknown", fallbackUsed: source === "fallback", rawCandidatePool: [candidate.option_1_tr, candidate.option_2_tr], finalOptions: shownPair, options: optionRows, pairTooClose: optionRows[0]?.family === optionRows[1]?.family || optionRows[0]?.intent === optionRows[1]?.intent, repetitiveLast12: shownPair.some((label) => recent12.includes(label)), exactPairRepeat: duplicatePair, transitionSeconds: Number(((Date.now() - t0) / 1000).toFixed(3)), nextScene: next.sceneNumber });
}
const count = (values) => Object.fromEntries([...new Set(values)].map((value) => [value, values.filter((item) => item === value).length]));
const result = { startedAt: new Date(startedAt).toISOString(), finishedAt: new Date().toISOString(), rounds: rows, summary: { rounds: rows.length, shownOptions: labels.length, uniqueLabels: new Set(labels).size, qwenRounds: rows.filter((r) => r.qwenCalled).length, fallbackRounds: rows.filter((r) => r.fallbackUsed).length, unknownSourceRounds: rows.filter((r) => r.qwenStatus === "unknown").length, pairTooClose: rows.filter((r) => r.pairTooClose).length, repetitiveLast12: rows.filter((r) => r.repetitiveLast12).length, exactPairRepeats: rows.filter((r) => r.exactPairRepeat).length, grounding2: rows.flatMap((r) => r.options).filter((o) => o.score === 2).length, grounding1: rows.flatMap((r) => r.options).filter((o) => o.score === 1).length, grounding0: rows.flatMap((r) => r.options).filter((o) => o.score === 0).length, familyCounts: count(families), familyRuns: (() => { let max = 0; let run = 0; let last = null; for (const f of families) { run = f === last ? run + 1 : 1; last = f; max = Math.max(max, run); } return max; })(), transitionP50: rows.map((r) => r.transitionSeconds).sort((a, b) => a - b)[Math.floor(rows.length * .5)], transitionP95: rows.map((r) => r.transitionSeconds).sort((a, b) => a - b)[Math.floor(rows.length * .95)] } };
await writeFile("benchmark/option-forensic-60.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));

import { applyStatePatch, defaultStoryState, fallbackOptions, optionMeta } from "../app/lib/options.mjs";
import { defaultDreamPsyche, inferIntent, jungAwareFallbackOptions, rememberOptionPair, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";
import { writeFile } from "node:fs/promises";

// Reproducible narrative trace for human review; production RNG is untouched.
let seed = 0x51f15e;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const originalRandom = Math.random;
Math.random = random;
let story = defaultStoryState();
let psyche = defaultDreamPsyche();
let previous = [];
const rows = [];
const humanize = (value) => String(value || "").replaceAll("_", " ").replace(/\s+/g, " ").trim();
const why = (role, storyState, option) => {
  const place = humanize(storyState.current_location);
  const anchor = humanize(option.sceneAnchors?.at(-1) || storyState.open_hooks.at(-1) || "current atmosphere");
  return role === "continuation"
    ? `Current ${place} context continues through ${anchor}.`
    : `Counterpoint bends the ${place} tension toward ${anchor} without leaving the renderable scene.`;
};
for (let turn = 1; turn <= 50; turn += 1) {
  const options = jungAwareFallbackOptions({ storyState: story, psyche, fallbackFactory: fallbackOptions, previousOptions: previous });
  const winner = turn % 3 === 0 ? "2" : "1";
  const winnerMeta = optionMeta(options, winner);
  const winnerLabel = options[`option_${winner}_tr`];
  const beforeSymbols = new Map(psyche.recurring_symbols.map((item) => [item.symbol.toLowerCase(), item]));
  const nextPsyche = rememberOptionPair(updateDreamPsyche(psyche, { label_tr: winnerLabel, intent: winnerMeta.intent, psyche_delta: winnerMeta.psycheDelta, scene_anchors: winnerMeta.sceneAnchors, symbol_delta: winnerMeta.symbolDelta, context: story.current_location }, turn), options);
  // Select the symbol touched by this turn, not merely the last bounded entry;
  // decay can leave an older symbol at the end of the array and make a return
  // look like a first appearance (or vice versa).
  const symbol = nextPsyche.recurring_symbols.find((item) => item.last_seen === turn);
  const prior = symbol && beforeSymbols.get(symbol.symbol.toLowerCase());
  const symbolNote = symbol ? (prior ? `RETURN: ${symbol.symbol} (appearances ${symbol.appearances})` : `NEW: ${symbol.symbol}`) : "none";
  rows.push({
    turn,
    scene: story.current_location,
    option1: options.option_1_tr,
    option2: options.option_2_tr,
    winner: winnerLabel,
    role: options[`option_${winner}_archetypal_role`],
    winnerIntent: winnerMeta.intent,
    phase: nextPsyche.dream_cycle.phase,
    collectiveTendency: { ...nextPsyche.collective_tendency },
    archetypalField: nextPsyche.dominant_archetypal_field,
    compensationPressure: nextPsyche.compensation_pressure,
    symbol: symbolNote,
    whyOption1: why("continuation", story, optionMeta(options, "1")),
    whyOption2: why("counterpoint", story, optionMeta(options, "2")),
  });
  story = applyStatePatch(story, winnerMeta.statePatch);
  story.recent_options = [...new Set([...story.recent_options, options.option_1_tr, options.option_2_tr])].slice(-8);
  previous = story.recent_options.slice(-8);
psyche = nextPsyche;
}
Math.random = originalRandom;
const optionPairs = rows.map((row) => `${row.option1}|${row.option2}`.toLowerCase());
const exactPairRepeats = optionPairs.length - new Set(optionPairs).size;
const sameIntentPairs = rows.filter((row) => inferIntent(row.option1) === inferIntent(row.option2)).length;
const locations = rows.map((row) => row.scene);
const uniqueLocations = new Set(locations).size;
let maxSameLocationRun = 0;
let sameLocationRun = 0;
let previousLocation = null;
for (const location of locations) {
  sameLocationRun = location === previousLocation ? sameLocationRun + 1 : 1;
  maxSameLocationRun = Math.max(maxSameLocationRun, sameLocationRun);
  previousLocation = location;
}
const symbolReturns = rows.filter((row) => row.symbol.startsWith("RETURN:")).length;
const symbolsWithMultipleContexts = psyche.recurring_symbols.filter((item) => new Set((item.contexts || []).filter(Boolean)).size >= 2).length;
const archetypalFieldChanges = rows.slice(1).filter((row, index) => row.archetypalField !== rows[index].archetypalField).length;
const narrativeAudit = {
  turns: rows.length,
  uniqueLabels: new Set(rows.flatMap((row) => [row.option1, row.option2])).size,
  uniqueLocations,
  maxSameLocationRun,
  exactPairRepeats,
  sameIntentPairs,
  symbolReturns,
  symbolsWithMultipleContexts,
  archetypalFieldChanges,
  continuationSelections: rows.filter((row) => row.role === "continuation").length,
  counterpointSelections: rows.filter((row) => row.role === "counterpoint").length,
  curiosityDrift: Number((rows.at(-1).collectiveTendency.curiosity - rows[0].collectiveTendency.curiosity).toFixed(3)),
  confrontationDrift: Number((rows.at(-1).collectiveTendency.confrontation - rows[0].collectiveTendency.confrontation).toFixed(3)),
  avoidanceDrift: Number((rows.at(-1).collectiveTendency.avoidance - rows[0].collectiveTendency.avoidance).toFixed(3)),
};
const md = [
  "# 50-Dream Human Review Trace",
  "",
  "> Deterministic review aid generated from the same fallback/Jung layer. This is not a subjective PASS; human review remains required.",
  "",
  ...rows.map((row) => [
    `## RÜYA #${row.turn}`,
    `- SAHNE: ${row.scene}`,
    `- OPTION 1 (CONTINUATION): ${row.option1}`,
    `- OPTION 2 (COUNTERPOINT): ${row.option2}`,
    `- WINNER: ${row.winner} (${row.role}; intent=${row.winnerIntent})`,
    `- DREAM PHASE: ${row.phase}`,
    `- COLLECTIVE TENDENCY: curiosity=${row.collectiveTendency.curiosity.toFixed(2)}, confrontation=${row.collectiveTendency.confrontation.toFixed(2)}, avoidance=${row.collectiveTendency.avoidance.toFixed(2)}`,
    `- ACTIVE ARCHETYPAL FIELD: ${row.archetypalField}`,
    `- COMPENSATION PRESSURE: ${row.compensationPressure.toFixed(2)}`,
    `- SYMBOL: ${row.symbol}`,
    `- WHY OPTION 1: ${row.whyOption1}`,
    `- WHY OPTION 2: ${row.whyOption2}`,
    "",
  ].join("\n")),
  "## SYMBOL MEMORY LEDGER",
  "",
  "> This ledger records what the bounded engine remembers. It does not assign a fixed dictionary meaning to any symbol; the unresolved meaning is left to the dream history and human review.",
  "",
  "| MOTIF | FIRST APPEARANCE | LAST RETURN | APPEARANCES | CONTEXTS | LAST INTENT | UNRESOLVED |",
  "|---|---:|---:|---:|---|---|---|",
  ...psyche.recurring_symbols.map((item) => `| ${item.symbol} | ${item.first_seen} | ${item.last_seen} | ${item.appearances} | ${(item.contexts || []).join(" → ") || "—"} | ${item.last_intent || "—"} | ${item.unresolved ? "yes" : "no"} |`),
  "",
  "## ARC / COLLECTIVE SUMMARY",
  "",
  `- Phase progression observed: ${[...new Set(rows.map((row) => row.phase))].join(" → ")}`,
  `- Continuation selections: ${rows.filter((row) => row.role === "continuation").length}; counterpoint selections: ${rows.filter((row) => row.role === "counterpoint").length}`,
  `- Curiosity tendency: ${rows[0].collectiveTendency.curiosity.toFixed(2)} → ${rows.at(-1).collectiveTendency.curiosity.toFixed(2)}`,
  `- Compensation pressure: ${rows[0].compensationPressure.toFixed(2)} → ${rows.at(-1).compensationPressure.toFixed(2)}`,
  `- Archetypal fields encountered: ${[...new Set(rows.map((row) => row.archetypalField))].join(" → ")}`,
  "",
  "## MACHINE NARRATIVE AUDIT",
  "",
  "> These are structural signals for review, not a claim that an algorithm can certify the subjective feeling of one dream mind.",
  "",
  `- Unique displayed labels: ${narrativeAudit.uniqueLabels}/${rows.length * 2}`,
  `- Unique active locations: ${narrativeAudit.uniqueLocations}; maximum same-location run: ${narrativeAudit.maxSameLocationRun} turns`,
  `- Exact option-pair repeats: ${narrativeAudit.exactPairRepeats}; same-intent option pairs: ${narrativeAudit.sameIntentPairs}`,
  `- Symbol returns: ${narrativeAudit.symbolReturns}; recurring symbols with 2+ contexts: ${narrativeAudit.symbolsWithMultipleContexts}`,
  `- Archetypal field changes: ${narrativeAudit.archetypalFieldChanges}`,
  `- Collective tendency drift: curiosity ${narrativeAudit.curiosityDrift >= 0 ? "+" : ""}${narrativeAudit.curiosityDrift.toFixed(3)}, confrontation ${narrativeAudit.confrontationDrift >= 0 ? "+" : ""}${narrativeAudit.confrontationDrift.toFixed(3)}, avoidance ${narrativeAudit.avoidanceDrift >= 0 ? "+" : ""}${narrativeAudit.avoidanceDrift.toFixed(3)}`,
  "",
].join("\n");
await writeFile(new URL("./JUNGIAN_50_DREAM_TRACE.md", import.meta.url), md, "utf8");
console.log(JSON.stringify({ ...narrativeAudit, symbols: psyche.recurring_symbols, output: "benchmark/JUNGIAN_50_DREAM_TRACE.md" }, null, 2));
